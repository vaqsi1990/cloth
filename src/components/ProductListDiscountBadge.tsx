import { getBuyerSavingsFromSellerDiscount } from '@/lib/platform-pricing'

interface ProductListDiscountBadgeProps {
  discount: number
  discountDays?: number | null
}

export default function ProductListDiscountBadge({
  discount,
  discountDays,
}: ProductListDiscountBadgeProps) {
  if (!discount || discount <= 0) return null

  return (
    <div className="bg-[#1B3729] rounded-md text-white font-regular w-full min-w-0">
      <div className="px-1.5 py-1 text-[11px] sm:text-[13px] md:text-[15px] flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-tight">
        <span className="whitespace-nowrap">
          დანაზოგი: ₾{getBuyerSavingsFromSellerDiscount(discount).toFixed(2)}
        </span>
        {discountDays ? (
          <span className="bg-white text-black px-1.5 py-0.5 rounded text-[10px] sm:text-xs whitespace-nowrap">
            {discountDays} დღე
          </span>
        ) : null}
      </div>
    </div>
  )
}
