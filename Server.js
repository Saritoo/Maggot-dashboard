const aedes = require('aedes')(); // Broker MQTT
const net = require('net');
const mqtt = require('mqtt');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const db = require('./db');
const cors = require('cors');

const PORT_MQTT = 65088; // Port MQTT
const PORT_WEB = 61089;  // Port Web Server

// Membuat broker MQTT
const mqttServer = net.createServer(aedes.handle);
mqttServer.listen(PORT_MQTT, () => {
  console.log(`MQTT broker running on port ${PORT_MQTT}`);
});

// Membuat server web
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware untuk melayani file statis
app.use(express.static('public'));
app.use(cors());
app.use(express.json());

// API untuk mengambil data suhu
app.get(`/api/data/suhu`, (req, res) => {
  const sql = "SELECT * FROM suhu_slave_data ORDER BY timestamp ASC";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// API untuk mengambil data pakan
app.get(`/api/data/pakan`, (req, res) => {
  const sql = "SELECT * FROM pakan_slave_data ORDER BY timestamp ASC";
  db.query(sql, (err, result) => {
    if (err) throw err;
    res.json(result);
  });
});

// Jalankan server web
server.listen(PORT_WEB, () => {
  console.log(`Web server running on http://holiday-myers.gl.at.ply.gg:${PORT_WEB}`);
});

// Koneksi ke broker MQTT (localhost)
const mqttClient = mqtt.connect('mqtt://movie-swing.gl.at.ply.gg:65088');

// Event saat broker MQTT terhubung
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('pakan/slave'); // Berlangganan topik
  mqttClient.subscribe('suhu/slave');
});

// Event saat menerima pesan dari topik
mqttClient.on('message', (topic, message) => {
    if (topic === 'suhu/slave') {
        const data = JSON.parse(message.toString()); // Parse pesan menjadi objek
        const temperature = parseFloat(data.temperature.toFixed(2));
        const humidity = parseFloat(data.humidity.toFixed(2));
    
        // Hitung nilai tambahan
        const heatIndex = calculateHeatIndex(temperature, humidity);
        const dewPoint = calculateDewPoint(temperature, humidity);
    
        console.log(`Received Data - Temp: ${temperature} °C, Humidity: ${humidity} %`);
        console.log(`Calculated Heat Index: ${heatIndex} °C, Dew Point: ${dewPoint} °C`);
    
        // Kirim data lengkap ke klien web
        io.emit('mqttData', {
            temperature,
            humidity,
            heatIndex,
            dewPoint,
        });
        const sql = "INSERT INTO suhu_slave_data (temperature, humidity, heat_index, dew_point) VALUES (?, ?, ?, ?)";
        db.query(sql, [temperature, humidity, heatIndex, dewPoint], (err) => {
          if (err) console.error('Error inserting suhu data:', err);
    });
    }

    if (topic === 'pakan/slave') {
        const data = JSON.parse(message.toString()); // Parse pesan menjadi objek
        const temperature = parseFloat(data.temperature.toFixed(2));
        const pressure = parseFloat(data.pressure.toFixed(2));
    
        // Hitung nilai tambahan
        const altitude = calculateAltitude(temperature, pressure);

        console.log(`Received Data - Temp: ${temperature} °C, - Pressure: ${pressure} Pa`);
        console.log(`Altitude: ${altitude} meter`);
    
        // Kirim data lengkap ke klien web
        io.emit('mqttData', {
          temperature,
          pressure,
          altitude,
        });
        mqttClient.publish('pakan/master', altitude);
        const sql = "INSERT INTO pakan_slave_data (temperature, pressure, altitude) VALUES (?, ?, ?)";
        db.query(sql, [temperature, pressure, altitude], (err) => {
          if (err) console.error('Error inserting pakan data:', err);
    });
      }
  });  

function calculateHeatIndex(temperature, humidity) {
    const T = temperature; // Suhu dalam derajat Celsius
    const H = humidity;    // Kelembaban relatif dalam %
    
    // Formula Heat Index (dikonversi ke Celsius)
    const HI = -8.78469475556 + 
               1.61139411 * T + 
               2.33854883889 * H + 
               -0.14611605 * T * H + 
               -0.012308094 * T * T + 
               -0.0164248277778 * H * H + 
               0.002211732 * T * T * H + 
               0.00072546 * T * H * H + 
               -0.000003582 * T * T * H * H;
  
    return HI.toFixed(2); // Mengembalikan nilai HI dalam 2 desimal
  }

function calculateDewPoint(temperature, humidity) {
    const T = temperature; // Suhu dalam derajat Celsius
    const H = humidity;    // Kelembaban relatif dalam %
    
    const a = 17.27;
    const b = 237.7;
  
    const alpha = (a * T) / (b + T) + Math.log(H / 100);
    const DP = (b * alpha) / (a - alpha);
  
    return DP.toFixed(2); // Mengembalikan nilai DP dalam 2 desimal
  }
  
/**
 * Fungsi untuk menghitung ketinggian berdasarkan suhu dan tekanan udara
 * @param {number} temperature - Suhu udara dalam °C
 * @param {number} pressure - Tekanan udara dalam Pa
 * @returns {number} - Ketinggian dalam meter
 */
function calculateAltitude(temperature, pressure) {
  const P0 = 101325;       // Tekanan di permukaan laut (Pa)
  const L = 0.0065;        // Lapse rate (K/m)
  const R = 287.05;        // Konstanta gas udara kering (J/kg·K)
  const g = 9.80665;       // Gravitasi bumi (m/s²)

  // Konversi suhu ke Kelvin
  const T0 = temperature + 273.15;

  // Hitung ketinggian dengan rumus barometrik
  const altitude = (T0 / L) * (1 - Math.pow(pressure / P0, (R * L) / g));

  return altitude.toFixed(2); // Ketinggian dalam meter (2 desimal)
}