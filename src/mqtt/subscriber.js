// Handle incoming MQTT data
const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');
const Sensor = require('../models/sensorModel');
const { processSensorData } = require('../controllers/pidController');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);

const TEMPERATURE_TOPIC = 'suhu/slave';

client.on('connect', () => {
  console.log('Subscriber connected to MQTT broker');
  client.subscribe(TEMPERATURE_TOPIC, (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log('Subscribed to:', TEMPERATURE_TOPIC);
  });
});

client.on('message', async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    
    if (topic === TEMPERATURE_TOPIC) {
      // Save to database
      await Sensor.create({
        temperature: data.temperature,
        humidity: data.humidity
      });
      
      // Process PID
      processSensorData(data.temperature, data.humidity);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});