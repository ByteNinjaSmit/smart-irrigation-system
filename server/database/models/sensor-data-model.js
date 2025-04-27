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
    lightLevel: {
        type: Number,
        required: true,
    },
    rainDrop: {
        type: Number,
        required: true,
    },
    pumpStatus: {
        type: Boolean,
        required: true,
    },
    autoMode: {
        type: Boolean,
        required: true,
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
