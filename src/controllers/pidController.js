// src/controllers/pidController.js

// Import modul publishPWM dari file MQTT publisher untuk mengirim data PWM melalui MQTT
const { publishPWM } = require('../mqtt/publisher');
// Import modul fs untuk operasi file (membaca/menulis file JSON)
const fs = require('fs');
// Import path dari file konfigurasi database (file JSON yang menyimpan pengaturan PID)
const { pidJsonPath } = require('../config/database');

// Konfigurasi PID default
const pidConfig = {
  kp: 2.0,             // Gain proporsional
  ki: 0.5,             // Gain integral
  kd: 1.0,             // Gain derivatif
  targetTemp: 50,      // Setpoint suhu yang diinginkan
  targetHumidity: 30,  // Setpoint kelembaban yang diinginkan
  sampleTime: 1000     // Interval pembaruan PID (dalam milidetik)
};

/**
 * Fungsi untuk memuat (load) pengaturan PID dari file JSON.
 * Jika file tidak ada, kosong, atau terjadi kesalahan saat parsing, maka akan digunakan nilai default.
 */
function loadPIDSettings() {
  // Cek apakah file JSON yang berisi pengaturan PID ada
  if (fs.existsSync(pidJsonPath)) {
    try {
      // Baca isi file JSON secara sinkron
      const data = fs.readFileSync(pidJsonPath, 'utf-8');
      
      // Jika file kosong, tampilkan peringatan dan gunakan konfigurasi default
      if (!data.trim()) {
        console.warn("PID settings JSON kosong, menggunakan nilai default.");
        return;
      }

      // Parsing data JSON
      const settings = JSON.parse(data);

      // Perbarui nilai pada pidConfig hanya jika ada nilai yang valid dalam file JSON
      pidConfig.kp = settings.kp !== undefined ? settings.kp : pidConfig.kp;
      pidConfig.ki = settings.ki !== undefined ? settings.ki : pidConfig.ki;
      pidConfig.kd = settings.kd !== undefined ? settings.kd : pidConfig.kd;
      pidConfig.targetTemp = settings.targetTemp !== undefined ? settings.targetTemp : pidConfig.targetTemp;
      pidConfig.targetHumidity = settings.targetHumidity !== undefined ? settings.targetHumidity : pidConfig.targetHumidity;
      pidConfig.sampleTime = settings.sampleTime !== undefined ? settings.sampleTime : pidConfig.sampleTime;
      
      console.log("PID settings loaded from JSON:", pidConfig);
    } catch (err) {
      // Jika terjadi error pada saat parsing JSON, tampilkan pesan error
      console.error("Error parsing PID settings JSON:", err);
    }
  } else {
    // Jika file tidak ditemukan, gunakan pengaturan default
    console.log("PID settings JSON not found, using default settings.");
  }
}

// Panggil fungsi loadPIDSettings() saat inisialisasi modul agar pidConfig diperbarui bila diperlukan
loadPIDSettings();

// Inisialisasi variabel untuk menyimpan nilai error dan integral untuk masing-masing sensor (suhu dan kelembaban)
// Variabel ini digunakan untuk perhitungan PID secara berkelanjutan
let lastTempError = 0;
let tempIntegral = 0;
let lastHumidityError = 0;
let humidityIntegral = 0;
let lastUpdate = Date.now(); // Menyimpan waktu pembaruan terakhir (dalam milidetik)

/**
 * Fungsi untuk menghitung output PID berdasarkan nilai sensor saat ini dan target.
 * Fungsi ini juga menangani perhitungan integral dan derivatif.
 * 
 * @param {number} current - Nilai sensor saat ini (misal: suhu atau kelembaban)
 * @param {number} target - Nilai target yang diinginkan (setpoint)
 * @param {number} lastError - Nilai error sebelumnya
 * @param {number} integral - Nilai akumulasi error (integral)
 * @returns {object} - Mengembalikan objek yang berisi output PWM, nilai integral terbaru, dan error saat ini
 */
function calculatePID(current, target, lastError, integral) {
  // Hitung error antara setpoint dan nilai saat ini
  const error = target - current;
  
  // Dapatkan waktu saat ini dan hitung selisih waktu (dt) dalam detik sejak pembaruan terakhir
  const now = Date.now();
  let dt = (now - lastUpdate) / 1000; // Konversi dari ms ke detik
  
  // Jika dt kurang dari atau sama dengan 0, set dt menjadi 1 untuk menghindari pembagian dengan nol
  if (dt <= 0) dt = 1;

  // Tambahkan error saat ini ke nilai integral (akumulasi error)
  integral += error * dt;
  // Hitung nilai derivatif berdasarkan perubahan error per dt
  const derivative = (error - lastError) / dt;

  // Hitung output PID berdasarkan komponen proporsional, integral, dan derivatif
  let output = pidConfig.kp * error + pidConfig.ki * integral + pidConfig.kd * derivative;

  // Batasi output PWM agar berada dalam rentang 0 sampai 80 (atau rentang lain sesuai kebutuhan)
  output = Math.max(0, Math.min(80, output));

  // Kembalikan output beserta nilai integral dan error yang diperbarui
  return { output, integral, error };
}

/**
 * Fungsi untuk memproses data sensor (suhu dan kelembaban) dengan PID control.
 * Fungsi ini mengupdate variabel internal dan menerbitkan nilai PWM melalui MQTT.
 * 
 * @param {number} temperature - Nilai suhu yang diukur
 * @param {number} humidity - Nilai kelembaban yang diukur
 */
function processSensorData(temperature, humidity) {
  const now = Date.now();
  console.log(`Processing PID at ${new Date().toISOString()} | Temp: ${temperature}, Humidity: ${humidity}`);

  // Pastikan update PID hanya dilakukan sesuai interval sampleTime untuk menghindari perhitungan yang terlalu sering
  if (now - lastUpdate < pidConfig.sampleTime) {
    console.log('Skipping PID update due to sample time restriction');
    return;
  }

  // Hitung PID untuk suhu:
  // Menggunakan nilai suhu saat ini, target suhu, error terakhir, dan nilai integral yang sudah terkumpul
  const tempResult = calculatePID(
    temperature,
    pidConfig.targetTemp,
    lastTempError,
    tempIntegral
  );

  // Hitung PID untuk kelembaban:
  // Menggunakan nilai kelembaban saat ini, target kelembaban, error terakhir, dan nilai integral yang sudah terkumpul
  const humidityResult = calculatePID(
    humidity,
    pidConfig.targetHumidity,
    lastHumidityError,
    humidityIntegral
  );

  // Perbarui variabel state dengan nilai error dan integral yang baru untuk perhitungan PID selanjutnya
  lastTempError = tempResult.error;
  tempIntegral = tempResult.integral;
  lastHumidityError = humidityResult.error;
  humidityIntegral = humidityResult.integral;
  // Perbarui waktu pembaruan terakhir
  lastUpdate = now;

  // Siapkan objek data PWM yang akan dikirim melalui MQTT
  const pwmData = {
    TemperatureSetPoint: pidConfig.targetTemp,
    HumiditySetPoint: pidConfig.targetHumidity,
    PwmFanHeater: Math.round(tempResult.output),       // Output PWM untuk heater (suhu)
    PwmFanHumidifier: Math.round(humidityResult.output), // Output PWM untuk humidifier (kelembaban)
    timestamp: new Date().toISOString()                  // Timestamp saat pengiriman data
  };

  console.log('Calculated PWM:', pwmData);

  // Publish nilai PWM ke broker MQTT menggunakan fungsi publishPWM
  publishPWM(pwmData);
}

/**
 * Fungsi untuk menyimpan pengaturan PID yang diterima dari request ke file JSON,
 * serta memperbarui konfigurasi internal (pidConfig).
 * Hanya pengaturan setpoint suhu dan kelembaban yang diperbarui.
 * 
 * @param {object} req - Objek request dari client, berisi data pengaturan PID pada req.body
 * @param {object} res - Objek response untuk mengembalikan status dan pesan ke client
 */
function savePIDSettings(req, res) {
  const { targetTemp, targetHumidity } = req.body;

  // Validasi input: pastikan kedua nilai targetTemp dan targetHumidity disediakan
  if (targetTemp == null || targetHumidity == null) {
    return res.status(400).json({ error: 'Data pengaturan PID tidak lengkap.' });
  }

  // Perbarui nilai setpoint suhu dan kelembaban pada konfigurasi PID internal
  pidConfig.targetTemp = parseFloat(targetTemp);
  pidConfig.targetHumidity = parseFloat(targetHumidity);

  // Buat objek baru yang mencakup semua pengaturan PID beserta waktu update
  const newSettings = {
    ...pidConfig,
    updatedAt: new Date().toISOString()
  };

  // Tulis objek pengaturan baru ke file JSON secara asinkron
  fs.writeFile(pidJsonPath, JSON.stringify(newSettings, null, 2), (err) => {
    if (err) {
      console.error('Error writing PID settings:', err);
      return res.status(500).json({ error: 'Gagal menyimpan pengaturan PID.' });
    }
    // Jika berhasil, kirim response sukses beserta data pengaturan yang telah disimpan
    return res.status(200).json({
      message: 'Pengaturan PID berhasil disimpan.',
      data: newSettings
    });
  });
}

/**
 * Fungsi untuk mengambil pengaturan PID dari file JSON dan mengirimkannya ke client.
 * Fungsi ini juga men-set header CORS agar request dari client lain dapat diterima.
 * 
 * @param {object} req - Objek request dari client
 * @param {object} res - Objek response untuk mengembalikan data pengaturan PID
 */
function getPIDSettings(req, res) {
  // Set header CORS agar semua origin diizinkan dan tipe konten JSON
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Baca file JSON yang berisi pengaturan PID
  fs.readFile(pidJsonPath, (err, data) => {
    if (err) {
      console.error('Error reading PID settings:', err);
      return res.status(500).json({ 
        error: 'Gagal membaca pengaturan PID',
        details: err.message
      });
    }
    
    try {
      // Parsing data JSON
      const settings = JSON.parse(data);
      // Kirim response dengan status sukses dan data pengaturan (setpoint suhu, kelembaban, dan waktu update)
      res.status(200).json({
        message: 'Pengaturan PID berhasil dibaca',
        data: {
          targetTemp: settings.targetTemp,
          targetHumidity: settings.targetHumidity,
          updatedAt: settings.updatedAt
        }
      });
    } catch (parseError) {
      console.error('Error parsing PID settings:', parseError);
      res.status(500).json({
        error: 'Format data PID tidak valid',
        details: parseError.message
      });
    }
  });
}

// Ekspor fungsi-fungsi yang digunakan oleh modul lain, seperti router Express
module.exports = { 
  processSensorData, 
  savePIDSettings,
  getPIDSettings 
};
