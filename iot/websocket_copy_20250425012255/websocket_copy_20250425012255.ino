#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <DHT.h>

// WiFi credentials
const char* ssid = "IOT";
const char* password = "1234567890";

// WebSocket server
const char* websocket_server = "192.168.146.112";
const uint16_t websocket_port = 3000;

// DHT22 setup
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Sensor pins
#define LDR_PIN A0 // or use D6 if your library supports it
#define SOIL_MOISTURE_PIN A0
#define RAIN_SENSOR_PIN 5
#define LED_PIN LED_BUILTIN  // Usually GPIO2 on ESP8266

// WebSocket
WebSocketsClient webSocket;
unsigned long lastSendTime = 0;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.println("Connected to WebSocket server");
      break;
    case WStype_TEXT:
      Serial.printf("Received from server: %s\n", payload);
      break;
    case WStype_DISCONNECTED:
      Serial.println("WebSocket disconnected");
      break;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(RAIN_SENSOR_PIN, INPUT);

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
}

void loop() {
  webSocket.loop();

  if (millis() - lastSendTime > 1000) {
    float temperature = dht.readTemperature(false);
    float humidity = dht.readHumidity();

    // float tempnew = (((temperature * 5.0) / 1024.0)-0.5)*100;
  // light = (lightValue * 5.0) / 1024.0;
    // humidity = (humidity * 5.0) / 1024.0;

    Serial.print("Temp: ");
    Serial.print(temperature);
    Serial.print(" °C | Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Failed to read from DHT sensor!");
      return;
    }

    // temperature = constrain(temperature, -20.0, 60.0);
    humidity = constrain(humidity, 0.0, 100.0);

    int ldrValue = analogRead(LDR_PIN);
    int soilMoistureStatus = analogRead(SOIL_MOISTURE_PIN);
    int rainDetected = digitalRead(RAIN_SENSOR_PIN);
    Serial.print("moistureLevel: ");
    Serial.print(soilMoistureStatus);

    Serial.println();

    int lightLevel = map(ldrValue, 0, 1023, 10, 0);  // 10 = dark, 0 = bright
    int moistureLevel = soilMoistureStatus == 0 ? 5 : 2;



    if ((temperature > 30 || lightLevel < 2) && moistureLevel < 4 && rainDetected == 1) {
      digitalWrite(LED_PIN, LOW);
      Serial.println("Turning on LED: HOT/Sunny/Dry and No Rain");
    } else {
      digitalWrite(LED_PIN, HIGH);
      Serial.println("Turning off LED");
    }

    String data = "{";
    data += "\"temperature\":" + String(temperature, 1);
    data += ",\"humidity\":" + String(humidity);
    data += ",\"lightLevel\":" + String(ldrValue);
    data += ",\"soilMoisture\":" + String(soilMoistureStatus);
    data += ",\"rainDrop\":" + String(rainDetected);
    data += "}";

    webSocket.sendTXT(data);
    Serial.println("Sent: " + data);

    lastSendTime = millis();
  }
}
