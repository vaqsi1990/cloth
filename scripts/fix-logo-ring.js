const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

async function sampleFile(filePath) {
  const meta = await sharp(filePath).metadata()
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true })
  const w = info.width
  const h = info.height
  const c = info.channels
  const s = (x, y) => {
    const i = (y * w + x) * c
    return [data[i], data[i + 1], data[i + 2]]
  }
  console.log(
    path.basename(filePath),
    `${meta.width}x${meta.height}`,
    'TL',
    s(0, 0),
    'TR',
    s(w - 1, 0),
    'BL',
    s(0, h - 1),
    'BR',
    s(w - 1, h - 1),
    'C',
    s(Math.floor(w / 2), Math.floor(h / 2)),
  )
  return { data, info, meta }
}

/**
 * Extract the white circular logo: make dark-green outer pixels transparent,
 * then crop tightly to the opaque circle and export PNG.
 */
async function removeDarkRing(srcPath, outPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const w = info.width
  const h = info.height
  const out = Buffer.from(data)

  // Dark forest-green outer ring / square background
  const isOuterDark = (r, g, b) => {
    const brightness = (r + g + b) / 3
    // Match ~rgb(27-50, 40-70, 30-55) and similar dark greens
    if (brightness > 95) return false
    if (g < 25) return false
    // green-dominant dark pixels
    return g >= r - 5 && g >= b - 5 && r < 90 && b < 90
  }

  let minX = w
  let minY = h
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = out[i]
      const g = out[i + 1]
      const b = out[i + 2]
      if (isOuterDark(r, g, b)) {
        out[i + 3] = 0
      } else {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }

  // Expand a couple px then make square around content
  const pad = 2
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad)
  maxY = Math.min(h - 1, maxY + pad)

  const contentW = maxX - minX + 1
  const contentH = maxY - minY + 1
  const side = Math.max(contentW, contentH)
  const cx = Math.floor((minX + maxX) / 2)
  const cy = Math.floor((minY + maxY) / 2)
  let left = Math.max(0, cx - Math.floor(side / 2))
  let top = Math.max(0, cy - Math.floor(side / 2))
  if (left + side > w) left = w - side
  if (top + side > h) top = h - side

  console.log('content bbox', { minX, minY, maxX, maxY, contentW, contentH, side, left, top })

  // Also punch a circular alpha so corners stay transparent even if any green remains
  const radius = side / 2 - 1
  const centerX = left + side / 2
  const centerY = top + side / 2
  for (let y = top; y < top + side; y++) {
    for (let x = left; x < left + side; x++) {
      const dx = x + 0.5 - centerX
      const dy = y + 0.5 - centerY
      if (dx * dx + dy * dy > radius * radius) {
        out[(y * w + x) * 4 + 3] = 0
      }
    }
  }

  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left, top, width: side, height: side })
    .png({ compressionLevel: 9 })
    .toFile(outPath)

  console.log('wrote', outPath, `${side}x${side}`)
}

async function main() {
  const publicDir = path.join(__dirname, '..', 'public')
  for (const f of ['logo.jpg', 'logo-icon.jpg', 'logo-192.jpg']) {
    await sampleFile(path.join(publicDir, f))
  }

  const src = path.join(publicDir, 'logo-icon.jpg')
  const outPng = path.join(publicDir, 'logo-icon.png')
  await removeDarkRing(src, outPng)

  // Also regenerate sized icons from the clean PNG for favicons etc.
  const clean = sharp(outPng)
  for (const size of [32, 48, 192]) {
    await clean
      .clone()
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(publicDir, `logo-${size}.png`))
    console.log('wrote', `logo-${size}.png`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
