// subscriber.js
const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');
const Sensor = require('../models/sensorModel');
const Ats = require('../models/atsModel');
const { processSensorData } = require('../controllers/pidController');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);

const TEMPERATURE_TOPIC = 'suhu/slave';
const ATS_TOPIC = 'ats/slave';

client.on('connect', () => {
  console.log('✅ Subscriber connected to MQTT broker');

  // Subscribe ke topik-topik yang diinginkan
  [TEMPERATURE_TOPIC, ATS_TOPIC].forEach((topic) => {
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
  // Tampilkan pesan mentah untuk debugging
  console.log(`📥 Received message on topic ${topic}: ${message.toString()}`);

  try {
    const data = JSON.parse(message.toString());

    if (topic === TEMPERATURE_TOPIC) {
      // Validasi data sensor
      if (data && data.temperature != null && data.humidity != null) {
        // Simpan data sensor ke database
        await Sensor.create({
          temperature: data.temperature,
          humidity: data.humidity,
        });

        // Proses data sensor (PID) jika diperlukan
        processSensorData(data.temperature, data.humidity);
      } else {
        console.error('❌ Payload sensor tidak lengkap:', data);
      }
    } else if (topic === ATS_TOPIC) {
      console.log("📡 Received ATS data:", data);

      // Validasi data ATS
      if (
        data &&
        data.solarVoltage != null &&
        data.batteryVoltage != null &&
        data.psuVoltage != null
      ) {
        // Simpan data ATS ke database
        await Ats.create({
          solarVoltage: data.solarVoltage,
          batteryVoltage: data.batteryVoltage,
          psuVoltage: data.psuVoltage,
        });
      } else {
        console.error('❌ Payload ATS tidak lengkap:', data);
      }
    } else {
      console.warn(`⚠️ Diterima pesan dari topik yang tidak dikenal: ${topic}`);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});
