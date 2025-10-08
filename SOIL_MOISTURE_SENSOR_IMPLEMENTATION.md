# Soil Moisture Sensor Implementation Guide

## Overview
This document describes the implementation of the soil moisture sensor on the ESP32 with proper mapping and dashboard display.

## ESP32 Implementation

### Hardware Setup
- **Pin**: GPIO 34 (SOIL_MOISTURE_PIN)
- **Sensor Type**: Capacitive Soil Moisture Sensor
- **ADC Resolution**: 12-bit (0-4095)
- **Voltage**: 3.3V

### Analog Reading Ranges
| Soil Condition | AO Voltage | ADC Reading (ESP32, 0–4095) | Mapped % |
|----------------|------------|------------------------------|----------|
| Very wet       | ≈ 0.0–0.5 V | ≈ 0–600                     | ~80–100% |
| Moist          | ≈ 1.0–1.5 V | ≈ 1200–2000                 | ~40–70%  |
| Dry            | ≈ 2.5–3.3 V | ≈ 3000–4095                 | ~0–30%   |

### Detailed Mapping Table
| Soil condition   | Analog value (approx.) | Percent after mapping |
| ---------------- | ---------------------- | --------------------- |
| Air (no soil)    | 4000–4095              | ~0–5%                 |
| Dry soil         | 2500–3500              | ~10–30%               |
| Moist soil       | 1200–2000              | ~40–70%               |
| Wet soil / water | 200–800                | ~80–100%              |

### Code Implementation
```cpp
int soilValue = analogRead(SOIL_MOISTURE_PIN);
// Map soil moisture analog values (0-4095) to percentage (0-100%)
// 4095 (dry/air) → 0% (moisture percentage)
// 0 (wet/water) → 100% (moisture percentage)
int soilPercent = map(soilValue, 4095, 0, 0, 100);
soilPercent = constrain(soilPercent, 0, 100);

// Debug output
Serial.printf("🌱 Soil Raw: %d, Mapped: %d%%\n", soilValue, soilPercent);
```

### Data Transmission
The ESP32 now sends both values:
```json
{
  "soilMoisture": 45,        // Mapped percentage (0-100%)
  "soilMoistureRaw": 1800,   // Raw analog value (0-4095)
  // ... other sensor data
}
```

## Dashboard Implementation

### Display Features
1. **Percentage Display**: Shows the mapped moisture percentage (0-100%)
2. **Raw Value Display**: Shows the actual analog reading (0-4095)
3. **Soil Condition**: Automatically detects and displays current soil condition
4. **Color-coded Status**: Different colors for different soil conditions

### Soil Condition Detection
```javascript
// Automatic soil condition detection based on raw values
{sensorData.soilMoistureRaw >= 4000 && sensorData.soilMoistureRaw <= 4095 && "Air (no soil)"}
{sensorData.soilMoistureRaw >= 2500 && sensorData.soilMoistureRaw < 4000 && "Dry soil"}
{sensorData.soilMoistureRaw >= 1200 && sensorData.soilMoistureRaw < 2500 && "Moist soil"}
{sensorData.soilMoistureRaw >= 0 && sensorData.soilMoistureRaw < 1200 && "Wet soil/Water"}
```

### Status Mapping
| Percentage Range | Status Text | Color | Description |
|------------------|-------------|-------|-------------|
| 80-100% | Wet/Water | Blue | Very wet soil or sensor in water |
| 40-79% | Moist | Green | Optimal moisture for most plants |
| 10-39% | Dry | Yellow | Soil is dry, needs watering |
| 0-9% | Air/No Soil | Red | Sensor in air or no soil detected |

## Database Schema
Updated to include raw soil moisture values:
```javascript
soilMoisture: {
    type: Number,
    required: true,
},
soilMoistureRaw: {
    type: Number,
    required: false,
},
```

## Testing the Implementation

### Expected Behavior
1. **Air/No Soil**: Raw value ~4000-4095, Percentage ~0-5%, Status "Air/No Soil"
2. **Dry Soil**: Raw value ~2500-3500, Percentage ~10-30%, Status "Dry"
3. **Moist Soil**: Raw value ~1200-2000, Percentage ~40-70%, Status "Moist"
4. **Wet/Water**: Raw value ~200-800, Percentage ~80-100%, Status "Wet/Water"

### Debug Output
The ESP32 will print debug information:
```
🌱 Soil Raw: 1800, Mapped: 56%
```

## Irrigation Logic
The system uses soil moisture for automatic irrigation:
```cpp
bool soilDry = soilPercent < 60;  // Consider dry if less than 60%
bool highTemp = temperature > 30.0;
bool lowHumidity = humidity < 50.0;
bool noRain = rainDetected == 1;

if (autoMode && soilDry && (highTemp || lowHumidity) && noRain) {
    // Turn on pump for irrigation
    digitalWrite(RELAY_PIN, HIGH);
    pumpStatus = true;
}
```

## Usage Notes
- The percentage represents "moisture percentage" (higher = more moist)
- Raw values are more precise for calibration and debugging
- The dashboard shows both values for complete transparency
- Soil condition is automatically detected and displayed
- Color coding helps quickly identify current soil moisture levels
- The system automatically triggers irrigation when soil is dry

## Calibration
If needed, adjust the mapping ranges in the ESP32 code:
```cpp
// Custom mapping for specific soil moisture sensor characteristics
int soilPercent = map(soilValue, YOUR_MAX_DRY, YOUR_MIN_WET, 0, 100);
```

## Troubleshooting
1. **No readings**: Check sensor wiring and pin connections
2. **Inconsistent values**: Ensure stable power supply and proper sensor placement
3. **Wrong mapping**: Verify sensor characteristics and adjust ranges
4. **Dashboard not updating**: Check WebSocket connection and data transmission
5. **Always shows "Air/No Soil"**: Check if sensor is properly inserted in soil
6. **Always shows "Wet/Water"**: Check if sensor is submerged or short-circuited

## Sensor Placement Tips
- Insert the sensor at least 2-3 inches into the soil
- Avoid placing near the edge of the pot or container
- Ensure good contact between sensor and soil
- Keep the sensor away from direct water sources
- Calibrate the sensor for your specific soil type
