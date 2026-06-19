'use client'

import { type ComponentProps } from 'react'
import { UploadButton } from '@/utils/uploadthing'
import { prepareImagesForUpload } from '@/lib/prepare-images-for-upload'

type HeicAwareUploadButtonProps = ComponentProps<typeof UploadButton>

export default function HeicAwareUploadButton({
  onBeforeUploadBegin,
  ...props
}: HeicAwareUploadButtonProps) {
  return (
    <UploadButton
      {...props}
      onBeforeUploadBegin={async (files) => {
        const prepared = await prepareImagesForUpload(files)
        if (onBeforeUploadBegin) {
          return onBeforeUploadBegin(prepared)
        }
        return prepared
      }}
    />
  )
}
