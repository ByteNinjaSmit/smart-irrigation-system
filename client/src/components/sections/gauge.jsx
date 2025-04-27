import { useEffect, useRef } from "react"


export function Gauge({ value, min, max, color }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // console.log("Gauge props:", { value, min, max, color });

    if (isNaN(min) || isNaN(max) || isNaN(value)) {
      console.warn("Gauge received invalid numeric props:", { min, max, value });
      return null;
    }

    // Set canvas dimensions
    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate gauge parameters
    const centerX = width / 2
    const centerY = height * 0.8 // Position center point near bottom
    const radius = (Math.min(width, height) * 0.8) / 2

    // Calculate start and end angles (in radians)
    const startAngle = Math.PI * 0.8 // 144 degrees
    const endAngle = Math.PI * 0.2 // 36 degrees
    const fullAngleRange = 2 * Math.PI - (startAngle - endAngle)

    // Calculate value as percentage of range
    const percentage = Math.max(0, Math.min(1, (value - min) / (max - min)))

    // Calculate value angle
    const valueAngle = startAngle - percentage * fullAngleRange

    // Draw background arc
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, true)
    ctx.lineWidth = 10
    ctx.strokeStyle = "#e5e7eb" // Light gray
    ctx.stroke()

    // Draw value arc
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, startAngle, valueAngle, true)
    ctx.lineWidth = 10
    ctx.strokeStyle = color
    ctx.stroke()

    // Draw center point
    ctx.beginPath()
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI)
    ctx.fillStyle = "#64748b"
    ctx.fill()

    // Draw needle
    ctx.beginPath()
    ctx.moveTo(centerX, centerY)
    const needleLength = radius * 0.9
    const needleX = centerX + needleLength * Math.cos(valueAngle)
    const needleY = centerY + needleLength * Math.sin(valueAngle)
    ctx.lineTo(needleX, needleY)
    ctx.lineWidth = 2
    ctx.strokeStyle = "#64748b"
    ctx.stroke()

    // Draw value text
    ctx.font = "bold 16px sans-serif"
    ctx.fillStyle = "#64748b"
    ctx.textAlign = "center"
    ctx.fillText(value.toString(), centerX, centerY + radius * 0.5)

    // Draw min and max labels
    ctx.font = "12px sans-serif"
    ctx.fillStyle = "#94a3b8"

    // Min label (left)
    const minX = centerX + radius * Math.cos(startAngle) * 1.2
    const minY = centerY + radius * Math.sin(startAngle) * 1.2
    ctx.textAlign = "right"
    ctx.fillText(min.toString(), minX, minY)

    // Max label (right)
    const maxX = centerX + radius * Math.cos(endAngle) * 1.2
    const maxY = centerY + radius * Math.sin(endAngle) * 1.2
    ctx.textAlign = "left"
    ctx.fillText(max.toString(), maxX, maxY)
  }, [value, min, max, color])

  return <canvas ref={canvasRef} width={200} height={150} className="w-full h-full" />
}
