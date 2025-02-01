// MQTT credentials// MQTT credentials
require('dotenv').config();
const mqttCredentials = {
  broker: process.env.MQTT_BROKER || 'broker.hivemq.com',
  port: process.env.MQTT_PORT || 1883,
};

module.exports = mqttCredentials;