const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

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

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  // Send a greeting message to the client when connected
  ws.send(JSON.stringify({ message: "Hello from WebSocket server" }));

  // Handle incoming messages
  ws.on("message", (message) => {
    // console.log("Received message from client:", message);
    // console.log('Received message from client:', message);
    if (Buffer.isBuffer(message)) {
      // Convert buffer to string and log it
      const data = message.toString('utf-8'); // Assuming the data is UTF-8 text
      console.log('Received message from ESP8266:', data);
      // Broadcast the received message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          console.log('Sending a Data at Frontend:', data);
          client.send(data); // Broadcasting the message
        }
      });
    }
  });

  // Handle WebSocket closure event
  ws.on("close", () => {
    console.log("WebSocket client disconnected");
  });

  // Handle WebSocket errors
  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

// Server listens on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
