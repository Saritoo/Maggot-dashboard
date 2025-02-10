const fs = require('fs');
const { feedJsonPath } = require('../config/database');
const { publishFeedSchedule } = require('../mqtt/publisher'); 

/**
 * Menyimpan pengaturan pakan ke file JSON dengan update parsial.
 */
function saveFeedSettings(req, res) {
    const { times, amount } = req.body;

    // Baca data lama dari file JSON (jika ada)
    fs.readFile(feedJsonPath, 'utf8', (err, data) => {
        let previousSettings = {};
        if (!err && data) {
            try {
                previousSettings = JSON.parse(data); // Parse JSON jika ada data lama
            } catch (parseErr) {
                console.error('❌ Error parsing JSON lama:', parseErr);
            }
        }

        // Gunakan data lama jika nilai baru tidak dikirim
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
            // Publish ke MQTT
            publishFeedSchedule(updatedSettings);
            return res.status(200).json({
                message: 'Pengaturan pakan berhasil disimpan.',
                data: updatedSettings
            });
        });
    });
}

/**
 * Mengambil pengaturan pakan yang tersimpan.
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

module.exports = { saveFeedSettings, getFeedSettings };
