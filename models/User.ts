import mongoose, { Schema, Document, Model } from "mongoose"

export interface IUser extends Document {
  email: string
  phrase: string
  voiceSamples: {
    id: number
    s3Key: string
  }[]
}

const VoiceSampleSchema = new Schema({
  id: { type: Number, required: true },
  s3Key: { type: String, required: true },
})

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  phrase: { type: String, required: true },
  voiceSamples: { type: [VoiceSampleSchema], required: true },
})

export const User: Model<IUser> = mongoose.models.User || mongoose.model("User", UserSchema)
