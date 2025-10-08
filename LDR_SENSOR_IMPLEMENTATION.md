# LDR (Light Sensor) Implementation Guide

## Overview
This document describes the implementation of the LDR (Light Dependent Resistor) sensor on the ESP32 with proper mapping and dashboard display.

## ESP32 Implementation

### Hardware Setup
- **Pin**: GPIO 32 (LDR_PIN)
- **Sensor Type**: LDR (Light Dependent Resistor)
- **ADC Resolution**: 12-bit (0-4095)
- **Voltage**: 3.3V

### Analog Reading Range
| Light Condition | `analogRead()` value | Mapped % (Darkness) |
|-----------------|---------------------|---------------------|
| Bright sunlight | ~3500–4095         | ~0–10%             |
| Indoor light    | ~2000–3000         | ~40–60%            |
| Dim / shadow    | ~1000–1500         | ~70–80%            |
| Darkness        | ~0–300             | ~90–100%           |

### Code Implementation
```cpp
int ldrValue = analogRead(LDR_PIN);
// Map LDR analog values (0-4095) to percentage (0-100%)
// 4095 (bright) → 0% (darkness percentage)
// 0 (dark) → 100% (darkness percentage)
int lightPercent = map(ldrValue, 4095, 0, 0, 100);
lightPercent = constrain(lightPercent, 0, 100);

// Debug output
Serial.printf("🔆 LDR Raw: %d, Mapped: %d%%\n", ldrValue, lightPercent);
```

### Data Transmission
The ESP32 now sends both values:
```json
{
  "lightLevel": 75,        // Mapped percentage (0-100%)
  "lightLevelRaw": 1024,   // Raw analog value (0-4095)
  // ... other sensor data
}
```

## Dashboard Implementation

### Display Features
1. **Percentage Display**: Shows the mapped darkness percentage (0-100%)
2. **Raw Value Display**: Shows the actual analog reading (0-4095)
3. **Light Condition**: Automatically detects and displays current light condition
4. **Color-coded Status**: Different colors for different light conditions

### Light Condition Detection
```javascript
// Automatic light condition detection based on raw values
{sensorData.lightLevelRaw >= 3500 && sensorData.lightLevelRaw <= 4095 && "Bright sunlight"}
{sensorData.lightLevelRaw >= 2000 && sensorData.lightLevelRaw < 3500 && "Indoor light"}
{sensorData.lightLevelRaw >= 1000 && sensorData.lightLevelRaw < 2000 && "Dim/Shadow"}
{sensorData.lightLevelRaw >= 0 && sensorData.lightLevelRaw < 1000 && "Darkness"}
```

### Status Mapping
| Percentage Range | Status Text | Color | Description |
|------------------|-------------|-------|-------------|
| 90-100% | Very Dark | Gray | Darkness conditions |
| 70-89% | Dim/Shadow | Blue | Low light conditions |
| 40-69% | Indoor Light | Green | Optimal for most plants |
| 0-39% | Bright Sunlight | Yellow | Very bright conditions |

## Database Schema
Updated to include raw light level values:
```javascript
lightLevel: {
    type: Number,
    required: true,
},
lightLevelRaw: {
    type: Number,
    required: false,
},
```

## Testing the Implementation

### Expected Behavior
1. **Bright Light**: Raw value ~3500-4095, Percentage ~0-10%, Status "Bright Sunlight"
2. **Indoor Light**: Raw value ~2000-3000, Percentage ~40-60%, Status "Indoor Light"
3. **Dim Light**: Raw value ~1000-1500, Percentage ~70-80%, Status "Dim/Shadow"
4. **Darkness**: Raw value ~0-300, Percentage ~90-100%, Status "Very Dark"

### Debug Output
The ESP32 will print debug information:
```
🔆 LDR Raw: 2048, Mapped: 50%
```

## Usage Notes
- The percentage represents "darkness percentage" (higher = darker)
- Raw values are more precise for calibration and debugging
- The dashboard shows both values for complete transparency
- Light condition is automatically detected and displayed
- Color coding helps quickly identify current light levels

## Calibration
If needed, adjust the mapping ranges in the ESP32 code:
```cpp
// Custom mapping for specific LDR characteristics
int lightPercent = map(ldrValue, YOUR_MAX_BRIGHT, YOUR_MIN_DARK, 0, 100);
```

## Troubleshooting
1. **No readings**: Check LDR wiring and pin connections
2. **Inconsistent values**: Ensure stable power supply
3. **Wrong mapping**: Verify LDR characteristics and adjust ranges
4. **Dashboard not updating**: Check WebSocket connection and data transmission
