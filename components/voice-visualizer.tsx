"use client"

import { useEffect, useRef } from "react"

interface VoiceVisualizerProps {
  audioData: number[]
}

export function VoiceVisualizer({ audioData }: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const barWidth = canvas.width / audioData.length
    const barHeightMultiplier = canvas.height / 255

    ctx.fillStyle = "#10b981"

    for (let i = 0; i < audioData.length; i++) {
      const barHeight = audioData[i] * barHeightMultiplier
      const x = i * barWidth
      const y = canvas.height - barHeight

      ctx.fillRect(x, y, barWidth - 1, barHeight)
    }
  }, [audioData])

  return (
    <div className="w-full h-16 bg-slate-900/50 rounded-md overflow-hidden">
      <canvas ref={canvasRef} width={300} height={64} className="w-full h-full" />
    </div>
  )
}
