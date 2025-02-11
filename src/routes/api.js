// src/routes/api.js
const express = require('express');
const router = express.Router();
const Sensor = require('../models/sensorModel');
const Sequelize = require('sequelize'); // Untuk operator query

// Import controller untuk PID, Pakan, dan ATS
const pidController = require('../controllers/pidController');
const pakanController = require('../controllers/pakanController'); 
const atsController = require('../controllers/atsController');

// Endpoint: Data sensor terbaru
router.get('/sensor/latest', async (req, res) => {
  try {
    const data = await Sensor.findOne({ order: [['createdAt', 'DESC']] });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Riwayat data sensor (dengan filter tanggal)
router.get('/sensor/history', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    if (start && end) {
      where.createdAt = { [Sequelize.Op.between]: [new Date(start), new Date(end)] };
    }
    const data = await Sensor.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk mendapatkan data ATS terbaru
router.get('/ats/latest', atsController.getLatestATSData);
// Endpoint: Pengaturan PID
router.post('/pid/settings', pidController.savePIDSettings);
router.get('/pid/settings', pidController.getPIDSettings);

// Endpoint: Pengaturan pakan (feed settings)
router.post('/feed/settings', pakanController.saveFeedSettings);
router.get('/feed/settings', pakanController.getFeedSettings);

// Endpoint: Data pakan terbaru (seluruh record)
router.get('/pakan/latest', pakanController.getLatestPakanData);

// Endpoint: Data pakan realtime (nilai berat pakan dan maggot)
router.get('/pakan/realtime', pakanController.getRealtimePakanData);

// Endpoint: Mengecek jadwal pemberian pakan dan publish perintah ke MQTT
router.post('/pakan/check', pakanController.checkAndPublishFeedSchedule);

module.exports = router;
