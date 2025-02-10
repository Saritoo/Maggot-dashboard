// publisher.js

const fs = require('fs');
const path = require('path');
const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');

// Import model Sensor dan pakan
const Sensor = require('../models/sensorModel');
const pakan = require('../models/pakanModel');

// Tentukan path ke file JSON feed settings
const feedJsonPath = path.join(__dirname, '../data/feedSettings.json');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);

const PWM_TOPIC = 'pwm/master';
const FEED_TOPIC = 'feed/schedule';
const FEED_STATUS_TOPIC = 'feed/status';

client.on('connect', () => {
  console.log('Publisher connected to MQTT broker');
});

const publishPWM = (pwmData) => {
  console.log(`Publishing PWM to ${PWM_TOPIC}:`, JSON.stringify(pwmData));
  client.publish(PWM_TOPIC, JSON.stringify(pwmData), (err) => {
    if (err) {
      console.error('Failed to publish PWM:', err);
    } else {
      console.log('Successfully published PWM');
    }
  });
};

/**
 * Publish jadwal dan jumlah pakan ke MQTT
 * @param {Object} feedScheduleData - Data pakan yang dikirimkan
 */
const publishFeedSchedule = (feedScheduleData) => {
  console.log(`📡 Publishing Feed Schedule to ${FEED_TOPIC}:`, JSON.stringify(feedScheduleData));
  client.publish(FEED_TOPIC, JSON.stringify(feedScheduleData), (err) => {
    if (err) {
      console.error('❌ Failed to publish Feed Schedule:', err);
    } else {
      console.log('✅ Successfully published Feed Schedule');
    }
  });
};

/**
 * Cek apakah saat ini adalah waktu pakan, jika iya:
 *  1. Ambil data sensor terbaru sebagai data "before feed"
 *  2. Publish perintah pemberian pakan ke MQTT (FEED_STATUS_TOPIC)
 *  3. Buat record pakan dengan data "before feed"
 *  4. Setelah delay, ambil data sensor lagi sebagai data "after feed" dan update pakan
 */
const checkFeedSchedule = () => {
  fs.readFile(feedJsonPath, 'utf8', (err, data) => {
    if (err) return console.error('❌ Error membaca file feed settings:', err);

    try {
      const settings = JSON.parse(data);
      const currentTime = new Date();
      const currentHourMinute = currentTime.toTimeString().slice(0, 5); // "HH:MM"

      // Ambil waktu terakhir pengiriman
      const lastSentTime = settings.lastSentTime ? new Date(settings.lastSentTime) : null;
      const lastSentDate = lastSentTime ? lastSentTime.toDateString() : null;
      const currentDate = currentTime.toDateString();

      // Jika waktu sekarang sesuai jadwal dan belum dikirim hari ini
      if (settings.times.includes(currentHourMinute) && lastSentDate !== currentDate) {
        console.log(`⏰ Saatnya memberi pakan pada ${currentHourMinute}`);

        // Data yang akan dikirimkan melalui MQTT
        const feedData = {
          amount: settings.amount,
          relay: "ON",
          timestamp: currentTime.toISOString()
        };

        // Ambil data sensor terbaru sebagai data "before feed"
        Sensor.findOne({ order: [['createdAt', 'DESC']] })
          .then((beforeSensorData) => {
            // Publish perintah pemberian pakan ke FEED_STATUS_TOPIC
            client.publish(FEED_STATUS_TOPIC, JSON.stringify(feedData), (err) => {
              if (err) {
                console.error('❌ Failed to publish Feed Status:', err);
                return;
              }
              console.log('✅ Successfully published Feed Status');

              // Buat record pakan dengan data "before feed"
              pakan.create({
                amount: settings.amount,
                feedTime: currentTime,
                beforeMaggotWeight: beforeSensorData ? beforeSensorData.maggotWeight : null,
                beforeFeedStock: beforeSensorData ? beforeSensorData.feedStock : null
              })
                .then((pakanRecord) => {
                  console.log('✅ Feed log created with before feed data');

                  // Perbarui waktu terakhir pengiriman pada file JSON
                  settings.lastSentTime = currentTime.toISOString();
                  fs.writeFile(feedJsonPath, JSON.stringify(settings, null, 2), (writeErr) => {
                    if (writeErr)
                      console.error('❌ Gagal menyimpan waktu terakhir pengiriman:', writeErr);
                  });

                  // Setelah delay (misalnya 60 detik), ambil data sensor lagi sebagai data "after feed"
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
                  }, 60000); // Delay 60 detik (sesuaikan jika diperlukan)
                })
                .catch((pakanErr) => {
                  console.error('❌ Error creating feed log:', pakanErr);
                });
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
