import { extractMfccFeatures, normalizeFeatures, calculateDtwDistance } from "./voice-processing"

export async function verifyVoice(storedBuffer: Buffer, uploadedBuffer: Buffer): Promise<boolean> {
  try {
    const context = new (globalThis.AudioContext || (globalThis as any).webkitAudioContext)()

    const storedAudio = await decodeAudioBuffer(storedBuffer, context)
    const uploadedAudio = await decodeAudioBuffer(uploadedBuffer, context)

    const storedMfcc = await extractMfccFeatures(storedAudio)
    const uploadedMfcc = await extractMfccFeatures(uploadedAudio)

    const storedNorm = normalizeFeatures(storedMfcc)
    const uploadedNorm = normalizeFeatures(uploadedMfcc)

    const distance = calculateDtwDistance(storedNorm, uploadedNorm)

    console.log("DTW Voice Match Distance:", distance)
    return distance < 500 
  } catch (error) {
    console.error("Voice verification failed:", error)
    return false
  }
}

async function decodeAudioBuffer(buffer: Buffer, context: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )
  return await context.decodeAudioData(arrayBuffer)
}
