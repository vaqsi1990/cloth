const HEIC_BRANDS = new Set(['heic', 'heix', 'hevc', 'heif', 'mif1'])

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

function buildJpegFileName(originalName: string): string {
  const withoutExtension = originalName.replace(/\.[^.]+$/, '')
  const baseName = withoutExtension || 'image'
  return `${baseName}.jpg`
}

async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const heic2any = (await import('heic2any')).default
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.92,
    })

    const blob = Array.isArray(result) ? result[0] : result
    if (!blob) {
      throw new Error('HEIC კონვერტაციამ ცარიელი ფაილი დააბრუნა')
    }

    return new File([blob], buildJpegFileName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    throw new Error(
      'iPhone ფოტოს (HEIC) კონვერტაცია ვერ მოხერხდა. სცადეთ თავიდან ან ატვირთეთ JPG/PNG სურათი.',
    )
  }
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (!(await isHeicFile(file))) {
    return file
  }

  return convertHeicToJpeg(file)
}

export async function prepareImagesForUpload(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => prepareImageForUpload(file)))
}
