import { type NextRequest, NextResponse } from "next/server"
import { getAllUsers } from "@/lib/auth-utils"

export async function GET(request: NextRequest) {
  try {
    // Get all users (in a real app, you'd add authentication to this endpoint)
    const users = getAllUsers()

    // Remove sensitive data before returning
    const sanitizedUsers = users.map((user) => ({
      email: user.email,
      hasSamples: user.voiceSamples.length > 0,
    }))

    return NextResponse.json({ users: sanitizedUsers })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
