import axios from "axios";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function HistoryChart({ type }) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoryData = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/api/data/history?type=${type}`);
        setData(response.data); // Expecting { history: [...] } from backend
        // console.log("Data Charts: ", response.data);
      } catch (error) {
        console.error("Error fetching history data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoryData();
  }, [type]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-gray-500">Loading chart...</p>
      </div>
    );
  }

  // Custom Tooltip to show date and time only on hover
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      
      return (
        <div className="bg-white border p-2 rounded shadow-lg">
          <p className="font-semibold">{`Time: ${label}`}</p>
          <p>{`Temperature: ${payload[0].value} °C`}</p>
          <p>{`Humidity: ${payload[1].value} %`}</p>
          <p>{`Soil Moisture: ${payload[2].value} %`}</p>
        </div>
      );
    }

    return null;
  };

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
        {/* Remove XAxis time below chart */}
        <XAxis dataKey="time" tick={false} />
        <YAxis yAxisId="left" orientation="left" domain={[0, 50]} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="temperature"
          name="Temperature (°C)"
          stroke="#ef4444"
          activeDot={{ r: 8 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="humidity"
          name="Humidity (%)"
          stroke="#3b82f6"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="soilMoisture"
          name="Soil Moisture (%)"
          stroke="#22c55e"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
