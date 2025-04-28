#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>


// WiFi credentials
const char* ssid = "IOT";
const char* password = "1234567890";
WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 19800, 60000);  // 19800 is the UTC offset for IST (India Standard Time)


// WebSocket server
const char* websocket_server = "192.168.44.57"; // 192.168.44.57  / 192.168.15.112
const uint16_t websocket_port = 3000;

// DHT22 setup
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// D0 → GPIO16
// D1 → GPIO5
// D2 → GPIO4
// D3 → GPIO0
// D4 → GPIO2
// D5 → GPIO14
// D6 → GPIO12
// D7 → GPIO13
// D8 → GPIO15

// Sensor pins
#define LDR_PIN 12  // or use D6 if your library supports it FOR D6 having 12
#define SOIL_MOISTURE_PIN A0
#define RAIN_SENSOR_PIN 5
#define LED_PIN LED_BUILTIN  // Usually GPIO2 on ESP8266

bool autoMode = true;           // Set true if you want automatic system, can toggle by server command
bool pumpStatus = false;        // true if pump (LED) is ON
bool espConnected = false;  // true if WebSocket connected


// Global variables at top
float previousTemperature = -1000;
float previousHumidity = -1000;
int previousLightPercent = -1;
int previousSoilMoisturePercent = -1;
int previousRainDetected = -1;
bool previousPumpStatus = false;
bool firstTimeSend = true;  // 👈 NEW

// WebSocket
WebSocketsClient webSocket;
unsigned long lastSendTime = 0;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("Connected to WebSocket server");
      // Identify as ESP
      webSocket.sendTXT("{\"type\":\"init-esp\"}");
      espConnected = true;  // set connected
      break;
    case WStype_TEXT:
      {

        Serial.printf("Received from server: %s\n", payload);

        String msg = String((char*)payload);

        if (msg.indexOf("frontend-connected") >= 0) {
          Serial.println("Frontend connected, sending immediate data...");
          firstTimeSend = true;  // 👈 Mark to send immediately
        }
        break;
      }
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      espConnected = false;  // set disconnected
      break;
  }
}


String getISOTime() {
  // Ensure the NTP client has updated the time
  timeClient.update();

  // Get the current time
  unsigned long currentEpoch = timeClient.getEpochTime(); // Get current time in seconds since epoch
  int hours = (currentEpoch / 3600) % 24;  // Calculate hours (0-23)
  int minutes = (currentEpoch / 60) % 60;  // Calculate minutes (0-59)
  int seconds = currentEpoch % 60;        // Calculate seconds (0-59)

  // Format as ISO 8601 string: "2025-04-27T15:52:30+05:30"
  char buffer[30];
  snprintf(buffer, sizeof(buffer), "2025-04-27T%02d:%02d:%02d+05:30", hours, minutes, seconds);
  return String(buffer);
}



void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);  // Set LDR pin as input

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected! IP Address: ");
  Serial.println(WiFi.localIP());

  dht.begin();
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  timeClient.begin();   // Initialize the NTP client
  timeClient.update();  // Update the time
}


// Inside Loop
void loop() {
  webSocket.loop();

  if (millis() - lastSendTime > 1000) {
    float temperature = dht.readTemperature(false);
    float humidity = dht.readHumidity();
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    int ldrRaw = digitalRead(LDR_PIN);
    int soilRaw = analogRead(SOIL_MOISTURE_PIN);
    int rainDetected = digitalRead(RAIN_SENSOR_PIN);

    int soilMoisturePercent = map(soilRaw, 1023, 0, 0, 100);
    soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

    // If LDR detects light, it's HIGH, otherwise LOW
    int lightLevelPercent = (ldrRaw == HIGH) ? 0 : 100; // 100% light detected or 0% no light
    lightLevelPercent = constrain(lightLevelPercent, 0, 100);
    // Serial.print("LDR RAW: ");
    // Serial.print(ldrRaw);
    // Serial.println();
    bool soilDry = soilMoisturePercent < 60;
    bool highTemperature = temperature > 30.0;
    bool lowHumidity = humidity < 50.0;
    bool noRain = rainDetected == 1;

    if ((soilDry && (highTemperature || lowHumidity)) && noRain) {
      digitalWrite(LED_PIN, LOW);
      pumpStatus = true;
    } else {
      digitalWrite(LED_PIN, HIGH);
      pumpStatus = false;
    }

    bool shouldSend = false;

    // Detect changes
    if (firstTimeSend || temperature != previousTemperature || humidity != previousHumidity || lightLevelPercent != previousLightPercent || soilMoisturePercent != previousSoilMoisturePercent || rainDetected != previousRainDetected || pumpStatus != previousPumpStatus) {
      shouldSend = true;
    }

    if (shouldSend) {
      previousTemperature = temperature;
      previousHumidity = humidity;
      previousLightPercent = lightLevelPercent;
      previousSoilMoisturePercent = soilMoisturePercent;
      previousRainDetected = rainDetected;
      previousPumpStatus = pumpStatus;

      firstTimeSend = false;  // after first send

      StaticJsonDocument<512> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["soilMoisture"] = soilMoisturePercent;
      doc["lightLevel"] = lightLevelPercent;
      doc["rainDrop"] = rainDetected;
      doc["pumpStatus"] = pumpStatus;
      doc["autoMode"] = autoMode;
      doc["timestamp"] = getISOTime();  // Use the NTP time here
      doc["espConnected"]=espConnected;

      String jsonStr;
      serializeJson(doc, jsonStr);

      webSocket.sendTXT(jsonStr);
      Serial.println("Data Sent to Server");
    }

    lastSendTime = millis();  // update timer
  }
}
