import { useEffect, useState, useRef } from "react";

const API = "ws://localhost:3000"; // WebSocket server URL

function App() {
  const [sensorData, setSensorData] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null); // Use a ref to persist WebSocket instance across re-renders

  useEffect(() => {
    const connectWebSocket = () => {
      const socket = new WebSocket(API);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
        setIsConnected(true);
        socket.send("Hello, server!");
      };

      socket.onmessage = (event) => {
        console.log("📡 Sensor data received:", event.data);
        setSensorData(event.data);
      };

      socket.onclose = () => {
        console.log("❌ Disconnected from WebSocket server");
        setIsConnected(false);
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    // Cleanup WebSocket on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // Empty dependency array to run once on mount

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Smart Irrigation Dashboard</h1>
      <p className="text-lg">🌱 Latest Sensor Data:</p>
      <pre className="bg-gray-800 p-4 rounded mt-2 text-green-300">{sensorData || "No data received yet."}</pre>

      <div className="mt-4">
        {isConnected ? (
          <p className="text-green-500">✅ WebSocket is connected.</p>
        ) : (
          <p className="text-red-500">❌ WebSocket is disconnected.</p>
        )}
      </div>
    </div>
  );
}

export default App;
