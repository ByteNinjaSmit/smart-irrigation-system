import { useState, useEffect, useRef } from "react"
import {
  Thermometer,
  Droplet,
  Sprout,
  Sun,
  RefreshCw,
  Power,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Wifi,
  WifiOff,
  Microchip,
  CloudRain,
  Clock,
  Zap,
  CloudDrizzle,
  CloudOff,
  GaugeIcon,
  BarChart2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Gauge } from "@/components/sections/gauge"
import { HistoryChart } from "@/components/sections/history-chart"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"

// WebSocket API endpoint
const API = "ws://localhost:3000" // WebSocket server URL

// Initial sensor data
const initialSensorData = {
  temperature: 28.5,
  humidity: 65,
  soilMoisture: 5, // Adjusted for raw sensor value (0-1024)
  lightLevel: 90, // Adjusted for LDR sensor (0-1024)
  rainDrop: 1,
  pumpStatus: false,
  autoMode: true,
  lastUpdated: new Date().toISOString(),
  connectionStatus: true,
  espConnected: false,
}

// Sensor calibration and mapping functions
const mapSoilMoisture = (rawValue) => {
  // Map from 0-1024 to 0-100%, with 0 being wet and 1024 being dry
  return Math.max(0, Math.min(100, 100 - (rawValue / 1024) * 100))
}

const mapLightIntensity = (rawValue) => {
  // Map from 0-1024 to 0-100%, with 0 being bright and 1024 being dark
  return Math.max(0, Math.min(100, 100 - (rawValue / 1024) * 100))
}

export function DashboardContent() {
  const [sensorData, setSensorData] = useState(initialSensorData)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sensorHistory, setSensorHistory] = useState([])
  const wsRef = useRef(null)

  // Function to get status text and color based on value and ranges
  const getStatusInfo = (value, type) => {
    switch (type) {
      case "temperature":
        if (value < 18) return { text: "Low", color: "text-blue-500" }
        if (value > 35) return { text: "High", color: "text-red-500" }
        return { text: "Optimal", color: "text-green-500" }

      case "humidity":
        if (value < 30) return { text: "Low", color: "text-red-500" }
        if (value > 80) return { text: "High", color: "text-blue-500" }
        return { text: "Optimal", color: "text-green-500" }

      case "soilMoisture":
        if (value < 30) return { text: "Dry", color: "text-red-500" }
        if (value > 50) return { text: "Wet", color: "text-blue-500" }
        return { text: "Moist", color: "text-green-500" }

      case "lightIntensity":
        if (value > 10) return { text: "Low", color: "text-blue-500" }
        if (value < 10) return { text: "Very Bright", color: "text-yellow-500" }
        return { text: "Optimal", color: "text-green-500" }

      case "rainDrop":
        return value === 0
          ? { text: "No Rain", color: "text-gray-500" }
          : { text: "Rain Detected", color: "text-blue-500" }

      default:
        return { text: "Unknown", color: "text-gray-500" }
    }
  }


  // Function to get gauge color based on value and type
  const getGaugeColor = (value, type) => {
    switch (type) {
      case "temperature":
        if (value < 18) return "#3b82f6" // blue
        if (value > 30) return "#ef4444" // red
        return "#22c55e" // green

      case "humidity":
        if (value < 30) return "#ef4444" // red
        if (value > 80) return "#3b82f6" // blue
        return "#22c55e" // green

      case "soilMoisture":
        if (value < 30) return "#ef4444" // red
        if (value > 50) return "#3b82f6" // blue
        return "#22c55e" // green

      case "lightIntensity":
        if (value < 10) return "#3b82f6" // blue
        if (value > 10) return "#eab308" // yellow
        return "#22c55e" // green

      case "rainDrop":
        return value === 1 ? "#64748b" : "#3b82f6" // gray = no rain, blue = rain

      default:
        return "#64748b" // fallback: slate
    }
  }


  // WebSocket connection
  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket(API);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
        setIsConnected(true);

        // Send INIT to identify as a Frontend
        socket.send(JSON.stringify({
          type: "init-frontend",
          frontendId: "frontend-1234"  // <--- Your unique ID (maybe from login or session)
        }));
      };

      socket.onmessage = (event) => {
        console.log("📡 Sensor data received:", event.data);

        try {
          const data = JSON.parse(event.data);

          // Store the raw data in history with timestamp
          setSensorHistory((prev) => {
            const newHistory = [
              ...prev,
              {
                ...data,
                timestamp: new Date().toISOString(),
              },
            ];
            // Keep only the last 100 readings
            return newHistory.slice(-100);
          });

          // Normalize function to convert 0–1023 to 0–100%
          const normalize = (value) => Math.min(100, Math.max(0, Math.round((value / 1023) * 100)));

          const normalizeHum = (value) => Math.min(0, Math.max(50, Math.round((value / 100) * 100)));

          // Calculate normalized soil moisture (inverted logic for wet = higher %)
          const normalizedMoisture = data.soilMoisture !== undefined
            ? normalize(1023 - data.soilMoisture)
            : undefined;

          const normalizedLight = data.lightLevel !== undefined
            ? normalize(1023 - data.lightLevel)
            : undefined;

          const newHumidity = data.humidity !== undefined ? normalizeHum(50 + data.humidity) : undefined;

          // console.log("🌧️ Humidity value received:", data.humidity)
          // Update the sensor data
          setSensorData((prev) => {
            const updatedData = {
              ...prev,
              temperature: data.temperature ?? prev.temperature,
              humidity: data.humidity !== undefined ? data.humidity : prev.humidity,
              soilMoisture: data.soilMoisture ?? prev.soilMoisture,
              lightLevel: data.lightLevel !== undefined ? data.lightLevel : prev.lightLevel,
              rainDrop: data.rainDrop ?? prev.rainDrop,
              pumpStatus: data.pumpStatus ?? prev.pumpStatus,
              autoMode: data.autoMode ?? prev.autoMode,
              lastUpdated: new Date().toISOString(),
              espConnected: data.espConnected ?? prev.espConnected,
            };


            return updatedData;
          });

        } catch (error) {
          console.warn("📭 Ignored non-JSON message:", event.data);
        }
      };


      socket.onclose = () => {
        console.log("❌ Disconnected from WebSocket server");
        setIsConnected(false);
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array to run once on mount

  // console.log("🌱 Soil Moisture Sensor data (normalized %):", sensorData.soilMoisture);
  // console.log("🌱 Humidity Sensor data (normalized %):", sensorData.humidity);
  // console.log("🌱 LDR Sensor data (normalized %):", sensorData.lightLevel);

  // Function to toggle pump status
  const togglePump = () => {
    const newStatus = !sensorData.pumpStatus

    // Send command to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "command",
          command: "pump",
          value: newStatus ? "on" : "off",
        }),
      )
    }

    setSensorData((prev) => ({
      ...prev,
      pumpStatus: newStatus,
    }))
  }

  // Function to toggle auto mode
  const toggleAutoMode = () => {
    const newMode = !sensorData.autoMode

    // Send command to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "command",
          command: "autoMode",
          value: newMode ? "on" : "off",
        }),
      )
    }

    setSensorData((prev) => ({
      ...prev,
      autoMode: newMode,
    }))
  }

  // Function to refresh data
  const refreshData = () => {
    setIsLoading(true)

    // Request fresh data from server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "refresh" }))
    }

    // Set a timeout to stop loading state even if no response
    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Calculate mapped values for display
  const mappedSoilMoisture = mapSoilMoisture(sensorData.soilMoisture)
  const mappedLightIntensity = mapLightIntensity(sensorData.lightLevel)


  // Determine if irrigation is needed based on soil moisture and rain
  const irrigationNeeded = mappedSoilMoisture < 30 && sensorData.rainDrop === 1
  // const isEspConnected = sensorData.espConnected;
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mx-auto p-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Smart Irrigation System
          </h1>
          <p className="text-muted-foreground">Real-time monitoring and control for optimal plant growth</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center">
            {isConnected ? (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
              >
                <Wifi className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
              >
                <WifiOff className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
          <div className="flex items-center">
            {sensorData.espConnected ? (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
              >
                <Microchip className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
              >
                <Microchip className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(sensorData.lastUpdated)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isLoading}
            className="transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Main Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mx-auto p-4">
        {/* Temperature Card - DHT11 */}
        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 card-hover">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: getGaugeColor(sensorData.temperature, "temperature") }}
          ></div>
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Thermometer className="h-5 w-5 text-red-500" />
                Temperature (DHT11)
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 h-5 animate-pulse-glow",
                        getStatusInfo(sensorData.temperature, "temperature").text === "Optimal"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                          : getStatusInfo(sensorData.temperature, "temperature").text === "High"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
                      )}
                    >
                      {getStatusInfo(sensorData.temperature, "temperature").text}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getStatusInfo(sensorData.temperature, "temperature").text === "Optimal"
                        ? "Temperature is in the optimal range for plant growth"
                        : getStatusInfo(sensorData.temperature, "temperature").text === "High"
                          ? "Temperature is high, consider providing shade"
                          : "Temperature is low, consider protective measures"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col items-center justify-center">
              <div className="text-4xl font-bold mt-2 animate-float">{sensorData.temperature}°C</div>
              <div className="w-full h-32 mt-2">
                <Gauge
                  value={sensorData.temperature}
                  min={0}
                  max={50}
                  color={getGaugeColor(sensorData.temperature, "temperature")}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">DHT11 Sensor Range: 0-50°C (±2°C)</div>
            </div>
          </CardContent>
        </Card>

        {/* Humidity Card - DHT11 */}
        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 card-hover">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: getGaugeColor(sensorData.humidity, "humidity") }}
          ></div>
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Droplet className="h-5 w-5 text-blue-500" />
                Humidity (DHT11)
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 h-5 animate-pulse-glow",
                        getStatusInfo(sensorData.humidity, "humidity").text === "Optimal"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                          : getStatusInfo(sensorData.humidity, "humidity").text === "High"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                      )}
                    >
                      {getStatusInfo(sensorData.humidity, "humidity").text}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getStatusInfo(sensorData.humidity, "humidity").text === "Optimal"
                        ? "Humidity is in the optimal range for plant growth"
                        : getStatusInfo(sensorData.humidity, "humidity").text === "High"
                          ? "High humidity may increase disease risk"
                          : "Low humidity may cause water stress"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col items-center justify-center">
              <div className="text-4xl font-bold mt-2 animate-float">{sensorData?.humidity.toFixed(1)}</div>
              <div className="w-full h-32 mt-2">
                <Gauge
                  value={sensorData.humidity}
                  min={0}
                  max={100}
                  color={getGaugeColor(sensorData.humidity, "humidity")}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-2">DHT11 Sensor Range: 20-90% (±5%)</div>
            </div>
          </CardContent>
        </Card>

        {/* Soil Moisture Card */}
        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 card-hover">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: getGaugeColor(sensorData.soilMoisture, "soilMoisture") }}
          ></div>
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Sprout className="h-5 w-5 text-green-500" />
                Soil Moisture
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 h-5 animate-pulse-glow",
                        getStatusInfo(sensorData.soilMoisture, "soilMoisture").text === "Optimal"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                          : getStatusInfo(mappedSoilMoisture, "soilMoisture").text === "Wet"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
                      )}
                    >
                      {getStatusInfo(sensorData.soilMoisture, "soilMoisture").text}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getStatusInfo(sensorData.soilMoisture, "soilMoisture").text === "Optimal"
                        ? "Soil moisture is in the optimal range for plant growth"
                        : getStatusInfo(sensorData.soilMoisture, "soilMoisture").text === "Wet"
                          ? "Soil is too wet, reduce watering"
                          : "Soil is too dry, increase watering"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col items-center justify-center">
              <div className="text-4xl font-bold mt-2 animate-float">{sensorData.soilMoisture.toFixed(1)}%</div>
              <div className="w-full h-32 mt-2">
                <Gauge
                  value={sensorData.soilMoisture}
                  min={0}
                  max={100}
                  color={getGaugeColor(sensorData.soilMoisture, "soilMoisture")}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-muted-foreground mt-2">
                <span>Raw: {sensorData.soilMoisture}</span>
                <span>Range: 0-1024</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Light Intensity Card - LDR */}
        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 card-hover">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: getGaugeColor(sensorData.lightLevel, "lightIntensity") }}
          ></div>
          <CardHeader className="p-4 pb-0">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                Light Intensity (LDR)
              </CardTitle>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={cn(
                        "rounded-full px-2 py-0 h-5 animate-pulse-glow",
                        getStatusInfo(mappedLightIntensity, "lightIntensity").text === "Optimal"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                          : getStatusInfo(mappedLightIntensity, "lightIntensity").text === "High"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
                      )}
                    >
                      {getStatusInfo(mappedLightIntensity, "lightIntensity").text}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {getStatusInfo(mappedLightIntensity, "lightIntensity").text === "Optimal"
                        ? "Light intensity is in the optimal range for plant growth"
                        : getStatusInfo(mappedLightIntensity, "lightIntensity").text === "High"
                          ? "Light intensity is high, consider providing shade"
                          : "Light intensity is low, consider supplemental lighting"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col items-center justify-center">
              <div className="text-4xl font-bold mt-2 animate-float">{sensorData.lightLevel.toFixed(1)}%</div>
              <div className="w-full h-32 mt-2">
                <Gauge
                  value={sensorData.lightLevel}
                  min={0}
                  max={100}
                  color={getGaugeColor(sensorData.lightLevel, "lightIntensity")}
                />
              </div>
              <div className="flex justify-between w-full text-xs text-muted-foreground mt-2">
                <span>Raw: {sensorData.lightLevel}</span>
                <span>Range: 0-1024</span>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Rain Detection Card */}
        <Card className="overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 card-hover">
          <div className="h-1.5 w-full" style={{ backgroundColor: getGaugeColor(sensorData.rainDrop, "rainDrop") }}></div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="h-5 w-5 text-blue-500" />
              Rain Detection
            </CardTitle>
            <CardDescription>Raindrop sensor status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-6">
              {sensorData.rainDrop === 0 ? (
                <div className="flex flex-col items-center">
                  <CloudDrizzle className="h-24 w-24 text-blue-500 animate-pulse-glow" />
                  <div className="text-2xl font-bold mt-4 text-blue-600 dark:text-blue-400">Rain Detected</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Natural irrigation in progress. Pump operation may be paused.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <CloudOff className="h-24 w-24 text-gray-400" />
                  <div className="text-2xl font-bold mt-4 text-gray-600 dark:text-gray-400">No Rain Detected</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Monitor soil moisture levels for irrigation needs.
                  </div>
                </div>
              )}
              <div className="mt-6 text-xs text-muted-foreground">
                Raw Value: {sensorData.rainDrop} (1 = No Rain, 0 = Rain Detected)
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Data Logs / History */}
      <Card className="lg:col-span-2 border-none shadow-md bg-white dark:bg-gray-900 card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Data History
          </CardTitle>
          <CardDescription>View historical data trends</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="24h">
            <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger
                value="24h"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                24 Hours
              </TabsTrigger>
              <TabsTrigger
                value="7d"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                7 Days
              </TabsTrigger>
              <TabsTrigger
                value="30d"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                30 Days
              </TabsTrigger>
            </TabsList>
            <TabsContent value="24h" className="h-[300px]">
              <HistoryChart type="24h" />
            </TabsContent>
            <TabsContent value="7d" className="h-[300px]">
              <HistoryChart type="7d" />
            </TabsContent>
            <TabsContent value="30d" className="h-[300px]">
              <HistoryChart type="30d" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {/* Control Panel and Data Logs */}
      {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"> */}
      {/* Control Panel */}
      <Card className="lg:col-span-1 border-none shadow-md bg-white dark:bg-gray-900 card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            Control Panel
          </CardTitle>
          <CardDescription>Manage your irrigation system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  sensorData.pumpStatus
                    ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
                )}
              >
                <Power className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Pump Status</div>
                <div className="text-sm text-muted-foreground">{sensorData.pumpStatus ? "Active" : "Inactive"}</div>
              </div>
            </div>
            <Switch
              checked={sensorData.pumpStatus}
              onCheckedChange={togglePump}
              disabled={sensorData.autoMode || sensorData.rainDrop === 1}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  sensorData.autoMode
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500",
                )}
              >
                {sensorData.autoMode ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-medium">Auto Mode</div>
                <div className="text-sm text-muted-foreground">{sensorData.autoMode ? "Enabled" : "Disabled"}</div>
              </div>
            </div>
            <Switch
              checked={sensorData.autoMode}
              onCheckedChange={toggleAutoMode}
              className="data-[state=checked]:bg-blue-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <GaugeIcon className="h-5 w-5 text-purple-500" />
              <div className="font-medium">Sensor Status</div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Soil Moisture</span>
                <span className="font-medium">{sensorData.soilMoisture.toFixed(1)}%</span>
              </div>
              <Progress value={sensorData.soilMoisture} className="h-2" />

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Light Level</span>
                <span className="font-medium">{sensorData.lightLevel.toFixed(1)}%</span>
              </div>
              <Progress value={sensorData.lightLevel} className="h-2" />
            </div>
          </div>

          {sensorData.autoMode && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Auto Mode Enabled</AlertTitle>
              <AlertDescription>
                The system will automatically control the pump based on soil moisture levels and rain detection.
              </AlertDescription>
            </Alert>
          )}

          {irrigationNeeded && (
            <Alert className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 animate-pulse-glow">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Irrigation Needed</AlertTitle>
              <AlertDescription>
                Soil moisture is below optimal levels and no rain is detected. Consider watering your plants.
              </AlertDescription>
            </Alert>
          )}

          {sensorData.rainDrop === 0 && (
            <Alert className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
              <CloudRain className="h-4 w-4" />
              <AlertTitle>Rain Detected</AlertTitle>
              <AlertDescription>Natural irrigation is occurring. Automatic watering is paused.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>


      {/* </div> */}

      {/* System Status */}
      <Card className="border-none shadow-md bg-white dark:bg-gray-900 card-hover">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            System Status
          </CardTitle>
          <CardDescription>View the status of your system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  isConnected
                    ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
                )}
              >
                {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              </div>
              <div className="text-sm">
                <div className="font-medium">WebSocket</div>
                <div className="text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 flex items-center justify-center">
                <Thermometer className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">DHT11 Sensor</div>
                <div className="text-muted-foreground">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 flex items-center justify-center">
                <Sprout className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Soil Sensor</div>
                <div className="text-muted-foreground">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 flex items-center justify-center">
                <CloudRain className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Rain Sensor</div>
                <div className="text-muted-foreground">Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400 flex items-center justify-center">
                <Power className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <div className="font-medium">Pump</div>
                <div className="text-muted-foreground">Operational</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground border-t pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last system check: {formatDate(sensorData.lastUpdated)}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
