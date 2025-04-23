#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>

// Replace with your network credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Replace with your WebSocket server IP or domain
const char* websocket_server = "192.168.222.219";  // Replace with your server's IP address
const uint16_t websocket_port = 3000;

WebSocketsClient webSocket;

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WSc] Connected to server");
      // Optional: send a test message
      webSocket.sendTXT("Hello from ESP8266");
      break;
    case WStype_TEXT:
      Serial.printf("[WSc] Received text: %s\n", payload);
      break;
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  webSocket.begin(websocket_server, websocket_port, "/");

  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);  // Try to reconnect every 5 seconds
}

void loop() {
  webSocket.loop();
}
