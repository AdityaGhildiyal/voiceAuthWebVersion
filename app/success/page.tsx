"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function SuccessPage() {
  const [email, setEmail] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Get the authenticated user's email from localStorage
    const userData = localStorage.getItem("authenticatedUser")
    if (userData) {
      try {
        const { email } = JSON.parse(userData)
        setEmail(email)
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    } else {
      // If no authenticated user, redirect to login
      router.push("/login")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("authenticatedUser")
    router.push("/login")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Login Successful</CardTitle>
          <CardDescription>{email ? `Welcome back, ${email}` : "You have successfully logged in"}</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Your voice authentication was verified successfully.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={handleLogout}>Logout</Button>
        </CardFooter>
      </Card>
    </main>
  )
}
