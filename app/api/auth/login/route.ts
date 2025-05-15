import { NextRequest, NextResponse } from "next/server"
import { s3 } from "@/lib/s3"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"
import { verifyVoice } from "@/lib/verifyVoice"

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()

    const formData = await request.formData()
    const email = formData.get("email") as string
    const audioSample = formData.get("audioSample") as File
    const attempt = Number.parseInt((formData.get("attempt") as string) || "0")

    if (!email || !audioSample) {
      return NextResponse.json({ message: "Email and voice sample are required" }, { status: 400 })
    }

    const user = await User.findOne({ email }).exec()
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 })
    }

    const s3Key = user.voiceSamples?.[0]?.s3Key
    if (!s3Key) {
      return NextResponse.json({ message: "No stored voice sample found" }, { status: 400 })
    }

    const storedObject = await s3.getObject({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: s3Key,
    }).promise()

    const storedBuffer = storedObject.Body as Buffer
    const uploadedBuffer = Buffer.from(await audioSample.arrayBuffer())

    const isValid = await verifyVoice(storedBuffer, uploadedBuffer)

    if (!isValid) {
      return NextResponse.json(
        { message: "Voice authentication failed", attempts: attempt + 1 },
        { status: 401 }
      )
    }

    return NextResponse.json({
      message: "Login successful",
      user: { email },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
