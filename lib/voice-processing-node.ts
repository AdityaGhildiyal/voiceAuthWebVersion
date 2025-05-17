import fft from "fft-js"
import { normalizeFeatures } from "./voice-processing"

// Very basic MFCC-like placeholder
export function extractMfccFeaturesNode(audio: Float32Array): number[][] {
  const frameSize = 512
  const hopSize = 256
  const frames: number[][] = []

  for (let i = 0; i + frameSize < audio.length; i += hopSize) {
    const frame = Array.from(audio.slice(i, i + frameSize))
    const fftResult = fft.fft(frame)
    const mag = fft.util.fftMag(fftResult)
    frames.push(mag.slice(0, 13)) // crude 13 feature representation
  }

  return normalizeFeatures(frames)
}
