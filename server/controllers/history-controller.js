// controllers/historyController.js
const SensorData = require('../database/models/sensor-data-model'); // adjust path if needed

exports.getSensorHistory = async (req, res) => {
  try {
    const { type } = req.query;

    let timeAgo;
    let groupFormat;
    if (type === "24h") {
      timeAgo = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours
      groupFormat = { $hour: "$createdAt" }; // group by hour
    } else if (type === "7d") {
      timeAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7 days
      groupFormat = { $dayOfMonth: "$createdAt" }; // group by day
    } else if (type === "30d") {
      timeAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
      groupFormat = { $dayOfMonth: "$createdAt" }; // group by day
    } else {
      return res.status(400).json({ message: "Invalid type parameter" });
    }

    // Fetch sensor data from DB
    const sensorData = await SensorData.find({
      createdAt: { $gte: timeAgo }
    }).sort({ createdAt: 1 }); // sort oldest -> newest

    // Format data for frontend
    const formattedData = sensorData.map(entry => ({
      time: new Date(entry.timestamp).toLocaleString("en-IN", {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
        weekday: "short",
        timeZone: "Asia/Kolkata" // Ensuring time is displayed in IST (Indian Standard Time)
      }),
      temperature: entry.temperature,
      humidity: entry.humidity,
      soilMoisture: entry.soilMoisture,
    }));

    res.json(formattedData);

  } catch (error) {
    console.error('Error fetching sensor history:', error);
    res.status(500).json({ message: "Server error" });
  }
};
