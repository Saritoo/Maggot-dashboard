// PID Controller configuration
const { publishPWM } = require('../mqtt/publisher');

const pidConfig = {
  kp: 2.0,
  ki: 0.5,
  kd: 1.0,
  targetTemp: 28,
  targetHumidity: 65,
  sampleTime: 1000
};

let lastTempError = 0;
let tempIntegral = 0;
let lastHumidityError = 0;
let humidityIntegral = 0;
let lastUpdate = Date.now();

function calculatePID(current, target, lastError, integral) {
  const error = target - current;
  const now = Date.now();
  const dt = (now - lastUpdate) / 1000;

  integral += error * dt;
  const derivative = (error - lastError) / dt;

  let output = pidConfig.kp * error + 
              pidConfig.ki * integral + 
              pidConfig.kd * derivative;

  output = Math.max(0, Math.min(255, output));
  return { output, integral, error };
}

function processSensorData(temperature, humidity) {
  const now = Date.now();
  if (now - lastUpdate < pidConfig.sampleTime) return;
  
  // Temperature PID
  const tempResult = calculatePID(
    temperature,
    pidConfig.targetTemp,
    lastTempError,
    tempIntegral
  );
  
  // Humidity PID
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

  // Prepare PWM data
  const pwmData = {
    tempPWM: Math.round(tempResult.output),
    humidityPWM: Math.round(humidityResult.output),
    timestamp: new Date().toISOString()
  };

  publishPWM(pwmData);
}

module.exports = { processSensorData };