import { MIN_PRODUCT_PRICE } from '@/lib/product-create-validation'

type ProductMinPriceNoticeProps = {
  className?: string
}

export default function ProductMinPriceNotice({
  className = 'mt-4',
}: ProductMinPriceNoticeProps) {
  return (
    <p className={`text-red-600 md:text-[18px] text-[16px] font-medium ${className}`}>
      ინფორმაცია: პროდუქტის გაყიდვის ფასი და გაქირავების დღის ფასი მინიმუმ {MIN_PRODUCT_PRICE} ₾
      უნდა იყოს.
    </p>
  )
}
