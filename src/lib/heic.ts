export const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heif', 'mif1'])

export function isHeicBuffer(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
  if (ftyp !== 'ftyp') return false
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  return HEIC_BRANDS.has(brand)
}

function readFileBrand(file: File): Promise<string | null> {
  return file.slice(0, 12).arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer)
    if (bytes.length < 12) return null
    if (String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) !== 'ftyp') {
      return null
    }
    return String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
  })
}

export async function isHeicFile(file: File): Promise<boolean> {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') {
    return true
  }

  if (/\.hei[cf]$/i.test(file.name)) {
    return true
  }

  const brand = await readFileBrand(file)
  return brand !== null && HEIC_BRANDS.has(brand)
}

export function buildJpegFileName(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^.]+$/, '')
  const baseName = withoutExtension || 'image'
  return `${baseName}.jpg`
}
