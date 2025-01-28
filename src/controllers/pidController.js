// PID Controller configuration
const { publishPWM } = require('../mqtt/publisher');

const pidConfig = {
  kp: 2.0,
  ki: 0.5,
  kd: 1.0,
  targetTemp: 28,
  targetHumidity: 65,
  sampleTime: 1000 // PID update interval in milliseconds
};

let lastTempError = 0;
let tempIntegral = 0;
let lastHumidityError = 0;
let humidityIntegral = 0;
let lastUpdate = Date.now();

/**
 * Function to calculate PID output.
 * Prevents division by zero and ensures PWM remains within valid range.
 */
function calculatePID(current, target, lastError, integral) {
  const error = target - current;
  const now = Date.now();
  let dt = (now - lastUpdate) / 1000; // Convert ms to seconds
  
  if (dt <= 0) dt = 1; // Prevent division by zero

  integral += error * dt;
  const derivative = (error - lastError) / dt;

  let output = pidConfig.kp * error + pidConfig.ki * integral + pidConfig.kd * derivative;

  // Ensure PWM is within 0-255 range
  output = Math.max(0, Math.min(255, output));

  return { output, integral, error };
}

/**
 * Processes temperature and humidity data using PID control.
 * Publishes calculated PWM values via MQTT.
 */
function processSensorData(temperature, humidity) {
  const now = Date.now();
  console.log(`Processing PID at ${new Date().toISOString()} | Temp: ${temperature}, Humidity: ${humidity}`);

  // Ensure PID only updates at the defined sample time
  if (now - lastUpdate < pidConfig.sampleTime) {
    console.log('Skipping PID update due to sample time restriction');
    return;
  }

  // Compute PID for Temperature
  const tempResult = calculatePID(
    temperature,
    pidConfig.targetTemp,
    lastTempError,
    tempIntegral
  );

  // Compute PID for Humidity
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

  console.log('Calculated PWM:', pwmData);

  // Publish PWM values via MQTT
  publishPWM(pwmData);
}

module.exports = { processSensorData };
