const mongoose = require('mongoose');

// Define Schema for Sensor Data
const sensorDataSchema = new mongoose.Schema({
    temperature: {
        type: Number,
        required: true,
    },
    humidity: {
        type: Number,
        required: true,
    },
    soilMoisture: {
        type: Number,
        required: true,
    },
    soilMoistureRaw: {
        type: Number,
        required: false,
    },
    lightLevel: {
        type: Number,
        required: true,
    },
    lightLevelRaw: {
        type: Number,
        required: false,
    },
    rainDrop: {
        type: Number,
        required: true,
    },
    rainDropRaw: {
        type: Number,
        required: false,
    },
    pumpStatus: {
        type: Boolean,
        required: true,
    },
    autoMode: {
        type: Boolean,
        required: true,
    },
    irrigationScore: {
        type: Number,
        required: false,
    },
    timestamp: {
        type: Date,
        required: true,
    }
},{
    timestamps: true
});

// Create and Export the Model
const SensorData = new mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData;
