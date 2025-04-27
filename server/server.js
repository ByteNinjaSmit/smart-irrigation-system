// server.js
const dotenv = require('dotenv');
dotenv.config();
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const app = express();
const server = http.createServer(app);


// Database connection
const connectToDatabase = require('./database/db');
const logger = require('./utils/logger'); // Import the logger
const SensorData = require('./database/models/sensor-data-model');

// Importing Routes
const historyRoutes = require('./routes/history-router');

// middleware
const saveSensorData = require('./middlewares/sensor-data-middleware'); // adjust path



// Server listens on port 3000
const PORT = process.env.PORT || 3000;
// CORS Policy
const allowedOrigins = ['http://localhost:5173'];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin); // ✅ Allow only one
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

// Mapping of clients
const clients = new Map();  // frontendID => frontendSocket
const espDevices = new Set();  // List of ESP8266 device sockets

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", async(message) => {
    if (Buffer.isBuffer(message)) {
      message = message.toString('utf-8');
    }

    try {
      const parsedMessage = JSON.parse(message);

      // Check if this is a frontend or ESP initialization
      if (parsedMessage.type === "init-frontend") {
        const frontendId = parsedMessage.frontendId;
        clients.set(frontendId, ws);
        ws.frontendId = frontendId;
        console.log(`Frontend registered with ID: ${frontendId}`);

        // Notify all ESP devices: "new frontend connected"
        for (let espWs of espDevices) {
          if (espWs.readyState === WebSocket.OPEN) {
            espWs.send(JSON.stringify({ type: "frontend-connected" }));
          }
        }
      } else if (parsedMessage.type === "init-esp") {
        espDevices.add(ws);
        ws.isEspDevice = true;
        console.log(`ESP device registered`);

      } else if (ws.isEspDevice) {
        // Message is coming from ESP
        console.log('Received message from ESP8266:', parsedMessage);

        // Store The Database
        // Save sensor data using middleware
        await saveSensorData(parsedMessage);

        // Now you need a way to determine WHICH frontend to send to.
        // Example: assume one frontend only for now, or select by some logic.
        for (let [frontendId, clientWs] of clients.entries()) {
          if (clientWs.readyState === WebSocket.OPEN) {
            console.log(`Sending to frontend ${frontendId}`);
            clientWs.send(JSON.stringify(parsedMessage));
          }
        }

      } else {
        console.log('Unknown message:', parsedMessage);
      }
    } catch (err) {
      console.error('Invalid message received:', err);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket client disconnected");

    if (ws.frontendId) {
      clients.delete(ws.frontendId);
      console.log(`Frontend ${ws.frontendId} removed`);
    }

    if (ws.isEspDevice) {
      espDevices.delete(ws);
      console.log(`ESP device removed`);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// Server Starting with Connecting Database

// Routes
app.use("/api/data", historyRoutes);


connectToDatabase()
  .then(() => {
    console.log("Connected to MongoDB successfully");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      logger.info(`Server running on port ${PORT}`);
      // logController(io);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  });
process.on("SIGINT", () => {
  console.log("Shutting down server...");
  server.close(() => {
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
});