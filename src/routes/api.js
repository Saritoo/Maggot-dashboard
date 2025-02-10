const express = require('express');
const router = express.Router();
const Sensor = require('../models/sensorModel');
const Sequelize = require('sequelize'); // Pastikan Sequelize diimpor untuk operator query

// Import controller untuk PID dan Pakan
const pidController = require('../controllers/pidController');
const pakanController = require('../controllers/pakanController'); 

// Endpoint: Mendapatkan data sensor terbaru
router.get('/sensor/latest', async (req, res) => {
  try {
    const data = await Sensor.findOne({ order: [['createdAt', 'DESC']] });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint: Mendapatkan riwayat data sensor dengan filter tanggal
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

// Endpoint: Menyimpan pengaturan PID
router.post('/pid/settings', pidController.savePIDSettings);
router.get('/pid/settings', pidController.getPIDSettings);
// Endpoint: Menyimpan & Mengambil pengaturan pakan (feed settings)
router.post('/feed/settings', pakanController.saveFeedSettings);
router.get('/feed/settings', pakanController.getFeedSettings);

module.exports = router;
