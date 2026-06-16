'use client'

export const PRODUCT_PHOTO_BACKGROUND_CONSENT_MESSAGE =
  'ვეთანხმები, რომ ადმინისტრატორმა საჭიროების შემთხვევაში შეცვალოს პროდუქტის ფოტოს უკანა ფონი.'

export const PRODUCT_PHOTO_BACKGROUND_CONSENT_ERROR =
  'გთხოვთ დაადასტუროთ ფოტოს უკანა ფონის შეცვლის თანხმობა'

interface ProductPhotoBackgroundConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
}

export default function ProductPhotoBackgroundConsent({
  checked,
  onChange,
  error,
}: ProductPhotoBackgroundConsentProps) {
  return (
    <div className="mt-4 p-4 rounded-lg border border-gray-200 bg-gray-50 text-left w-full">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 text-[#1B3729] border-gray-300 rounded focus:ring-[#1B3729] shrink-0"
        />
        <span className="md:text-[16px] text-[14px] text-black leading-relaxed">
          {PRODUCT_PHOTO_BACKGROUND_CONSENT_MESSAGE}
        </span>
      </label>
      {error && (
        <p className="text-red-500 md:text-[16px] text-[14px] mt-2">{error}</p>
      )}
    </div>
  )
}
