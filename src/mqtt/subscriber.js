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

  // Subscribe ke semua topik
  [TEMPERATURE_TOPIC, ATS_TOPIC].forEach((topic) => {
    client.subscribe(topic, (err) => {
      if (err) console.error(`❌ Subscribe error on ${topic}:`, err);
      else console.log(`📡 Subscribed to: ${topic}`);
    });
  });
});

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    if (topic === TEMPERATURE_TOPIC) {
      // Simpan data sensor ke database
      await Sensor.create({
        temperature: data.temperature,
        humidity: data.humidity,
      });
      
      // Proses PID (jika diperlukan)
      processSensorData(data.temperature, data.humidity);
    }
    if (topic === ATS_TOPIC) {
      console.log(" Received ATS data:", data);

      // Simpan data sumber daya/listrik ke database
      await Ats.create({
        solarVoltage: data.solarVoltage,
        batteryVoltage: data.batteryVoltage,
        psuVoltage: data.psuVoltage
      });
    } 
  } catch (error) {
    console.error('Error processing message:', error);
  }
});
