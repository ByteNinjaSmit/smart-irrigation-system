#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>


// WiFi credentials
const char* ssid = "iot";
const char* password = "1234567890";
WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 19800, 60000);  // 19800 is the UTC offset for IST (India Standard Time)


// WebSocket server
const char* websocket_server = "10.235.116.112"; // 192.168.44.57  / 192.168.15.112
const uint16_t websocket_port = 3000;


#define RELAY_PIN 16  
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

        // Handle JSON commands
        DynamicJsonDocument doc(256);
        DeserializationError error = deserializeJson(doc, payload);
        
        if (error) {
          Serial.print("JSON parsing failed: ");
          Serial.println(error.c_str());
          // Fallback to old string-based handling
          if (msg.indexOf("frontend-connected") >= 0) {
            Serial.println("Frontend connected, sending immediate data...");
            firstTimeSend = true;
          }
        } else {
          // Handle JSON commands
          if (doc.containsKey("type") && doc["type"] == "frontend-connected") {
            Serial.println("Frontend connected, sending immediate data...");
            firstTimeSend = true;
            
            // Blink LED to indicate frontend connection
            blinkLED(2, 100); // Quick double blink
          } else if (doc.containsKey("command")) {
            String command = doc["command"];
            Serial.println("Received command: " + command);
            
            if (command == "pump-on") {
              digitalWrite(RELAY_PIN, HIGH);
              pumpStatus = true;
              Serial.println("Pump turned ON manually");
              
              // Blink blue LED to indicate manual pump activation
              blinkLED(3, 200); // Blink 3 times with 200ms delay
            }
            else if (command == "pump-off") {
              digitalWrite(RELAY_PIN, LOW);
              pumpStatus = false;
              Serial.println("Pump turned OFF manually");
              
              // Blink blue LED to indicate manual pump deactivation
              blinkLED(2, 300); // Blink 2 times with 300ms delay
            }
            else if (command == "auto-on") {
              autoMode = true;
              Serial.println("Auto mode enabled");
              
              // Blink LED to indicate auto mode enabled
              blinkLED(4, 150); // Blink 4 times with 150ms delay
            }
            else if (command == "auto-off") {
              autoMode = false;
              Serial.println("Auto mode disabled");
              
              // Blink LED to indicate auto mode disabled
              blinkLED(1, 500); // Single long blink
            }
            else {
              Serial.println("Unknown command: " + command);
            }
          }
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

// Function to blink the built-in LED
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, LOW);  // Turn LED ON (active LOW)
    delay(delayMs);
    digitalWrite(LED_PIN, HIGH); // Turn LED OFF
    delay(delayMs);
  }
}



void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);  // Set LDR pin as input
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Keep relay OFF at boot

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
    
    // Handle DHT sensor read failures
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor! Using previous values.");
      // Use previous values instead of returning
      temperature = previousTemperature != -1000 ? previousTemperature : 25.0; // Default fallback
      humidity = previousHumidity != -1000 ? previousHumidity : 50.0; // Default fallback
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

    // Only run automatic irrigation if autoMode is enabled
    if (autoMode && (soilDry && (highTemperature || lowHumidity)) && noRain) {
      digitalWrite(LED_PIN, LOW);
      digitalWrite(RELAY_PIN, HIGH); // ON (active LOW)
      pumpStatus = true;
    } else if (autoMode) {
      // Only turn off pump automatically if in auto mode
      digitalWrite(LED_PIN, HIGH);
      pumpStatus = false;
      digitalWrite(RELAY_PIN, LOW); // OFF
    }
    // If not in auto mode, pump status is controlled manually via commands

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
