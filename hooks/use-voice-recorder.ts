"use client"

import { useState, useEffect, useCallback } from "react"

interface UseVoiceRecorderProps {
  onComplete?: (audioBlob: Blob) => void
  maxDuration?: number
}

interface UseVoiceRecorderReturn {
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  error: string | null
  audioUrl: string | null
}

export function useVoiceRecorder({
  onComplete,
  maxDuration = 5000,
}: UseVoiceRecorderProps = {}): UseVoiceRecorderReturn {
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  const startRecording = useCallback(async () => {
    setAudioChunks([])
    setAudioUrl(null)
    setError(null)

    try {
      if (typeof window === "undefined") {
        throw new Error("Voice recording is only available in browser environments")
      }

      setIsRecording(true)

      // In a real app, we would use the MediaRecorder API:
      // const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // const recorder = new MediaRecorder(stream)
      // recorder.ondataavailable = (e) => setAudioChunks(chunks => [...chunks, e.data])
      // recorder.start()
      // setMediaRecorder(recorder)

      // Auto-stop after maxDuration
      setTimeout(() => {
        if (isRecording) {
          stopRecording()
        }
      }, maxDuration)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording")
      setIsRecording(false)
    }
  }, [maxDuration, isRecording])

  const stopRecording = useCallback(() => {
    if (!isRecording) return

    // In a real app:
    // mediaRecorder?.stop()

    // Simulate recording stop and data processing
    setIsRecording(false)

    // Create a mock audio blob
    const mockBlob = new Blob(["mock audio data"], { type: "audio/wav" })
    setAudioChunks([mockBlob])

    // Create a URL for the blob
    const url = URL.createObjectURL(mockBlob)
    setAudioUrl(url)

    // Call the onComplete callback
    if (onComplete) {
      onComplete(mockBlob)
    }
  }, [isRecording, onComplete])

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    audioUrl,
  }
}
