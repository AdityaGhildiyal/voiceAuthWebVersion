// Extract MFCC features from an AudioBuffer
export async function extractMfccFeatures(audioBuffer: AudioBuffer): Promise<number[][]> {
  const audioData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate

  // Pre-emphasis filter
  const preEmphasis = 0.97
  const emphasizedData = new Float32Array(audioData.length)
  emphasizedData[0] = audioData[0]
  for (let i = 1; i < audioData.length; i++) {
    emphasizedData[i] = audioData[i] - preEmphasis * audioData[i - 1]
  }

  // Frame parameters
  const frameLength = Math.floor(0.025 * sampleRate) // 25 ms
  const frameStep = Math.floor(0.01 * sampleRate) // 10 ms
  const numFrames = Math.floor((emphasizedData.length - frameLength) / frameStep) + 1

  // Hamming window and framing
  const frames: Float32Array[] = []
  for (let i = 0; i < numFrames; i++) {
    const frame = new Float32Array(frameLength)
    for (let j = 0; j < frameLength; j++) {
      const idx = i * frameStep + j
      if (idx < emphasizedData.length) {
        const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * j) / (frameLength - 1))
        frame[j] = emphasizedData[idx] * hamming
      }
    }
    frames.push(frame)
  }

  const nfft = 512
  const powerSpectra: number[][] = frames.map(frame => {
    const padded = new Float32Array(nfft)
    padded.set(frame)

    const fft = computeFFT(padded)

    const powerSpectrum = new Array(nfft / 2 + 1)
    for (let k = 0; k < powerSpectrum.length; k++) {
      const real = fft[2 * k]
      const imag = fft[2 * k + 1]
      powerSpectrum[k] = (real * real + imag * imag) / nfft
    }
    return powerSpectrum
  })

  const numMelFilters = 26
  const melFilterbank = createMelFilterbank(numMelFilters, nfft, sampleRate)

  const melEnergies = powerSpectra.map(spectrum => {
    const melEnergy = new Array(numMelFilters)
    for (let i = 0; i < numMelFilters; i++) {
      melEnergy[i] = 0
      for (let j = 0; j < spectrum.length; j++) {
        melEnergy[i] += spectrum[j] * melFilterbank[i][j]
      }
      melEnergy[i] = Math.log(melEnergy[i] + 1e-10)
    }
    return melEnergy
  })

  // DCT for MFCCs (13 coefficients)
  const numMfccs = 13
  const mfccs = melEnergies.map(melEnergy => {
    const mfcc = new Array(numMfccs)
    for (let i = 0; i < numMfccs; i++) {
      let sum = 0
      for (let j = 0; j < numMelFilters; j++) {
        sum += melEnergy[j] * Math.cos(((i * Math.PI) / numMelFilters) * (j + 0.5))
      }
      mfcc[i] = sum
    }
    return mfcc
  })

  // Transpose and normalize (min-max)
  const transposed = transpose(mfccs)
  return normalizeFeatures(transposed)
}

// Normalize 2D array (min-max per feature)
export function normalizeFeatures(features: number[][]): number[][] {
  return features.map(feature => {
    const min = Math.min(...feature)
    const max = Math.max(...feature)
    const range = max - min + 1e-8
    return feature.map(val => (val - min) / range)
  })
}

// Dynamic Time Warping distance between two feature sets
export function calculateDtwDistance(features1: number[][], features2: number[][]): number {
  const n = features1.length
  const m = features2.length

  const costMatrix: number[][] = Array(n + 1)
    .fill(0)
    .map(() => Array(m + 1).fill(Infinity))
  costMatrix[0][0] = 0

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = euclideanDistance(features1[i - 1], features2[j - 1])
      costMatrix[i][j] =
        cost +
        Math.min(
          costMatrix[i - 1][j], // insertion
          costMatrix[i][j - 1], // deletion
          costMatrix[i - 1][j - 1] // match
        )
    }
  }
  return costMatrix[n][m]
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    sum += (a[i] - b[i]) ** 2
  }
  return Math.sqrt(sum)
}

function transpose(matrix: number[][]): number[][] {
  if (!matrix.length) return []
  const rows = matrix.length
  const cols = matrix[0].length
  const result: number[][] = Array(cols)
    .fill(0)
    .map(() => Array(rows).fill(0))

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      result[j][i] = matrix[i][j]
    }
  }
  return result
}

function createMelFilterbank(numFilters: number, nfft: number, sampleRate: number): number[][] {
  const lowFreqMel = 0
  const highFreqMel = 2595 * Math.log10(1 + sampleRate / 2 / 700)

  const melPoints: number[] = []
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints.push(lowFreqMel + ((highFreqMel - lowFreqMel) / (numFilters + 1)) * i)
  }

  const hzPoints = melPoints.map(mel => 700 * (10 ** (mel / 2595) - 1))
  const bins = hzPoints.map(hz => Math.floor(((nfft + 1) * hz) / sampleRate))

  const filterbank: number[][] = []

  for (let i = 0; i < numFilters; i++) {
    const filter = new Array(nfft / 2 + 1).fill(0)
    for (let j = bins[i]; j < bins[i + 1]; j++) {
      filter[j] = (j - bins[i]) / (bins[i + 1] - bins[i])
    }
    for (let j = bins[i + 1]; j < bins[i + 2]; j++) {
      filter[j] = (bins[i + 2] - j) / (bins[i + 2] - bins[i + 1])
    }
    filterbank.push(filter)
  }
  return filterbank
}

// Simple FFT (slow, for demo only! Replace with fft.js or similar for production)
function computeFFT(signal: Float32Array): Float32Array {
  const n = signal.length
  const result = new Float32Array(n * 2)

  for (let k = 0; k < n; k++) {
    let sumReal = 0
    let sumImag = 0
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n
      sumReal += signal[t] * Math.cos(angle)
      sumImag += signal[t] * Math.sin(angle)
    }
    result[2 * k] = sumReal
    result[2 * k + 1] = sumImag
  }
  return result
}

// Convert Blob to AudioBuffer
export async function blobToAudioBuffer(audioBlob: Blob, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await audioBlob.arrayBuffer()
  return await audioContext.decodeAudioData(arrayBuffer)
}
