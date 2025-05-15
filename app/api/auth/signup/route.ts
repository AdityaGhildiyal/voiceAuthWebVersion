import { NextRequest, NextResponse } from "next/server"
import { s3 } from "@/lib/s3"
import { connectToDatabase } from "@/lib/mongodb"
import { User } from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()

    const formData = await request.formData()
    const email = formData.get("email") as string
    const phrase = formData.get("phrase") as string
    const audioSample1 = formData.get("audioSample1") as File
    const audioSample2 = formData.get("audioSample2") as File

    if (!email || !phrase || !audioSample1 || !audioSample2) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const existingUser = await User.findOne({ email }).exec()
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 })
    }

    const buffer1 = Buffer.from(await audioSample1.arrayBuffer())
    const buffer2 = Buffer.from(await audioSample2.arrayBuffer())

    const key1 = `users/${email}/sample1.webm`
    const key2 = `users/${email}/sample2.webm`

    await Promise.all([
      s3.upload({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key1,
        Body: buffer1,
        ContentType: audioSample1.type,
      }).promise(),
      s3.upload({
        Bucket: process.env.AWS_S3_BUCKET!,
        Key: key2,
        Body: buffer2,
        ContentType: audioSample2.type,
      }).promise(),
    ])

    const newUser = new User({
      email,
      phrase,
      voiceSamples: [
        { id: 1, s3Key: key1 },
        { id: 2, s3Key: key2 },
      ],
    })

    await newUser.save()

    return NextResponse.json({ message: "User created and voice samples uploaded" })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
