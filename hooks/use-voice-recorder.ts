import { useCallback, useState } from "react"

interface UseVoiceRecorderOptions {
  maxDuration?: number // in milliseconds
  onComplete?: (audioBlob: Blob) => void
}

interface UseVoiceRecorderReturn {
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  error: string | null
  audioUrl: string | null
  audioBlob: Blob | null
}

export function useVoiceRecorder({
  maxDuration = 5000,
  onComplete,
}: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const startRecording = useCallback(async () => {
    setError(null)
    setAudioUrl(null)
    setAudioBlob(null)

    try {
      if (typeof window === "undefined" || !navigator.mediaDevices) {
        throw new Error("Voice recording is only supported in browsers")
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        if (onComplete) onComplete(blob)
        stream.getTracks().forEach((track) => track.stop()) // cleanup
      }

      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)

      // Auto-stop after maxDuration
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop()
        }
      }, maxDuration)
    } catch (err: any) {
      setError(err.message || "Failed to start recording")
      setIsRecording(false)
    }
  }, [maxDuration, onComplete])

  const stopRecording = useCallback(() => {
    if (!isRecording || !mediaRecorder) return
    mediaRecorder.stop()
    setIsRecording(false)
  }, [isRecording, mediaRecorder])

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    audioUrl,
    audioBlob,
  }
}
