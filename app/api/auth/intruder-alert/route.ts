import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, imageData, timestamp } = await request.json()

    if (!email || !imageData) {
      return NextResponse.json({ message: "Email and image data are required" }, { status: 400 })
    }

    // In a real app, you would:
    // 1. Save the intruder image to a storage service
    // 2. Send an email with the image attached
    // 3. Log the security incident

    // For this demo, we'll simulate sending an email
    console.log(`[SECURITY ALERT] Intruder detected for account: ${email} at ${timestamp}`)
    console.log(`Image data length: ${imageData.length} characters`)

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Return success response
    return NextResponse.json({
      message: "Security alert sent successfully",
    })
  } catch (error) {
    console.error("Intruder alert error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
