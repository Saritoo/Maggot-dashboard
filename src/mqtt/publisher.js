// Publish commands to devices

const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://movie-swing.gl.at.ply.gg:65088');

client.on('connect', () => {
    console.log('Publisher connected to MQTT broker');
  
    // Kirim data setiap 5 detik
    setInterval(() => {
      const message = JSON.stringify({
        temperature: (Math.random() * 10 + 20).toFixed(2),
        humidity: (Math.random() * 10 + 50).toFixed(2),
      });
  
      client.publish('suhu/slave', message);
      console.log(`Message published: ${message}`);
    }, 1000);
  });