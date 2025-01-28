require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./src/config/database');
const mqttSubscriber = require('./src/mqtt/subscriber');
const mqttPublisher = require('./src/mqtt/publisher');
const apiRoutes = require('./src/routers/api');

// Inisialisasi Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database Connection Check
sequelize.authenticate()
  .then(() => console.log('Database connection has been established successfully.'))
  .catch(err => console.error('Unable to connect to the database:', err));

// MQTT Client Initialization
console.log('Initializing MQTT clients...');
mqttSubscriber; // Aktifkan subscriber
mqttPublisher;  // Aktifkan publisher

// Routes
app.use('/api', apiRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message 
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Server Startup
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`
  ==================================================
  🚀 Server running on port ${PORT}
  📡 MQTT Broker: ${process.env.MQTT_BROKER || 'broker.hivemq.com'}
  📦 Database: ${process.env.DB_NAME}
  ==================================================
  `);
});

module.exports = app; // Untuk testing