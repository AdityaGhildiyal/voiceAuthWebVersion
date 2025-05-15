"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldAlert, Camera, Mail, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function FailurePage() {
  const [email, setEmail] = useState<string | null>(null)
  const [captureComplete, setCaptureComplete] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [intruderImage, setIntruderImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Get the failed authentication email
    const failedEmail = localStorage.getItem("failedAuthEmail")
    setEmail(failedEmail)

    // Start camera
    startCamera()

    // Automatically capture after 1 second
    const timer = setTimeout(() => {
      captureImage()
    }, 1000)

    return () => {
      clearTimeout(timer)
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast({
        title: "Camera access denied",
        description: "Could not access camera to capture intruder image",
        variant: "destructive",
      })
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image data URL
    const imageDataUrl = canvas.toDataURL("image/png")
    setIntruderImage(imageDataUrl)

    // Stop camera
    stopCamera()

    // Set capture complete
    setCaptureComplete(true)

    // Automatically send email
    sendIntruderAlert(imageDataUrl)
  }

  const sendIntruderAlert = async (imageDataUrl: string) => {
    if (!email) return

    setIsSendingEmail(true)

    try {
      const response = await fetch("/api/auth/intruder-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          imageData: imageDataUrl,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Security alert sent",
          description: `An alert has been sent to ${email}`,
        })
      } else {
        toast({
          title: "Failed to send alert",
          description: "Could not send security alert email",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error sending intruder alert:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleReturnToLogin = () => {
    router.push("/login")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-900/50 to-slate-900">
      <Card className="w-full max-w-md border-red-500/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-500">Authentication Failed</CardTitle>
          <CardDescription>Multiple failed authentication attempts detected</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              For security reasons, this account has been temporarily locked. A security alert has been sent to the
              account owner.
            </AlertDescription>
          </Alert>

          <div className="rounded-md overflow-hidden bg-black relative">
            {!captureComplete && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <Camera className="h-8 w-8 text-red-500 animate-pulse" />
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full ${captureComplete ? "hidden" : "block"}`}
            />

            {intruderImage && (
              <div className="relative">
                <img src={intruderImage || "/placeholder.svg"} alt="Intruder" className="w-full" />
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Intruder Captured
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {email && (
            <div className="text-center text-sm">
              <p className="text-muted-foreground">Security alert sent to:</p>
              <p className="font-medium flex items-center justify-center gap-1">
                <Mail className="h-4 w-4" />
                {email}
                {isSendingEmail && <Loader2 className="h-3 w-3 animate-spin ml-2" />}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleReturnToLogin}>Return to Login</Button>
        </CardFooter>
      </Card>
    </main>
  )
}
