'use client'

import React from 'react'

export type ProductListingType = 'simple' | 'multi'

type ProductTypeSelectorProps = {
  value: ProductListingType
  onChange: (value: ProductListingType) => void
}

export default function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="md:text-[20px] text-[18px] text-black font-semibold mb-2">პროდუქტის ტიპი</h2>
      <p className="text-sm text-gray-600 mb-4">
        აირჩიეთ მარტივი პროდუქტი ერთი ფერით/ზომით, ან რამდენიმე ვარიანტი სხვადასხვა ფერისა და ზომისთვის.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            value === 'simple' ? 'border-[#1B3729] bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="productListingType"
            checked={value === 'simple'}
            onChange={() => onChange('simple')}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">მარტივი პროდუქტი</span>
            <span className="block text-sm text-gray-600 mt-1">
              ერთი ფერი, ერთი ზომა და ერთი რაოდენობა
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition ${
            value === 'multi' ? 'border-[#1B3729] bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <input
            type="radio"
            name="productListingType"
            checked={value === 'multi'}
            onChange={() => onChange('multi')}
            className="mt-1 h-5 w-5"
          />
          <span>
            <span className="block md:text-[18px] text-[16px] font-semibold text-black">რამდენიმე ვარიანტი</span>
            <span className="block text-sm text-gray-600 mt-1">
              სხვადასხვა ფერი, ზომა, ფასი და რაოდენობა თითო ვარიანტზე
            </span>
          </span>
        </label>
      </div>
    </div>
  )
}
