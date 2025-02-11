// src/controllers/pakanController.js

const fs = require('fs');
const path = require('path');
const Pakan = require('../models/pakanModel');
// Pastikan feedJsonPath mengacu ke file feedSettings.json yang benar
const feedJsonPath = path.join(__dirname, '../../data/feedSettings.json');
// Import fungsi publish dari modul MQTT publisher
const { publishFeedSchedule } = require('../mqtt/publisher');

/**
 * saveFeedSettings
 * Menyimpan pengaturan pakan ke file JSON dengan update parsial.
 * Setelah menyimpan, publish hanya payload minimal:
 * { pakanTimer: 1, amount: <nilai> }
 */
function saveFeedSettings(req, res) {
  const { times, amount } = req.body;

  // Baca data lama dari file JSON (jika ada)
  fs.readFile(feedJsonPath, 'utf8', (err, data) => {
    let previousSettings = {};
    if (!err && data) {
      try {
        previousSettings = JSON.parse(data);
      } catch (parseErr) {
        console.error('❌ Error parsing JSON lama:', parseErr);
      }
    }

    const updatedSettings = {
      times: times || previousSettings.times || ["06:00", "12:00", "18:00"],
      amount: amount !== undefined ? parseFloat(amount) : previousSettings.amount || 100,
      updatedAt: new Date().toISOString()
    };

    // Simpan data baru ke file JSON
    fs.writeFile(feedJsonPath, JSON.stringify(updatedSettings, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('❌ Error menulis feed settings:', writeErr);
        return res.status(500).json({ error: 'Gagal menyimpan pengaturan pakan.' });
      }
      // Buat payload minimal untuk publish
      const feedCommand = {
        pakanTimer: 1,
        amount: updatedSettings.amount
      };
      // Publish hanya payload minimal ke MQTT
      publishFeedSchedule(feedCommand);
      return res.status(200).json({
        message: 'Pengaturan pakan berhasil disimpan. Perintah telah dipublish: ' + JSON.stringify(feedCommand),
        data: updatedSettings
      });
    });
  });
}

/**
 * getFeedSettings
 * Mengambil pengaturan pakan yang tersimpan dari file JSON.
 */
function getFeedSettings(req, res) {
  fs.readFile(feedJsonPath, 'utf8', (err, data) => {
    if (err) {
      console.error('❌ Error membaca file feed settings:', err);
      return res.status(500).json({ error: 'Gagal mengambil data pengaturan pakan.' });
    }
    try {
      const settings = JSON.parse(data);
      return res.status(200).json({ data: settings });
    } catch (parseErr) {
      console.error('❌ Error parsing JSON:', parseErr);
      return res.status(500).json({ error: 'Format data tidak valid.' });
    }
  });
}

/**
 * getLatestPakanData
 * Mengambil data pakan terbaru dari database.
 * Endpoint: GET /pakan/latest
 */
async function getLatestPakanData(req, res) {
  try {
    const latestRecord = await Pakan.findOne({
      order: [['feedTime', 'DESC']]
    });
    if (!latestRecord) {
      return res.status(404).json({ message: 'Tidak ada data pakan tersedia' });
    }
    return res.json(latestRecord);
  } catch (error) {
    console.error('❌ Error fetching latest pakan data:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data pakan' });
  }
}

/**
 * getRealtimePakanData
 * Mengambil data realtime pakan (nilai berat pakan dan maggot) dari record pakan terbaru.
 * Endpoint: GET /pakan/realtime
 */
async function getRealtimePakanData(req, res) {
  try {
    const latestRecord = await Pakan.findOne({
      order: [['feedTime', 'DESC']]
    });
    if (!latestRecord) {
      return res.status(404).json({ message: 'Tidak ada data pakan tersedia' });
    }
    return res.json({
      beforeFeedStock: latestRecord.beforeFeedStock,
      beforeMaggotWeight: latestRecord.beforeMaggotWeight,
      afterFeedStock: latestRecord.afterFeedStock,
      afterFeedWeight: latestRecord.afterFeedWeight, // Pastikan field ini sesuai dengan definisi model
      feedTime: latestRecord.feedTime
    });
  } catch (error) {
    console.error('❌ Error fetching realtime pakan data:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data pakan realtime' });
  }
}

/**
 * checkAndPublishFeedSchedule
 * Mengecek apakah saat ini sudah waktunya pemberian pakan, dan jika ya:
 * 1. Membuat payload { pakanTimer: 1, amount: <nilai feed settings> }.
 * 2. Mem-publish payload ke MQTT.
 * 3. Mengupdate file feed settings dengan waktu terakhir pengiriman.
 * Endpoint: POST /pakan/check
 */
async function checkAndPublishFeedSchedule(req, res) {
  try {
    const fileContent = await fs.promises.readFile(feedJsonPath, 'utf8');
    let settings = {};
    try {
      settings = JSON.parse(fileContent);
    } catch (parseErr) {
      console.error('❌ Error parsing feed settings:', parseErr);
      return res.status(500).json({ error: 'Format feed settings tidak valid' });
    }

    const currentTime = new Date();
    const currentHourMinute = currentTime.toTimeString().slice(0, 5); // "HH:MM"
    const lastSentTime = settings.lastSentTime ? new Date(settings.lastSentTime) : null;
    const lastSentDate = lastSentTime ? lastSentTime.toDateString() : null;
    const currentDate = currentTime.toDateString();

    if (settings.times.includes(currentHourMinute) && lastSentDate !== currentDate) {
      console.log(`⏰ Saatnya memberi pakan pada ${currentHourMinute}`);

      // Buat payload khusus hanya untuk perintah pakan
      const feedData = {
        pakanTimer: 1,
        amount: settings.amount
      };

      // Publish payload minimal ke MQTT
      publishFeedSchedule(feedData);

      // Update waktu terakhir pengiriman di file feed settings
      settings.lastSentTime = currentTime.toISOString();
      await fs.promises.writeFile(feedJsonPath, JSON.stringify(settings, null, 2));

      return res.json({
        message: 'Waktu pemberian pakan telah terdeteksi. Perintah untuk mengeluarkan pakan telah dipublish.',
        publishedMessage: feedData,
        settings: settings
      });
    } else {
      return res.json({
        message: 'Belum waktunya pemberian pakan atau perintah sudah dipublish hari ini.',
        currentTime: currentHourMinute,
        feedTimes: settings.times,
        lastSent: settings.lastSentTime || null
      });
    }
  } catch (error) {
    console.error('❌ Error in checkAndPublishFeedSchedule:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan saat memeriksa jadwal pakan' });
  }
}

module.exports = {
  saveFeedSettings,
  getFeedSettings,
  getLatestPakanData,
  getRealtimePakanData,
  checkAndPublishFeedSchedule
};
