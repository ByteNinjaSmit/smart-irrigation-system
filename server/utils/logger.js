// ./server/utils/logger.js
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure the 'logs' directory exists
const logDirectory = path.resolve(__dirname, '../logs'); // Use resolve to ensure absolute path
if (!fs.existsSync(logDirectory)) {
  try {
    fs.mkdirSync(logDirectory, { recursive: true }); // Ensure parent directories are created as well
    console.log('Log directory created');
  } catch (err) {
    console.error('Failed to create log directory:', err);
  }
}

// Create a logger with a timestamp and a simple log format
const logger = winston.createLogger({
  level: 'info', // Adjust this to your desired log level (e.g., 'debug', 'error')
  format: winston.format.combine(
    winston.format.colorize(), // Adds colors to console output
    winston.format.timestamp(), // Adds a timestamp to each log entry
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level}: ${message}`; // Custom log format
    })
  ),
  transports: [
    new winston.transports.Console(), // Log to the console
    new winston.transports.File({
      filename: path.join(logDirectory, 'app.log') // Resolve the log file path using the absolute log directory path
    }) // Log to a file
  ],
});

module.exports = logger;