// ── Free Client-Side Facial Analysis & Verification Engine ──────────

export function captureSnapshot(videoElement) {
  if (!videoElement) return null
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  
  const vWidth = videoElement.videoWidth || 640
  const vHeight = videoElement.videoHeight || 640
  const minDim = Math.min(vWidth, vHeight)
  const startX = (vWidth - minDim) / 2
  const startY = (vHeight - minDim) / 2
  
  try {
    ctx.drawImage(videoElement, startX, startY, minDim, minDim, 0, 0, 320, 320)
  } catch (e) {
    ctx.drawImage(videoElement, 0, 0, 320, 320)
  }
  return canvas.toDataURL('image/jpeg', 0.8) // Compressed JPEG
}

// Generate facial descriptor vector (normalized 64-region spatial feature vector)
export function generateFaceDescriptor(imageDataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageDataUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 128
      canvas.height = 128
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 128, 128)
      const imgData = ctx.getImageData(0, 0, 128, 128).data
      
      const width = 128
      const height = 128
      const cellW = 16 // 128 / 8
      const cellH = 16
      const rawFeatures = []

      // Extract average luminance across an 8x8 grid covering the whole face (64 spatial cells)
      for (let gy = 0; gy < 8; gy++) {
        for (let gx = 0; gx < 8; gx++) {
          let sumLum = 0
          let count = 0
          for (let y = gy * cellH; y < (gy + 1) * cellH; y++) {
            for (let x = gx * cellW; x < (gx + 1) * cellW; x++) {
              const idx = (y * width + x) * 4
              const r = imgData[idx]
              const g = imgData[idx + 1]
              const b = imgData[idx + 2]
              sumLum += 0.299 * r + 0.587 * g + 0.114 * b
              count++
            }
          }
          rawFeatures.push(count > 0 ? sumLum / count : 128)
        }
      }

      // Z-Score Mean & Variance Normalization (Lighting Invariance)
      const mean = rawFeatures.reduce((a, b) => a + b, 0) / rawFeatures.length
      const variance = rawFeatures.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / rawFeatures.length
      const std = Math.sqrt(variance) || 1

      const normalized = rawFeatures.map(v => (v - mean) / std)
      resolve(normalized)
    }
    img.onerror = () => resolve(Array(64).fill(0))
  })
}

// Validate captured image quality (reject pitch-black, blank, or covered camera snaps)
export function validateSnapshotImage(imageDataUrl) {
  return new Promise((resolve) => {
    if (!imageDataUrl || imageDataUrl.length < 500) {
      resolve({ valid: false, reason: 'Snapshot image is empty or invalid.' })
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imageDataUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 64, 64)
      const data = ctx.getImageData(0, 0, 64, 64).data

      let totalBrightness = 0
      let pixelValues = []

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        totalBrightness += lum
        pixelValues.push(lum)
      }

      const avgBrightness = totalBrightness / pixelValues.length
      
      // Calculate variance / standard deviation to detect blank single-color snaps
      let varianceSum = 0
      for (let v of pixelValues) {
        varianceSum += (v - avgBrightness) * (v - avgBrightness)
      }
      const stdDev = Math.sqrt(varianceSum / pixelValues.length)

      // Reject if pitch dark (avg brightness < 15) or zero contrast/blank (stdDev < 5)
      if (avgBrightness < 15) {
        resolve({ valid: false, reason: 'Camera snapshot is pitch black. Please turn on lights or uncover camera.' })
      } else if (stdDev < 5) {
        resolve({ valid: false, reason: 'Snapshot lacks facial features (solid color / covered camera).' })
      } else {
        resolve({ valid: true, avgBrightness: Math.round(avgBrightness), stdDev: Math.round(stdDev) })
      }
    }
    img.onerror = () => resolve({ valid: false, reason: 'Failed to process camera image.' })
  })
}

// Helper to safely parse array or JSON string descriptors
export function parseFaceDescriptor(desc) {
  if (!desc) return null
  if (Array.isArray(desc)) return desc
  if (typeof desc === 'string') {
    try {
      const parsed = JSON.parse(desc)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {}
  }
  return null
}

// Compare live selfie descriptor vs stored reference descriptor
export function compareFaceDescriptors(desc1Raw, desc2Raw) {
  const desc1 = parseFaceDescriptor(desc1Raw)
  const desc2 = parseFaceDescriptor(desc2Raw)

  if (!desc1 || !Array.isArray(desc1) || desc1.length === 0) {
    return { score: 0, distance: '1.000', verified: false, reason: 'No live face captured' }
  }

  if (!desc2 || !Array.isArray(desc2) || desc2.length === 0) {
    return { score: 0, distance: '1.000', verified: false, reason: 'No reference profile registered' }
  }

  // Compare spatial vector using Cosine Similarity
  const len = Math.min(desc1.length, desc2.length)
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < len; i++) {
    const v1 = Number(desc1[i]) || 0
    const v2 = Number(desc2[i]) || 0
    dotProduct += v1 * v2
    norm1 += v1 * v1
    norm2 += v2 * v2
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  const cosineSim = denominator > 0 ? dotProduct / denominator : 0
  
  // Convert Cosine Similarity (-1.0 to 1.0) into Match Score (0% to 100%)
  const score = Math.max(0, Math.min(100, Math.round(((cosineSim + 1) / 2) * 100)))
  const verified = score >= 60

  return {
    score,
    distance: (1 - cosineSim).toFixed(3),
    verified
  }
}

// Reverse Geocoding helper (OpenStreetMap Nominatim API - 100% Free)
export async function getAddressFromCoords(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`)
    const data = await res.json()
    if (data && data.display_name) {
      const parts = data.display_name.split(',')
      return parts.slice(0, 3).join(', ') // Return concise address
    }
  } catch (e) {
    console.warn('Reverse geocode error:', e)
  }
  return `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

// Store Location Geofence Validation (Thulir Agency Store Erode)
const STORE_LAT = 11.3410
const STORE_LNG = 77.7172
const MAX_RADIUS_KM = 0.5 // 500 meters

export function checkGeofence(lat, lng) {
  if (!lat || !lng) return { inBounds: true, distanceKm: 0 }
  
  // Haversine formula for distance between 2 GPS coordinates
  const R = 6371 // Earth radius km
  const dLat = (lat - STORE_LAT) * (Math.PI / 180)
  const dLng = (lng - STORE_LNG) * (Math.PI / 180)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(STORE_LAT * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = R * c

  return {
    inBounds: distanceKm <= MAX_RADIUS_KM,
    distanceKm: Number(distanceKm.toFixed(2))
  }
}
