export type UploadFileResult = {
  url: string
  serverData?: {
    url?: string
    uploadedBy?: string
  } | null
}

export function getUploadResultUrl(file: UploadFileResult): string {
  return file.serverData?.url ?? file.url
}

export function getUploadResultUrls(files: UploadFileResult[]): string[] {
  return files.map((file) => getUploadResultUrl(file))
}
