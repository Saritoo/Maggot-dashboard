// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const { sequelize } = require('./src/config/database');
require('./src/mqtt/broker');
const mqttSubscriber = require('./src/mqtt/subscriber');
const mqttPublisher = require('./src/mqtt/publisher');
const apiRoutes = require('./src/routes/api');

// Inisialisasi Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve file statis dari folder "public"
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection Check dan Sinkronisasi
sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
    return sequelize.sync(); // Sinkronisasi semua model dengan database
  })
  .then(() => {
    console.log('Database synchronized successfully.');

    // MQTT Client Initialization
    console.log('Initializing MQTT clients...');
    mqttSubscriber; // Aktifkan subscriber
    mqttPublisher;  // Aktifkan publisher

    // Routes
    app.use('/api', apiRoutes);

    // Error Handling Middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).sendFile(path.join(__dirname, 'public/handleerror', 'error.html'));
    });

    // 404 Handler (untuk endpoint yang tidak cocok)
    app.use((req, res) => {
      res.status(404).sendFile(path.join(__dirname, 'public/handleerror', '404.html'));
    });

    // Server Startup
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`
  ==================================================
  🚀 Server running on port ${PORT}
  📡 MQTT Broker: ${process.env.MQTT_BROKER || 'broker.hivemq.com'}
  📦 Database: ${process.env.DB_NAME}
  ==================================================
  `);
    });
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

module.exports = app; // Untuk testing
