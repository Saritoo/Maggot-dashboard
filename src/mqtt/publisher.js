// src/mqtt/publisher.js

const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');

// Import model Sensor dan pakan (jika diperlukan untuk mendapatkan data sensor)
const Sensor = require('../models/sensorModel');
const Pakan = require('../models/pakanModel');

// Tentukan path ke file JSON feed settings (pastikan letak file ini sesuai dengan struktur proyek)
const feedJsonPath = path.join(__dirname, '../data/feedSettings.json');

// Hubungkan ke broker MQTT
const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);

const PWM_TOPIC = 'pwm/master';
// Topik untuk perintah pemberian pakan: "pakan/timer/master"
const FEED_TIMER_TOPIC = 'pakan/timer/master';

client.on('connect', () => {
  console.log('Publisher connected to MQTT broker');
});

/**
 * publishPWM
 * Publish nilai PWM ke perangkat.
 */
const publishPWM = (pwmData) => {
  console.log(`Publishing PWM to ${PWM_TOPIC}:`, JSON.stringify(pwmData));
  client.publish(PWM_TOPIC, JSON.stringify(pwmData), (err) => {
    if (err) {
      console.error('❌ Failed to publish PWM:', err);
    } else {
      console.log('✅ Successfully published PWM');
    }
  });
};

/**
 * publishFeedSchedule
 * Mengirim perintah pemberian pakan ke topik FEED_TIMER_TOPIC.
 * Payload yang dikirim: { pakanTimer: 1, amount: <nilai amount dari feed settings> }
 */
const publishFeedSchedule = (feedScheduleData) => {
  console.log(`📡 Publishing Feed Schedule:`, JSON.stringify(feedScheduleData));
  client.publish(FEED_TIMER_TOPIC, JSON.stringify(feedScheduleData), (err) => {
    if (err) {
      console.error('❌ Failed to publish Feed Schedule:', err);
    } else {
      console.log('✅ Successfully published Feed Schedule');
    }
  });
};

/**
 * checkFeedSchedule
 * Mengecek apakah saat ini sudah waktunya pemberian pakan, dan jika ya:
 *   1. Ambil data sensor terbaru sebagai data "before feed"
 *   2. Publish perintah pemberian pakan ke topik "pakan/timer/master" dengan payload:
 *      { pakanTimer: 1, amount: <nilai feed settings> }
 *   3. Buat record pakan dengan data "before feed" ke database.
 *   4. Setelah delay (misalnya 60 detik), ambil data sensor lagi sebagai data "after feed" dan update record pakan.
 */
const checkFeedSchedule = () => {
  fs.readFile(feedJsonPath, 'utf8', (err, data) => {
    if (err) return console.error('❌ Error membaca file feed settings:', err);

    try {
      const settings = JSON.parse(data);
      const currentTime = new Date();
      const currentHourMinute = currentTime.toTimeString().slice(0, 5); // Format "HH:MM"

      // Ambil waktu terakhir pengiriman, jika ada
      const lastSentTime = settings.lastSentTime ? new Date(settings.lastSentTime) : null;
      const lastSentDate = lastSentTime ? lastSentTime.toDateString() : null;
      const currentDate = currentTime.toDateString();

      // Jika waktu saat ini terdapat di jadwal dan belum ada pengiriman hari ini
      if (settings.times.includes(currentHourMinute) && lastSentDate !== currentDate) {
        console.log(`⏰ Saatnya memberi pakan pada ${currentHourMinute}`);

        // Buat payload untuk perintah pemberian pakan
        const feedData = {
          pakanTimer: 1,
          amount: settings.amount
        };

        // Gunakan publishFeedSchedule untuk mengirim perintah ke MQTT
        publishFeedSchedule(feedData);

        // Ambil data sensor terbaru sebagai data "before feed"
        Sensor.findOne({ order: [['createdAt', 'DESC']] })
          .then((beforeSensorData) => {
            // Buat record pakan di database dengan data "before feed"
            Pakan.create({
              amount: settings.amount,
              feedTime: currentTime,
              beforeMaggotWeight: beforeSensorData ? beforeSensorData.maggotWeight : null,
              beforeFeedStock: beforeSensorData ? beforeSensorData.feedStock : null
            })
              .then((pakanRecord) => {
                console.log('✅ Feed log created with before feed data');

                // Update waktu terakhir pengiriman di file feed settings
                settings.lastSentTime = currentTime.toISOString();
                fs.writeFile(feedJsonPath, JSON.stringify(settings, null, 2), (writeErr) => {
                  if (writeErr)
                    console.error('❌ Gagal menyimpan waktu terakhir pengiriman:', writeErr);
                });

                // Setelah delay 60 detik, ambil data sensor lagi sebagai data "after feed"
                setTimeout(() => {
                  Sensor.findOne({ order: [['createdAt', 'DESC']] })
                    .then((afterSensorData) => {
                      pakanRecord.update({
                        afterMaggotWeight: afterSensorData ? afterSensorData.maggotWeight : null,
                        afterFeedStock: afterSensorData ? afterSensorData.feedStock : null
                      })
                        .then(() => {
                          console.log('✅ Feed log updated with after feed data');
                        })
                        .catch((updateErr) => {
                          console.error('❌ Error updating feed log:', updateErr);
                        });
                    })
                    .catch((afterErr) => {
                      console.error('❌ Error fetching sensor data after feed:', afterErr);
                    });
                }, 60000); // Delay 60 detik
              })
              .catch((pakanErr) => {
                console.error('❌ Error creating feed log:', pakanErr);
              });
          })
          .catch((beforeErr) => {
            console.error('❌ Error fetching sensor data before feed:', beforeErr);
          });
      }
    } catch (parseErr) {
      console.error('❌ Error parsing JSON:', parseErr);
    }
  });
};

// Jalankan pengecekan jadwal pakan setiap menit
setInterval(checkFeedSchedule, 60 * 1000);

module.exports = { publishPWM, publishFeedSchedule };
