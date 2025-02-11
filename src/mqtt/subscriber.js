// src/mqtt/subscriber.js

const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt'); // Pastikan path sesuai dengan struktur folder Anda
const Sensor = require('../models/sensorModel');
const Ats = require('../models/atsModel');
const Pakan = require('../models/pakanModel');
const { processSensorData } = require('../controllers/pidController');
const fs = require('fs');
const path = require('path');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);

// Definisikan topik yang akan disubscribe
const TEMPERATURE_TOPIC = 'suhu/slave';
const ATS_TOPIC = 'ats/slave';
const PAKAN_SENSOR_TOPIC = 'pakan/sensor/slave';
const PAKAN_STATE_TOPIC = 'pakan/state/slave';

// File feed settings untuk mendapatkan nilai amount (misalnya di folder data)
const FEED_SETTINGS_FILE = path.join(__dirname, '../data/feedSettings.json');

client.on('connect', () => {
  console.log('✅ Subscriber connected to MQTT broker');

  // Subscribe ke topik-topik yang diinginkan
  [TEMPERATURE_TOPIC, ATS_TOPIC, PAKAN_SENSOR_TOPIC, PAKAN_STATE_TOPIC].forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error(`❌ Subscribe error on ${topic}:`, err);
      } else {
        console.log(`📡 Subscribed to: ${topic}`);
      }
    });
  });
});

client.on('message', async (topic, message) => {
  console.log(`📥 Received message on topic ${topic}: ${message.toString()}`);

  try {
    const data = JSON.parse(message.toString());

    if (topic === TEMPERATURE_TOPIC) {
      // Proses data sensor suhu & kelembaban
      if (data && data.temperature != null && data.humidity != null) {
        await Sensor.create({
          temperature: data.temperature,
          humidity: data.humidity,
        });
        processSensorData(data.temperature, data.humidity);
      } else {
        console.error('❌ Payload sensor tidak lengkap:', data);
      }

    } else if (topic === ATS_TOPIC) {
      console.log("📡 Received ATS data:", data);
      // Proses data ATS
      if (data && data.solarVoltage != null && data.batteryVoltage != null && data.psuVoltage != null) {
        await Ats.create({
          solarVoltage: data.solarVoltage,
          batteryVoltage: data.batteryVoltage,
          psuVoltage: data.psuVoltage,
        });
      } else {
        console.error('❌ Payload ATS tidak lengkap:', data);
      }

    } else if (topic === PAKAN_SENSOR_TOPIC) {
      // Proses data sensor pakan, masukkan ke database saja
      if (data && data.berat_Pakan != null && data.berat_Maggot != null) {
        // Baca file feedSettings untuk mendapatkan nilai 'amount'
        let feedSettings;
        try {
          const feedContent = await fs.promises.readFile(FEED_SETTINGS_FILE, 'utf8');
          feedSettings = JSON.parse(feedContent);
        } catch (err) {
          console.error('❌ Error reading feedSettings.json:', err);
          feedSettings = { amount: 0 }; // default jika terjadi error
        }
        const amountValue = feedSettings.amount;
        await Pakan.create({
          amount: amountValue,
          beforeFeedStock: data.berat_Pakan,
          beforeMaggotWeight: data.berat_Maggot,
          feedTime: new Date()
        });
      } else {
        console.error('❌ Payload Pakan Sensor tidak lengkap:', data);
      }

    } else if (topic === PAKAN_STATE_TOPIC) {
      // Proses data status pakan, simpan ke file JSON saja
      if (data && data.pakan_State != null) {
        const DATA_PAKAN_STATE_FILE = path.join(__dirname, '../data/datapakanState.json');
        try {
          await fs.promises.mkdir(path.dirname(DATA_PAKAN_STATE_FILE), { recursive: true });
          await fs.promises.writeFile(DATA_PAKAN_STATE_FILE, JSON.stringify(data, null, 2));
          console.log(`✅ Pakan state data berhasil disimpan di ${DATA_PAKAN_STATE_FILE}`);
        } catch (writeErr) {
          console.error('❌ Error saving pakan state data:', writeErr);
        }
      } else {
        console.error('❌ Payload pakan state tidak lengkap:', data);
      }
    } else {
      console.warn(`⚠️ Diterima pesan dari topik yang tidak dikenal: ${topic}`);
    }
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
});

module.exports = client;
