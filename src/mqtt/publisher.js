// Publish commands to devices

const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);
const PWM_TOPIC = 'pwm/master';

client.on('connect', () => {
  console.log('Publisher connected to MQTT broker');
});

const publishPWM = (pwmData) => {
  client.publish(PWM_TOPIC, JSON.stringify(pwmData));
  console.log('Published PWM:', pwmData);
};

module.exports = { publishPWM };