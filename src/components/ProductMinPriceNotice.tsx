import { MIN_PRODUCT_PRICE } from '@/lib/product-create-validation'

type ProductMinPriceNoticeProps = {
  className?: string
  mode?: 'purchase' | 'rental'
}

export default function ProductMinPriceNotice({
  className = 'mt-4',
  mode = 'rental',
}: ProductMinPriceNoticeProps) {
  const message =
    mode === 'purchase'
      ? `ინფორმაცია: პროდუქტის გაყიდვის ფასი მინიმუმ ${MIN_PRODUCT_PRICE} ₾ უნდა იყოს.`
      : `ინფორმაცია: გაქირავების დღის ფასი მინიმუმ ${MIN_PRODUCT_PRICE} ₾ უნდა იყოს.`

  return (
    <p className={`text-red-600 md:text-[18px] text-[16px] font-medium ${className}`}>
      {message}
    </p>
  )
}
