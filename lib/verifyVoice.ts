import { decode } from "wav-decoder"
import { extractMfccFeaturesNode, calculateDtwDistance } from "./voice-processing-node"

export async function verifyVoice(storedBuffer: Buffer, uploadedBuffer: Buffer): Promise<boolean> {
  try {
    const storedAudio = await decodeWavToFloat32Array(storedBuffer)
    const uploadedAudio = await decodeWavToFloat32Array(uploadedBuffer)

    const storedMfcc = extractMfccFeaturesNode(storedAudio)
    const uploadedMfcc = extractMfccFeaturesNode(uploadedAudio)

    const distance = calculateDtwDistance(storedMfcc, uploadedMfcc)

    console.log("DTW Distance:", distance)
    return distance < 500
  } catch (err) {
    console.error("Voice verification failed:", err)
    return false
  }
}

async function decodeWavToFloat32Array(buffer: Buffer): Promise<Float32Array> {
  const audioData = await decode(buffer)
  return Float32Array.from(audioData.channelData[0])
}
