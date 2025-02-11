// src/controllers/atsController.js
const Ats = require('../models/atsModel');

const getLatestATSData = async (req, res) => {
    try {
      // Ambil record ATS terbaru berdasarkan createdAt secara menurun
      const latestRecord = await Ats.findOne({
        order: [['createdAt', 'DESC']]
      });
  
      if (!latestRecord) {
        return res.json({ message: "Tidak ada data tersedia" });
      }
  
      res.json({
        solarVoltage: latestRecord.solarVoltage,
        batteryVoltage: latestRecord.batteryVoltage,
        psuVoltage: latestRecord.psuVoltage,
        timestamp: latestRecord.createdAt.toISOString()
      });
  
    } catch (error) {
      console.error("❌ Error fetching ATS data:", error);
      res.status(500).json({ error: "Terjadi kesalahan dalam mengambil data ATS" });
    }
  };
  
module.exports = { getLatestATSData };
