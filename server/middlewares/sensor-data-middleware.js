// middlewares/saveSensorData.js

const SensorData = require('../database/models/sensor-data-model'); // adjust path if needed

const saveSensorData = async (parsedMessage) => {
  try {
    const sensorData = new SensorData({
      temperature: parsedMessage.temperature,
      humidity: parsedMessage.humidity,
      soilMoisture: parsedMessage.soilMoisture,
      lightLevel: parsedMessage.lightLevel,
      rainDrop: parsedMessage.rainDrop,
      pumpStatus: parsedMessage.pumpStatus,
      autoMode: parsedMessage.autoMode,
      timestamp: parsedMessage.timestamp,
    });

    await sensorData.save();
    console.log('Sensor data saved to database.');
  } catch (err) {
    console.error('Error saving sensor data:', err);
  }
};

module.exports = saveSensorData;
