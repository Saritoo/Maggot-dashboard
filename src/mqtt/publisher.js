// Publish commands to devices

const mqtt = require('mqtt');
const mqttCredentials = require('../config/mqtt');

const client = mqtt.connect(`mqtt://${mqttCredentials.broker}:${mqttCredentials.port}`);
const PWM_TOPIC = 'pwm/master';

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

module.exports = { publishPWM };