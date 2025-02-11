// slaveSimulator.js

const mqtt = require('mqtt');

// Konfigurasi broker
const broker = 'movie-swing.gl.at.ply.gg';  // Ganti dengan alamat broker Anda
const port = 65088;                         // Ganti dengan port broker Anda

const client = mqtt.connect(`mqtt://${broker}:${port}`);

// Definisi topik
const TEMPERATURE_TOPIC = 'suhu/slave';
const ATS_TOPIC = 'ats/slave';
const PAKAN_SENSOR_TOPIC = 'pakan/sensor/slave';
const PAKAN_STATE_TOPIC = 'pakan/state/slave';

// Fungsi publish data suhu & kelembaban
function publishTemperatureData() {
  const payload = {
    temperature: parseFloat((25 + Math.random() * 10).toFixed(1)), // 25 - 35°C
    humidity: parseFloat((40 + Math.random() * 30).toFixed(1))      // 40 - 70%
  };
  client.publish(TEMPERATURE_TOPIC, JSON.stringify(payload), (err) => {
    if (err) {
      console.error('❌ Error publishing to', TEMPERATURE_TOPIC, err);
    } else {
      console.log(`📡 Published on ${TEMPERATURE_TOPIC}: ${JSON.stringify(payload)}`);
    }
  });
}

// Fungsi publish data ATS
function publishAtsData() {
  const payload = {
    solarVoltage: parseFloat((10 + Math.random() * 5).toFixed(2)),  // 10 - 15 Volt
    batteryVoltage: parseFloat((12 + Math.random() * 2).toFixed(2)),  // 12 - 14 Volt
    psuVoltage: parseFloat((4 + Math.random() * 2).toFixed(2))        // 4 - 6 Volt
  };
  client.publish(ATS_TOPIC, JSON.stringify(payload), (err) => {
    if (err) {
      console.error('❌ Error publishing to', ATS_TOPIC, err);
    } else {
      console.log(`📡 Published on ${ATS_TOPIC}: ${JSON.stringify(payload)}`);
    }
  });
}

// Fungsi publish data sensor pakan
function publishPakanSensorData() {
  // Pastikan payload mengandung field "amount" agar validasi pada model Pakan terpenuhi
  const payload = {
    berat_Pakan: parseFloat((100 + Math.random() * 50).toFixed(2)),  // 100 - 150
    berat_Maggot: parseFloat((10 + Math.random() * 5).toFixed(2))      // 10 - 15
  };
  client.publish(PAKAN_SENSOR_TOPIC, JSON.stringify(payload), (err) => {
    if (err) {
      console.error('❌ Error publishing to', PAKAN_SENSOR_TOPIC, err);
    } else {
      console.log(`📡 Published on ${PAKAN_SENSOR_TOPIC}: ${JSON.stringify(payload)}`);
    }
  });
}

client.on('connect', () => {
  console.log('✅ Slave/Sensor connected to MQTT broker');
  // Publikasikan data secara berkala ke setiap topik
  setInterval(publishTemperatureData, 5000);   // tiap 5 detik
  setInterval(publishAtsData, 10000);           // tiap 10 detik
  setInterval(publishPakanSensorData, 15000);   // tiap 15 detik
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err);
  client.end();
});
