#include <WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include <NTPClient.h>

// ------------------- WiFi credentials -------------------
const char* ssid = "iot";
const char* password = "1234567890";

// ------------------- NTP Client -------------------
WiFiUDP udp;
NTPClient timeClient(udp, "pool.ntp.org", 19800, 60000);  // UTC+5:30 (IST)

// ------------------- WebSocket server -------------------
const char* websocket_server = "10.235.116.112"; 
const uint16_t websocket_port = 3000;

// ------------------- Pin definitions -------------------
#define RELAY_PIN 23
#define DHTPIN 4
#define DHTTYPE DHT11
#define LDR_PIN 32
#define SOIL_MOISTURE_PIN 34  // ADC pin
#define RAIN_SENSOR_PIN 33  // Analog pin for rain sensor
#define LED_PIN 2  // Onboard LED (GPIO2)

// ------------------- Objects -------------------
DHT dht(DHTPIN, DHTTYPE);
WebSocketsClient webSocket;

// ------------------- State variables -------------------
bool autoMode = true;
bool pumpStatus = false;
bool espConnected = false;

float previousTemperature = -1000;
float previousHumidity = -1000;
int previousLightPercent = -1;
int previousSoilMoisturePercent = -1;
int previousRainPercent = -1;
bool previousPumpStatus = false;
bool firstTimeSend = true;

unsigned long lastSendTime = 0;

// ------------------- Smart Irrigation Variables -------------------
const int soilThresholdOn = 50;   // Turn pump ON below this (dry soil)
const int soilThresholdOff = 70;  // Turn pump OFF above this (moist soil)
const int rainThreshold = 30;     // Rain intensity threshold for irrigation
const unsigned long maxPumpTime = 15UL * 60UL * 1000UL; // 15 minutes max pump time
const int irrigationScoreThreshold = 6; // Minimum score to start irrigation

unsigned long pumpStartTime = 0;
int lastIrrigationScore = 0;
bool pumpWasOn = false;

// ------------------- Helper Functions -------------------

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// ------------------- Smart Irrigation Functions -------------------

int calculateIrrigationScore(float temperature, float humidity, int soilPercent, int rainPercent, int lightPercent) {
  int score = 0;
  
  // Soil moisture (High Priority - Most Important)
  if (soilPercent < 30) score += 4;        // Very dry soil
  else if (soilPercent < 50) score += 3;   // Dry soil
  else if (soilPercent < 60) score += 2;   // Slightly dry soil
  else if (soilPercent >= 80) score -= 2;  // Very wet soil (negative score)
  
  // Rain detection (High Priority - Avoid wasting water)
  if (rainPercent < 10) score += 3;        // No rain
  else if (rainPercent < 20) score += 2;   // Light rain/drizzle
  else if (rainPercent < 40) score += 1;   // Moderate rain
  else if (rainPercent >= 60) score -= 3;  // Heavy rain (negative score)
  
  // Temperature (Medium Priority)
  if (temperature > 35) score += 3;        // Very hot
  else if (temperature > 30) score += 2;   // Hot
  else if (temperature > 25) score += 1;   // Warm
  else if (temperature < 15) score -= 1;   // Cold (less water needed)
  
  // Humidity (Medium Priority)
  if (humidity < 30) score += 2;           // Very low humidity
  else if (humidity < 40) score += 1;      // Low humidity
  else if (humidity > 80) score -= 1;      // High humidity (less water needed)
  
  // Light intensity (Low Priority - affects evaporation)
  if (lightPercent < 20) score += 1;       // Bright sunlight (more evaporation)
  else if (lightPercent > 80) score -= 1;  // Very dark (less evaporation)
  
  // Time-based factor (Low Priority)
  int currentHour = (timeClient.getEpochTime() / 3600) % 24;
  if (currentHour >= 6 && currentHour <= 10) score += 1;  // Morning irrigation preferred
  else if (currentHour >= 18 && currentHour <= 22) score += 1; // Evening irrigation preferred
  else if (currentHour >= 22 || currentHour <= 6) score -= 1;  // Night irrigation discouraged
  
  return score;
}

bool shouldStartIrrigation(int score, int soilPercent, int rainPercent) {
  // Must meet minimum score threshold
  if (score < irrigationScoreThreshold) return false;
  
  // Must have dry soil (hysteresis)
  if (soilPercent >= soilThresholdOff) return false;
  
  // Must not have significant rain
  if (rainPercent >= rainThreshold) return false;
  
  return true;
}

bool shouldStopIrrigation(int soilPercent, int rainPercent, unsigned long pumpRuntime) {
  // Stop if soil is moist enough (hysteresis)
  if (soilPercent >= soilThresholdOff) return true;
  
  // Stop if significant rain starts
  if (rainPercent >= rainThreshold) return true;
  
  // Stop if pump has run too long (safety)
  if (pumpRuntime >= maxPumpTime) return true;
  
  return false;
}


String getISOTime() {
  timeClient.update();
  unsigned long epochTime = timeClient.getEpochTime();

  int hours = (epochTime / 3600) % 24;
  int minutes = (epochTime / 60) % 60;
  int seconds = epochTime % 60;

  char buffer[30];
  snprintf(buffer, sizeof(buffer), "2025-10-07T%02d:%02d:%02d+05:30", hours, minutes, seconds);
  return String(buffer);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("✅ Connected to WebSocket server");
      webSocket.sendTXT("{\"type\":\"init-esp\"}");
      espConnected = true;
      break;

    case WStype_TEXT: {
      Serial.printf("📩 Received: %s\n", payload);
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, payload);

      if (error) {
        Serial.print("JSON parse error: ");
        Serial.println(error.c_str());
        String msg = String((char*)payload);
        if (msg.indexOf("frontend-connected") >= 0) firstTimeSend = true;
      } else {
        if (doc.containsKey("type") && doc["type"] == "frontend-connected") {
          Serial.println("Frontend connected → sending immediate data");
          firstTimeSend = true;
          blinkLED(2, 100);
        } else if (doc.containsKey("command")) {
          String command = doc["command"];
          Serial.println("Command: " + command);

          if (command == "pump-on") {
            digitalWrite(RELAY_PIN, HIGH);
            pumpStatus = true;
            blinkLED(3, 200);
          } else if (command == "pump-off") {
            digitalWrite(RELAY_PIN, LOW);
            pumpStatus = false;
            blinkLED(2, 300);
          } else if (command == "auto-on") {
            autoMode = true;
            blinkLED(4, 150);
          } else if (command == "auto-off") {
            autoMode = false;
            blinkLED(1, 500);
          }
        }
      }
      break;
    }

    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket disconnected");
      espConnected = false;
      break;
  }
}

// ------------------- Setup -------------------
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(LDR_PIN, INPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  Serial.println("\n🔌 Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  dht.begin();
  timeClient.begin();
  webSocket.begin(websocket_server, websocket_port, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

// ------------------- Loop -------------------
void loop() {
  webSocket.loop();

  if (millis() - lastSendTime > 1000) {
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("⚠️ DHT read failed. Using previous values.");
      temperature = (previousTemperature != -1000) ? previousTemperature : 25.0;
      humidity = (previousHumidity != -1000) ? previousHumidity : 50.0;
    }

    int ldrValue = analogRead(LDR_PIN);
    // Map LDR analog values (0-4095) to percentage (0-100%)
    // 4095 (bright) → 0% (darkness percentage)
    // 0 (dark) → 100% (darkness percentage)
    int lightPercent = map(ldrValue, 4095,0, 0, 100);
    lightPercent = constrain(lightPercent, 0, 100);
    
    // Debug output for LDR values
    Serial.printf("🔆 LDR Raw: %d, Mapped: %d%%\n", ldrValue, lightPercent);

    int soilValue = analogRead(SOIL_MOISTURE_PIN);
    // Map soil moisture analog values (0-4095) to percentage (0-100%)
    // 4095 (dry/air) → 0% (moisture percentage)
    // 0 (wet/water) → 100% (moisture percentage)
    int soilPercent = map(soilValue, 4095, 0, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);
    
    // Debug output for soil moisture values
    Serial.printf("🌱 Soil Raw: %d, Mapped: %d%%\n", soilValue, soilPercent);

    int rainValue = analogRead(RAIN_SENSOR_PIN);
    // Map rain sensor analog values (0-4095) to percentage (0-100%)
    // 4095 (dry plate) → 0% (rain intensity)
    // 0 (fully wet/submerged) → 100% (rain intensity)
    int rainPercent = map(rainValue, 4095, 0, 0, 100);
    rainPercent = constrain(rainPercent, 0, 100);
    
    // Debug output for rain sensor values
    Serial.printf("🌧️ Rain Raw: %d, Intensity: %d%%\n", rainValue, rainPercent);

    // ------------------- Smart Irrigation Logic -------------------
    if (autoMode) {
      // Calculate irrigation score based on all factors
      int irrigationScore = calculateIrrigationScore(temperature, humidity, soilPercent, rainPercent, lightPercent);
      lastIrrigationScore = irrigationScore;
      
      // Get current pump runtime
      unsigned long currentPumpRuntime = 0;
      if (pumpStatus && pumpStartTime > 0) {
        currentPumpRuntime = millis() - pumpStartTime;
      }
      
      // Smart irrigation decision
      if (!pumpStatus) {
        // Pump is OFF - decide if we should start
        if (shouldStartIrrigation(irrigationScore, soilPercent, rainPercent)) {
          digitalWrite(RELAY_PIN, HIGH);
          pumpStatus = true;
          pumpStartTime = millis();
          pumpWasOn = true;
          Serial.printf("🚰 Starting irrigation - Score: %d, Soil: %d%%, Rain: %d%%\n", 
                       irrigationScore, soilPercent, rainPercent);
          blinkLED(2, 200); // Quick blink to indicate irrigation start
        }
      } else {
        // Pump is ON - decide if we should stop
        if (shouldStopIrrigation(soilPercent, rainPercent, currentPumpRuntime)) {
          digitalWrite(RELAY_PIN, LOW);
          pumpStatus = false;
          pumpStartTime = 0;
          Serial.printf("🛑 Stopping irrigation - Soil: %d%%, Rain: %d%%, Runtime: %lu ms\n", 
                       soilPercent, rainPercent, currentPumpRuntime);
          blinkLED(3, 150); // Triple blink to indicate irrigation stop
        }
      }
      
      // Debug output for irrigation decisions
      Serial.printf("🧠 Irrigation Score: %d (Threshold: %d), Soil: %d%%, Rain: %d%%, Temp: %.1f°C, Humidity: %.1f%%\n", 
                   irrigationScore, irrigationScoreThreshold, soilPercent, rainPercent, temperature, humidity);
    }

    bool shouldSend =
      firstTimeSend ||
      temperature != previousTemperature ||
      humidity != previousHumidity ||
      lightPercent != previousLightPercent ||
      soilPercent != previousSoilMoisturePercent ||
      rainPercent != previousRainPercent ||
      pumpStatus != previousPumpStatus;

    if (shouldSend) {
      previousTemperature = temperature;
      previousHumidity = humidity;
      previousLightPercent = lightPercent;
      previousSoilMoisturePercent = soilPercent;
      previousRainPercent = rainPercent;
      previousPumpStatus = pumpStatus;
      firstTimeSend = false;

      StaticJsonDocument<512> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["soilMoisture"] = soilPercent;
      doc["soilMoistureRaw"] = soilValue;  // Add raw soil moisture analog value
      doc["lightLevel"] = lightPercent;
      doc["lightLevelRaw"] = ldrValue;  // Add raw analog value
      doc["rainDrop"] = rainPercent;  // Changed to rain intensity percentage
      doc["rainDropRaw"] = rainValue;  // Add raw rain sensor analog value
      doc["pumpStatus"] = pumpStatus;
      doc["autoMode"] = autoMode;
      doc["irrigationScore"] = lastIrrigationScore;  // Add irrigation score
      doc["timestamp"] = getISOTime();
      doc["espConnected"] = espConnected;

      String jsonStr;
      serializeJson(doc, jsonStr);

      webSocket.sendTXT(jsonStr);
      Serial.println("📤 Data sent to server.");
    }

    lastSendTime = millis();
  }
}
