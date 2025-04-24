import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export function HistoryChart({ type }) {
  const [data, setData] = useState([])

  useEffect(() => {
    // Generate mock data based on the selected time period
    const generateMockData = () => {
      const mockData = []
      let dataPoints = 0
      let timeFormat = ""

      switch (type) {
        case "24h":
          dataPoints = 24
          timeFormat = "HH:00"
          break
        case "7d":
          dataPoints = 7
          timeFormat = "ddd"
          break
        case "30d":
          dataPoints = 30
          timeFormat = "MMM D"
          break
      }

      const now = new Date()

      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date()

        if (type === "24h") {
          date.setHours(now.getHours() - i)
          date.setMinutes(0)
          date.setSeconds(0)
        } else if (type === "7d") {
          date.setDate(now.getDate() - i)
        } else if (type === "30d") {
          date.setDate(now.getDate() - i)
        }

        // Generate random values with some consistency
        const baseTemp = 25 + Math.sin((i / (dataPoints / 2)) * Math.PI) * 5
        const baseHumidity = 60 + Math.sin((i / (dataPoints / 3)) * Math.PI) * 15
        const baseMoisture = 50 + Math.sin((i / (dataPoints / 4)) * Math.PI) * 20

        mockData.push({
          time: date.toLocaleString("en-US", {
            hour: "numeric",
            hour12: true,
            month: "short",
            day: "numeric",
            weekday: "short",
          }),
          temperature: Math.round((baseTemp + (Math.random() * 2 - 1)) * 10) / 10,
          humidity: Math.round((baseHumidity + (Math.random() * 5 - 2.5)) * 10) / 10,
          soilMoisture: Math.round((baseMoisture + (Math.random() * 8 - 4)) * 10) / 10,
        })
      }

      return mockData
    }

    setData(generateMockData())
  }, [type])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 12 }} interval={type === "24h" ? 3 : 0} />
        <YAxis yAxisId="left" orientation="left" domain={[0, 50]} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="temperature"
          name="Temperature (°C)"
          stroke="#ef4444"
          activeDot={{ r: 8 }}
        />
        <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" />
        <Line yAxisId="right" type="monotone" dataKey="soilMoisture" name="Soil Moisture (%)" stroke="#22c55e" />
      </LineChart>
    </ResponsiveContainer>
  )
}
