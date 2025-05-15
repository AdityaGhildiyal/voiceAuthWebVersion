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
import { speechToText } from "@/lib/voice-processing"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [phrase, setPhrase] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recordingProgress, setRecordingProgress] = useState(0)
  const [recordingStep, setRecordingStep] = useState(0)
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState("")
  const [audioData, setAudioData] = useState<number[]>([])
  const [isExtractingPhrase, setIsExtractingPhrase] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  // Cleanup function
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (audioBlobs.length < 2) {
      toast({
        title: "Voice samples required",
        description: "Please record both voice samples for authentication",
        variant: "destructive",
      })
      return
    }

    if (!phrase) {
      toast({
        title: "Authentication phrase required",
        description: "Please record your voice to extract an authentication phrase",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      // Create a FormData object to send the audio blobs
      const formData = new FormData()
      formData.append("email", email)
      formData.append("phrase", phrase)
      formData.append("audioSample1", audioBlobs[0], "voice-sample-1.webm")
      formData.append("audioSample2", audioBlobs[1], "voice-sample-2.webm")

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Account created",
          description: "Your voice authentication is set up",
        })
        router.push("/login")
      } else {
        const data = await response.json()
        toast({
          title: "Signup failed",
          description: data.message || "Could not create account",
          variant: "destructive",
        })
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

      // Reset state for this recording
      setIsRecording(true)
      setRecordingProgress(0)
      audioChunksRef.current = []
      setRecordingStatus(`Recording sample ${recordingStep + 1}/2...`)

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

        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })

        // Add to our collection of blobs
        setAudioBlobs((prev) => [...prev, audioBlob])

        // If this is the first recording, extract the phrase
        if (recordingStep === 0) {
          try {
            setIsExtractingPhrase(true)
            setRecordingStatus("Extracting authentication phrase...")

            // Use speech-to-text to extract the phrase
            const extractedPhrase = await speechToText(audioBlob)

            if (extractedPhrase && extractedPhrase.trim() !== "") {
              setPhrase(extractedPhrase.trim())
              toast({
                title: "Phrase extracted",
                description: `Your authentication phrase: "${extractedPhrase.trim()}"`,
              })
            } else {
              toast({
                title: "Phrase extraction failed",
                description: "Could not extract a phrase from your recording. Please speak clearly.",
                variant: "destructive",
              })
            }
            setIsExtractingPhrase(false)
          } catch (error) {
            console.error("Error extracting phrase:", error)
            setIsExtractingPhrase(false)
            toast({
              title: "Phrase extraction error",
              description: "There was an error processing your speech",
              variant: "destructive",
            })
          }
        }

        // Increment recording step
        setRecordingStep((prev) => prev + 1)

        // Finish processing
        setIsProcessing(false)
        setRecordingStatus(`Sample ${recordingStep + 1}/2 recorded successfully`)
        toast({
          title: "Recording complete",
          description:
            recordingStep < 1
              ? "Please record one more sample for better accuracy"
              : "Voice samples recorded successfully!",
        })
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Sign Up</CardTitle>
          <CardDescription>Create an account with voice authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
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
              <div className="flex justify-between items-center">
                <Label>Authentication Phrase</Label>
                <span className="text-xs text-muted-foreground">{recordingStep}/2 samples</span>
              </div>

              {phrase ? (
                <Alert className="py-2 bg-slate-950/50">
                  <AlertDescription className="text-sm font-medium">"{phrase}"</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">
                    {isExtractingPhrase
                      ? "Extracting phrase from your recording..."
                      : "Record your voice to extract authentication phrase"}
                  </AlertDescription>
                </Alert>
              )}

              <p className="text-xs text-muted-foreground">
                Your authentication phrase will be extracted from your first voice recording
              </p>
            </div>

            <div className="space-y-2">
              <Label>Voice Samples</Label>
              <div className="flex flex-col gap-3 p-4 border rounded-md bg-slate-950/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {recordingStep < 2 ? `Record sample ${recordingStep + 1}/2` : "Voice samples complete"}
                  </span>
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
                        disabled={isProcessing || recordingStep >= 2 || isExtractingPhrase}
                      >
                        <Mic className="h-4 w-4 mr-1" />
                        Record
                      </Button>
                    )}
                  </div>
                </div>

                {isRecording && audioData.length > 0 && <VoiceVisualizer audioData={audioData} />}

                {(isRecording || isProcessing || isExtractingPhrase) && (
                  <div className="space-y-1">
                    <Progress value={isProcessing || isExtractingPhrase ? 100 : recordingProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      {isProcessing
                        ? "Processing..."
                        : isExtractingPhrase
                          ? "Extracting phrase..."
                          : "Recording in progress..."}
                    </p>
                  </div>
                )}

                {recordingStatus && !isRecording && !isProcessing && !isExtractingPhrase && (
                  <Alert variant="default" className="py-2">
                    <AlertDescription className="text-xs">{recordingStatus}</AlertDescription>
                  </Alert>
                )}

                {!isRecording && !isProcessing && !isExtractingPhrase && recordingStep < 2 && !recordingStatus && (
                  <p className="text-xs text-muted-foreground">
                    Click the Record button and speak your authentication phrase clearly
                  </p>
                )}

                {recordingStep >= 2 && (
                  <p className="text-xs text-green-500 font-medium">✓ Both voice samples recorded successfully</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isRecording || isProcessing || isExtractingPhrase || recordingStep < 2 || !phrase}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  )
}
