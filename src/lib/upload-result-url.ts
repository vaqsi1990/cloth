export type UploadFileResult = {
  url?: string
  ufsUrl?: string
  serverData?: {
    url?: string
    uploadedBy?: string
  } | null
}

export function getUploadResultUrl(file: UploadFileResult): string {
  const displayUrl = file.serverData?.url?.trim()
  if (displayUrl) {
    return displayUrl
  }

  const fallbackUrl = file.ufsUrl?.trim() || file.url?.trim()
  if (!fallbackUrl) {
    throw new Error('ატვირთვის შემდეგ სურათის URL ვერ მოიძებნა')
  }

  return fallbackUrl
}

export function getUploadResultUrls(files: UploadFileResult[]): string[] {
  return files.map((file) => getUploadResultUrl(file))
}
