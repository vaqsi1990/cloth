'use client'

import React from 'react'

type ProductMultiPricingSelectorProps = {
  showPurchaseOptions: boolean
  showRentalOptions: boolean
  onPurchaseChange: (checked: boolean) => void
  onRentalChange: (checked: boolean) => void
  error?: string
}

export default function ProductMultiPricingSelector({
  showPurchaseOptions,
  showRentalOptions,
  onPurchaseChange,
  onRentalChange,
  error,
}: ProductMultiPricingSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="md:text-[20px] text-[18px] text-black font-semibold mb-2">
        გაქირავება თუ გაყიდვა
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        აირჩიეთ მინიმუმ ერთი — შეგიძლიათ ორივეც ერთდროულად.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            showRentalOptions ? 'border-[#1B3729] bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="checkbox"
            checked={showRentalOptions}
            onChange={(e) => onRentalChange(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">გაქირავება</span>
            <span className="block text-sm text-gray-600 mt-1">
              ფასის გეგმა ქვემოთ — ყველა ვარიანტისთვის
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            showPurchaseOptions ? 'border-[#1B3729] bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="checkbox"
            checked={showPurchaseOptions}
            onChange={(e) => onPurchaseChange(e.target.checked)}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">გაყიდვა</span>
            <span className="block text-sm text-gray-600 mt-1">
              თითოეულ ვარიანტს ცალკე გაყიდვის ფასი
            </span>
          </span>
        </label>
      </div>

      {showPurchaseOptions && (
        <p className="text-sm text-[#1B3729] font-medium mt-4">
          გაყიდვის ფასის ველი გამოჩნდება თითოეულ ვარიანტზე ქვემოთ.
        </p>
      )}

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}
