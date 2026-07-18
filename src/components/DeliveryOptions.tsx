'use client'

import React from 'react'
import { MapPin, Store, Truck } from 'lucide-react'
import {
  DELIVERY_SPEED_OPTIONS,
  DeliverySpeedOption,
  DeliveryType,
  getDeliveryPriceForCity,
} from '@/lib/delivery'

export interface DeliveryCityOption {
  id: number
  name: string
  extraPrice: number
  standardPrice: number
  isActive: boolean
}

interface DeliveryOptionsProps {
  deliveryType: DeliveryType
  onDeliveryTypeChange: (type: DeliveryType) => void
  deliveryCities: DeliveryCityOption[]
  loadingCities?: boolean
  selectedCityId: number | null
  onCityChange: (cityId: number | null, cityName?: string) => void
  deliverySpeed: DeliverySpeedOption | null
  onSpeedChange: (speed: DeliverySpeedOption) => void
  pickupAddress: string
  pickupAddressError?: string
  pickupAvailable?: boolean
  freeDelivery?: boolean
  cityError?: string
  speedError?: string
  compact?: boolean
}

export default function DeliveryOptions({
  deliveryType,
  onDeliveryTypeChange,
  deliveryCities,
  loadingCities = false,
  selectedCityId,
  onCityChange,
  deliverySpeed,
  onSpeedChange,
  pickupAddress,
  pickupAddressError,
  pickupAvailable = true,
  freeDelivery = false,
  cityError,
  speedError,
  compact = false,
}: DeliveryOptionsProps) {
  const selectedCity = deliveryCities.find((city) => city.id === selectedCityId) ?? null
  const labelClass = compact
    ? 'text-sm text-black font-medium mb-2'
    : 'block md:text-[18px] text-[16px] text-black font-medium mb-2'

  return (
    <div className="space-y-4">
      {pickupAvailable ? (
        <div>
          <label className={labelClass}>მიღების ტიპი</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                deliveryType === 'pickup'
                  ? 'border-[#1B3729] bg-[#1B3729]/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="deliveryType"
                checked={deliveryType === 'pickup'}
                onChange={() => onDeliveryTypeChange('pickup')}
                className="sr-only"
              />
              <Store className="w-5 h-5 text-black flex-shrink-0" />
              <span className="text-black font-medium">ადგილზე</span>
            </label>
            <label
              className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                deliveryType === 'delivery'
                  ? 'border-[#1B3729] bg-[#1B3729]/5'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="deliveryType"
                checked={deliveryType === 'delivery'}
                onChange={() => onDeliveryTypeChange('delivery')}
                className="sr-only"
              />
              <Truck className="w-5 h-5 text-black flex-shrink-0" />
              <span className="text-black font-medium">მიტანით</span>
            </label>
          </div>
        </div>
      ) : (
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-black flex-shrink-0" />
            <span className="text-black font-medium">მიტანით</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            ამ პროდუქტისთვის ხელმისაწვდომია მხოლოდ მიტანა.
          </p>
        </div>
      )}

      {deliveryType === 'pickup' && pickupAvailable ? (
        <div>
          <label className={labelClass}>
            <MapPin className="w-4 h-4 inline mr-2" />
            მისამართი
          </label>
          <div
            className={`w-full px-4 py-3 border rounded-lg bg-gray-50 text-sm md:text-base ${
              pickupAddress ? 'border-gray-300 text-black' : 'border-amber-300 text-amber-900'
            }`}
          >
            {pickupAddress || 'გატანის მისამართი არ არის მითითებული'}
          </div>
          {pickupAddressError && (
            <p className="text-red-500 text-sm mt-1">{pickupAddressError}</p>
          )}
        </div>
      ) : (
        <>
          <div>
            <label className={labelClass}>
              <MapPin className="w-4 h-4 inline mr-2" />
              მიტანის ქალაქი *
            </label>
            {loadingCities ? (
              <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 text-sm md:text-base">
                ქალაქების ჩატვირთვა...
              </div>
            ) : deliveryCities.length === 0 ? (
              <div className="w-full px-4 py-3 border border-amber-300 rounded-lg bg-amber-50 text-amber-900 text-sm">
                მიტანის ქალაქები ამჟამად არ არის ხელმისაწვდომი.
              </div>
            ) : (
              <select
                value={selectedCityId || ''}
                onChange={(e) => {
                  const cityId = e.target.value ? parseInt(e.target.value, 10) : null
                  const city = cityId
                    ? deliveryCities.find((item) => item.id === cityId)
                    : null
                  onCityChange(cityId, city?.name)
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-[#1B3729] text-sm md:text-base"
              >
                <option value="">აირჩიეთ ქალაქი</option>
                {deliveryCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            )}
            {cityError && (
              <p className="text-red-500 text-sm mt-1">{cityError}</p>
            )}
          </div>

          {selectedCity && (
            <div>
              <label className={labelClass}>მიტანის ტიპი *</label>
              <div className="space-y-3">
                {DELIVERY_SPEED_OPTIONS.map((option) => {
                  const catalogPrice = getDeliveryPriceForCity(
                    selectedCity,
                    option.value,
                  )
                  const price = freeDelivery ? 0 : catalogPrice
                  const isSelected = deliverySpeed === option.value

                  return (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-[#1B3729] bg-[#1B3729]/5'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="deliverySpeed"
                          checked={isSelected}
                          onChange={() => onSpeedChange(option.value)}
                          className="w-4 h-4 text-[#1B3729]"
                        />
                        <div>
                          <p className="text-black font-medium">
                            {option.label} —{' '}
                            {freeDelivery ? (
                              <span className="text-emerald-700">უფასო</span>
                            ) : (
                              `₾${price.toFixed(2)}`
                            )}
                          </p>
                          <p className="text-sm text-gray-600">{option.daysLabel}</p>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {speedError && (
                <p className="text-red-500 text-sm mt-1">{speedError}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
