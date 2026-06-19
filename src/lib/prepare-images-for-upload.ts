import { buildJpegFileName, isHeicFile } from '@/lib/heic'

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
