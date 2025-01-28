const express = require('express');
const router = express.Router();
const Sensor = require('../models/sensorModel');

// Get latest sensor data
router.get('/sensor/latest', async (req, res) => {
  try {
    const data = await Sensor.findOne({
      order: [['createdAt', 'DESC']]
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sensor history
router.get('/sensor/history', async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    
    if (start && end) {
      where.createdAt = {
        [Sequelize.Op.between]: [new Date(start), new Date(end)]
      };
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

module.exports = router;