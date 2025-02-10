// src/controllers/pidController.js

// PID Controller configuration
const { publishPWM } = require('../mqtt/publisher');
const fs = require('fs');
// Gunakan path yang sesuai: dari folder controllers ke config, naik 1 level
const { pidJsonPath } = require('../config/database');

const pidConfig = {
  kp: 2.0,
  ki: 0.5,
  kd: 1.0,
  targetTemp: 50,
  targetHumidity: 30,
  sampleTime: 1000 // PID update interval in milliseconds
};

/**
 * Fungsi untuk load konfigurasi PID dari file JSON.
 * Jika file tidak ada, kosong, atau gagal membaca, gunakan nilai default.
 */
function loadPIDSettings() {
  if (fs.existsSync(pidJsonPath)) {
    try {
      const data = fs.readFileSync(pidJsonPath, 'utf-8');
      
      // Jika file kosong, gunakan konfigurasi default
      if (!data.trim()) {
        console.warn("PID settings JSON kosong, menggunakan nilai default.");
        return;
      }

      const settings = JSON.parse(data);

      // Perbarui pidConfig hanya jika terdapat nilai yang valid pada settings
      pidConfig.kp = settings.kp !== undefined ? settings.kp : pidConfig.kp;
      pidConfig.ki = settings.ki !== undefined ? settings.ki : pidConfig.ki;
      pidConfig.kd = settings.kd !== undefined ? settings.kd : pidConfig.kd;
      pidConfig.targetTemp = settings.targetTemp !== undefined ? settings.targetTemp : pidConfig.targetTemp;
      pidConfig.targetHumidity = settings.targetHumidity !== undefined ? settings.targetHumidity : pidConfig.targetHumidity;
      pidConfig.sampleTime = settings.sampleTime !== undefined ? settings.sampleTime : pidConfig.sampleTime;
      
      console.log("PID settings loaded from JSON:", pidConfig);
    } catch (err) {
      console.error("Error parsing PID settings JSON:", err);
    }
  } else {
    console.log("PID settings JSON not found, using default settings.");
  }
}

// Panggil fungsi load saat inisialisasi
loadPIDSettings();

let lastTempError = 0;
let tempIntegral = 0;
let lastHumidityError = 0;
let humidityIntegral = 0;
let lastUpdate = Date.now();

/**
 * Fungsi untuk menghitung output PID.
 * Memastikan tidak terjadi pembagian dengan nol dan output berada dalam rentang yang valid.
 */
function calculatePID(current, target, lastError, integral) {
  const error = target - current;
  const now = Date.now();
  let dt = (now - lastUpdate) / 1000; // Convert ms to seconds
  
  if (dt <= 0) dt = 1; // Prevent division by zero

  integral += error * dt;
  const derivative = (error - lastError) / dt;

  let output = pidConfig.kp * error + pidConfig.ki * integral + pidConfig.kd * derivative;

  // Batasi output PWM dalam rentang 0-80 (atau sesuai kebutuhan)
  output = Math.max(0, Math.min(80, output));

  return { output, integral, error };
}

/**
 * Memproses data sensor (suhu dan kelembaban) menggunakan PID control.
 * Mengupdate variabel internal dan menerbitkan nilai PWM melalui MQTT.
 */
function processSensorData(temperature, humidity) {
  const now = Date.now();
  console.log(`Processing PID at ${new Date().toISOString()} | Temp: ${temperature}, Humidity: ${humidity}`);

  // Pastikan PID hanya di-update sesuai interval sampleTime
  if (now - lastUpdate < pidConfig.sampleTime) {
    console.log('Skipping PID update due to sample time restriction');
    return;
  }

  // Compute PID untuk suhu
  const tempResult = calculatePID(
    temperature,
    pidConfig.targetTemp,
    lastTempError,
    tempIntegral
  );

  // Compute PID untuk kelembaban
  const humidityResult = calculatePID(
    humidity,
    pidConfig.targetHumidity,
    lastHumidityError,
    humidityIntegral
  );

  // Update state variables
  lastTempError = tempResult.error;
  tempIntegral = tempResult.integral;
  lastHumidityError = humidityResult.error;
  humidityIntegral = humidityResult.integral;
  lastUpdate = now;

  // Siapkan data PWM
  const pwmData = {
    TemperatureSetPoint: pidConfig.targetTemp,
    HumiditySetPoint: pidConfig.targetHumidity,
    PwmFanHeater: Math.round(tempResult.output),
    PwmFanHumidifier: Math.round(humidityResult.output),
    timestamp: new Date().toISOString()
  };

  console.log('Calculated PWM:', pwmData);

  // Publish PWM values via MQTT
  publishPWM(pwmData);
}

/**
 * Menyimpan pengaturan PID yang diterima dari request ke file JSON,
 * serta memperbarui konfigurasi internal (pidConfig).
 * Hanya pengaturan setpoint suhu dan kelembaban yang diperbarui.
 */
function savePIDSettings(req, res) {
  const { targetTemp, targetHumidity } = req.body;

  // Validasi input: hanya periksa targetTemp dan targetHumidity
  if (targetTemp == null || targetHumidity == null) {
    return res.status(400).json({ error: 'Data pengaturan PID tidak lengkap.' });
  }

  // Perbarui konfigurasi PID internal hanya untuk setpoint suhu dan kelembaban
  pidConfig.targetTemp = parseFloat(targetTemp);
  pidConfig.targetHumidity = parseFloat(targetHumidity);

  const newSettings = {
    ...pidConfig,
    updatedAt: new Date().toISOString()
  };

  // Tulis data konfigurasi baru ke file JSON
  fs.writeFile(pidJsonPath, JSON.stringify(newSettings, null, 2), (err) => {
    if (err) {
      console.error('Error writing PID settings:', err);
      return res.status(500).json({ error: 'Gagal menyimpan pengaturan PID.' });
    }
    return res.status(200).json({
      message: 'Pengaturan PID berhasil disimpan.',
      data: newSettings
    });
  });
}
/**
 * Mengambil pengaturan PID dari file JSON
 */
function getPIDSettings(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  fs.readFile(pidJsonPath, (err, data) => {
    if (err) {
      console.error('Error reading PID settings:', err);
      return res.status(500).json({ 
        error: 'Gagal membaca pengaturan PID',
        details: err.message
      });
    }
    
    try {
      const settings = JSON.parse(data);
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

module.exports = { 
  processSensorData, 
  savePIDSettings,
  getPIDSettings 
};