"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, Square, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VoiceVisualizer } from "@/components/voice-visualizer"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState("")
  const [audioData, setAudioData] = useState<number[]>([])
  const [attempts, setAttempts] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!audioBlob) {
      toast({
        title: "Voice recording required",
        description: "Please record your authentication phrase",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create a FormData object to send the audio blob
      const formData = new FormData()
      formData.append("email", email)
      formData.append("audioSample", audioBlob, "voice-auth.wav")
      formData.append("attempt", attempts.toString())

      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()

        // Store authenticated user in localStorage
        localStorage.setItem("authenticatedUser", JSON.stringify({ email }))

        toast({
          title: "Login successful",
          description: "Voice authentication verified",
        })

        router.push("/success")
      } else {
        const data = await response.json()

        // Increment attempts
        const newAttempts = attempts + 1
        setAttempts(newAttempts)

        if (newAttempts >= 3) {
          // After 3 failed attempts, redirect to failure page
          localStorage.setItem("failedAuthEmail", email)
          router.push("/failure")
        } else {
          toast({
            title: "Authentication failed",
            description: `${data.message || "Voice verification failed"} (Attempt ${newAttempts}/3)`,
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startRecording = async () => {
    try {
      setRecordingStatus("Requesting microphone access...")

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Set up audio context and analyzer for visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioContextRef.current = audioContext

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      // Update visualization data
      const updateVisualization = () => {
        if (!isRecording) return

        analyser.getByteFrequencyData(dataArray)
        setAudioData([...dataArray])
        requestAnimationFrame(updateVisualization)
      }

      updateVisualization()

      // Reset state
      setIsRecording(true)
      setRecordingProgress(0)
      setAudioBlob(null)
      audioChunksRef.current = []
      setRecordingStatus("Recording your voice...")

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      mediaRecorderRef.current = mediaRecorder

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsRecording(false)
        setIsProcessing(true)
        setRecordingStatus("Processing audio...")

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(audioBlob)

        try {
          // Extract features from the audio for verification
          const audioBuffer = await blobToAudioBuffer(audioBlob, audioContext)

          // In a real app, we would extract MFCC features here
          // const features = await extractMfccFeatures(audioBuffer)

          setIsProcessing(false)
          setRecordingStatus("Voice sample recorded")
          toast({
            title: "Recording complete",
            description: "Your voice sample is ready for authentication",
          })
        } catch (error) {
          console.error("Error processing audio:", error)
          setIsProcessing(false)
          setRecordingStatus("Error processing audio")
          toast({
            title: "Processing error",
            description: "There was an error processing your voice sample",
            variant: "destructive",
          })
        }
      }

      // Start recording
      mediaRecorder.start()

      // Set up progress bar
      const recordingDuration = 5000 // 5 seconds
      const updateInterval = 100 // Update every 100ms
      let elapsed = 0

      progressIntervalRef.current = setInterval(() => {
        elapsed += updateInterval
        const progress = Math.min((elapsed / recordingDuration) * 100, 100)
        setRecordingProgress(progress)

        if (elapsed >= recordingDuration && mediaRecorderRef.current?.state === "recording") {
          clearInterval(progressIntervalRef.current!)
          mediaRecorderRef.current.stop()
        }
      }, updateInterval)
    } catch (error) {
      console.error("Error starting recording:", error)
      setIsRecording(false)
      setRecordingStatus("")
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice authentication",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      mediaRecorderRef.current.stop()
    }
  }

  // Helper function to convert blob to AudioBuffer
  const blobToAudioBuffer = async (blob: Blob, audioContext: AudioContext): Promise<AudioBuffer> => {
    const arrayBuffer = await blob.arrayBuffer()
    return await audioContext.decodeAudioData(arrayBuffer)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Authenticate with your voice</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Voice Authentication</Label>
              <div className="flex flex-col gap-3 p-4 border rounded-md bg-slate-950/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Speak your authentication phrase</span>
                  <div className="flex gap-2">
                    {isRecording ? (
                      <Button type="button" size="sm" variant="destructive" onClick={stopRecording}>
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={startRecording}
                        disabled={isProcessing}
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        Record
                      </Button>
                    )}
                  </div>
                </div>

                {isRecording && audioData.length > 0 && <VoiceVisualizer audioData={audioData} />}

                {(isRecording || isProcessing) && (
                  <div className="space-y-1">
                    <Progress value={isProcessing ? 100 : recordingProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {isProcessing ? "Processing..." : "Recording in progress..."}
                    </p>
                  </div>
                )}

                {recordingStatus && !isRecording && !isProcessing && (
                  <Alert variant={audioBlob ? "default" : "destructive"} className="py-2">
                    <AlertDescription className="text-xs">{recordingStatus}</AlertDescription>
                  </Alert>
                )}

                {!isRecording && !isProcessing && !audioBlob && (
                  <p className="text-xs text-muted-foreground">
                    Click the Record button and speak your authentication phrase clearly
                  </p>
                )}
              </div>

              {attempts > 0 && (
                <p className="text-xs text-amber-500">
                  Failed attempts: {attempts}/3. After 3 failed attempts, security measures will be activated.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || isRecording || isProcessing}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Login with Voice"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
