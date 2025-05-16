// lib/s3.ts (v3 version)

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export const uploadToS3 = async (params: {
  Bucket: string
  Key: string
  Body: Buffer
  ContentType: string
}) => {
  const command = new PutObjectCommand(params)
  return await s3.send(command)
}

export const getFromS3 = async (params: {
  Bucket: string
  Key: string
}) => {
  const command = new GetObjectCommand(params)
  return await s3.send(command)
}
