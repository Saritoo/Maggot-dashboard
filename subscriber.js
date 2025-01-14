const mqtt = require('mqtt');

// Koneksi ke broker MQTT
const client = mqtt.connect('mqtt://movie-swing.gl.at.ply.gg:65088');

client.on('connect', () => {
  console.log('Subscriber connected to MQTT broker');

  // Berlangganan ke topik "sensor/data"
  client.subscribe('sensor/data', (err) => {
    if (!err) {
      console.log('Subscribed to topic: sensor/data');
    }
  });
});

// Tangani pesan yang diterima
client.on('message', (topic, message) => {
  console.log(`Message received on topic '${topic}': ${message.toString()}`);
});
