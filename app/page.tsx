import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Voice Authentication App</CardTitle>
          <CardDescription>Secure login with voice recognition</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Secure your account with voice biometrics
        </CardFooter>
      </Card>
    </main>
  )
}
