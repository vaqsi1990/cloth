"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'

import ImageUploadForProduct from '@/component/productimage'
import { PRODUCT_PHOTO_BACKGROUND_CONSENT_ERROR } from '@/components/ProductPhotoBackgroundConsent'
import ProductCategorySelect from '@/component/ProductCategorySelect'
import { showToast } from '@/utils/toast'
import {
  isValidProductText,
  PRODUCT_DESCRIPTION_ERROR_MESSAGE,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  filterProductCategoriesByGender,
  isCategoryValidForProductGender,
  isSizeOptionalCategoryId,
  clearVariantSizes,
  PRODUCT_GENDER_OPTIONS,
  type ProductGender,
} from '@/lib/product-categories'
import {
  productPickupAddressField,
  refineProductPickupAddress,
} from '@/lib/product-pickup'
import {
  productImageUrlsFieldWithUrlValidation,
  refineProductImagesAndPricing,
  getProductCreateFieldErrors,
  formatProductFormFieldErrors,
  mapZodIssuesToProductFormErrors,
} from '@/lib/product-create-validation'
import ProductDiscountFields from '@/components/ProductDiscountFields'
import ProductMinPriceNotice from '@/components/ProductMinPriceNotice'
import SimpleProductSalePriceSection from '@/components/SimpleProductSalePriceSection'
import ProductVariantEditor from '@/components/ProductVariantEditor'
import ProductTypeSelector, { type ProductListingType } from '@/components/ProductTypeSelector'
import ProductMultiPricingSelector from '@/components/ProductMultiPricingSelector'
import ProductColorPicker from '@/components/ProductColorPicker'
import { VIP_MONTHLY_PRICE_GEL } from '@/lib/product-vip'
import { getProductDiscountBasePrice } from '@/lib/discount-helpers'
import { optionalCategoryIdField } from '@/lib/product-schema-fields'
import {
  seedVariantRowsFromLegacyProduct,
  getVariantImageUrls,
  type ProductVariantFormRow,
  patchVariantFormRow,
} from '@/lib/product-variants'
import {
  buildPricingModeFormPatch,
  flagsToProductPricingMode,
  prepareProductPricingSubmit,
  productPricingModeToFlags,
  type ProductPricingMode,
} from '@/lib/product-form-pricing'
import ProductPhotoBackgroundConsent from '@/components/ProductPhotoBackgroundConsent'
import {
  buildProductFormSizeOptions,
  getProductFormSizeLabel,
  getProductFormSizeSelectValue,
  isValidProductFormSize,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'
import SizePillSelector from '@/components/SizePillSelector'

const categories = DEFAULT_PRODUCT_CATEGORIES
type Category = {
  id: number
  name: string
  slug: string
}
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(PRODUCT_TEXT_REGEX, PRODUCT_NAME_ERROR_MESSAGE),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || isValidProductText(val), {
      message: PRODUCT_DESCRIPTION_ERROR_MESSAGE,
    }),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX'], {
    message: 'სქესის არჩევა სავალდებულოა',
  }),
  color: z.string().optional(),
  location: z.string().optional(),
  allowsPickup: z.boolean().default(false),
  pickupAddress: productPickupAddressField,
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  size: z.string().optional(),
  isNew: z.boolean().default(false),
  isSecondHand: z.boolean().default(false),
  discount: z.number().min(0).optional(),
  discountDays: z.number().int().min(1).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: optionalCategoryIdField,
  isRentable: z.boolean().default(true), // 🆕
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(), // 🆕
  maxRentalDays: z.number().optional(), // 🆕
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  variants: z.array(
    z.object({
      color: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().optional()
      ),
      size: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().optional()
      ),
      price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
      stock: z.number().int().min(0).default(0),
      imageUrl: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().url('არასწორი URL').optional()
      ),
      discount: z.number().min(0).optional(),
      sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
    })
  ).default([]),
  imageUrls: z.array(z.string().url('არასწორი URL')).default([]),
  isSkuVariantProduct: z.boolean().optional(),
  requireVariantSalePrices: z.boolean().optional(),
  requireVariantSize: z.boolean().optional(),
  rentalPriceTiers: z.preprocess(
    (val) => {
      // If it's an array with all pricePerDay = 0, convert to undefined
      if (Array.isArray(val) && val.length > 0) {
        const hasValidPrice = val.some((tier: any) => tier?.pricePerDay > 0)
        return hasValidPrice ? val : undefined
      }
      return val
    },
    z.array(z.object({
      minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
      pricePerDay: z.number().min(0, 'ფასი დღეში უნდა იყოს დადებითი ან ნული')
    })).optional()
  )
}).superRefine((data, ctx) => {
  refineProductPickupAddress(data, ctx)
  refineProductImagesAndPricing(
    {
      ...data,
      isSkuVariantProduct: data.isSkuVariantProduct ?? false,
      requireVariantSalePrices: data.requireVariantSalePrices,
      requireVariantSize: data.requireVariantSize,
    },
    ctx,
  )
})


type ProductFormData = z.infer<typeof productSchema>
type ProductFormGender = ProductGender | ''

const NewProductPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<Omit<ProductFormData, 'gender'> & { gender: ProductFormGender }>({
    name: '',
    slug: '',
    brand: '',
    description: '',
    stock: 0,
    gender: '',
    color: '',
    location: 'თბილისი',
    allowsPickup: false,
    pickupAddress: undefined,
    sizeSystem: undefined,
    size: undefined,
    isNew: false,
    isSecondHand: false,
    discount: undefined,
    discountDays: undefined,
    rating: 0,
    categoryId: undefined,
    isRentable: true, // 🆕
    pricePerDay: undefined,
    maxRentalDays: undefined,
    status: 'AVAILABLE',
    variants: [],
    imageUrls: [],
    rentalPriceTiers: [{ minDays: 1, pricePerDay: 0 }],
  })


  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [wantsVip, setWantsVip] = useState(false)
  const [agreedToPhotoBackgroundChange, setAgreedToPhotoBackgroundChange] = useState(false)
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)
  const [showRentalOptions, setShowRentalOptions] = useState(true)
  const [showVariantOptions, setShowVariantOptions] = useState(false)
  const productListingType: ProductListingType = showVariantOptions ? 'multi' : 'simple'
  const [sizeSystem, setSizeSystem] = useState(formData.sizeSystem ?? '')
  const [selectedSize, setSelectedSize] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [useCustomColor, setUseCustomColor] = useState(false)

  const handleProductListingTypeChange = (type: ProductListingType) => {
    const isMulti = type === 'multi'
    setShowVariantOptions(isMulti)

    if (!isMulti) {
      setFormData((prev) => ({ ...prev, variants: [] }))
      setShowPurchaseOptions(false)
      setShowRentalOptions(true)
      return
    }

    setShowPurchaseOptions(false)
    setShowRentalOptions(false)
    setFormData((prev) => ({
      ...prev,
      variants: seedVariantRowsFromLegacyProduct({
        color: useCustomColor ? customColor.trim() : prev.color,
        size: prev.size,
        sizeSystem: prev.sizeSystem,
        stock: prev.stock,
        variants: prev.variants.length > 0
          ? prev.variants
          : [{ price: 0, stock: prev.stock || 1 }],
      }),
    }))
  }

  type SizeSystem = NonNullable<ProductFormData['sizeSystem']>

  const sizeOptionsInput = useMemo(
    () => ({ categoryId: formData.categoryId, categories }),
    [formData.categoryId],
  )

  const combinedSizeOptions = useMemo(
    () => (formData.gender ? buildProductFormSizeOptions(formData.gender, sizeOptionsInput) : []),
    [formData.gender, sizeOptionsInput],
  )

  const sizeFieldLabel = useMemo(
    () => getProductFormSizeLabel(formData.gender, sizeOptionsInput),
    [formData.gender, sizeOptionsInput],
  )

  const genderCategories = useMemo(
    () => filterProductCategoriesByGender(categories, formData.gender || null),
    [formData.gender],
  )

  const hasSelectedGender = Boolean(formData.gender)

  const handleCombinedSizeSelect = (value: string) => {
    if (!value) {
      setSizeSystem('')
      setSelectedSize('')
      handleInputChange('sizeSystem', undefined)
      handleInputChange('size', undefined)
      setFormData(prev => ({
        ...prev,
        variants: prev.variants.map(variant => ({
          ...variant,
          sizeSystem: undefined
        }))
      }))
      return
    }

    const parsed = parseProductFormSizeSelection(value, formData.gender)
    setSizeSystem(parsed.sizeSystem ?? '')
    setSelectedSize(parsed.size ?? '')
    handleInputChange('sizeSystem', parsed.sizeSystem)
    handleInputChange('size', parsed.size)
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(variant => ({
        ...variant,
        sizeSystem: parsed.sizeSystem,
      }))
    }))
  }

  useEffect(() => {
    if (!selectedSize) return
    if (!isValidProductFormSize(selectedSize, formData.gender, sizeOptionsInput)) {
      handleCombinedSizeSelect('')
    }
  }, [formData.gender, formData.categoryId, selectedSize, categories])

  const isSizeOptional = useMemo(
    () => isSizeOptionalCategoryId(formData.categoryId, categories),
    [formData.categoryId, categories],
  )

  const clearSizeFields = () => {
    setSizeSystem('')
    setSelectedSize('')
    handleInputChange('sizeSystem', undefined)
    handleInputChange('size', undefined)
  }

  const handleCategoryChange = (categoryId: number | undefined) => {
    handleInputChange('categoryId', categoryId)
    if (isSizeOptionalCategoryId(categoryId, categories)) {
      clearSizeFields()
      setFormData((prev) => ({
        ...prev,
        size: undefined,
        sizeSystem: undefined,
        variants: clearVariantSizes(prev.variants),
      }))
      return
    }
    if (
      selectedSize &&
      !isValidProductFormSize(selectedSize, formData.gender, {
        categoryId,
        categories,
      })
    ) {
      clearSizeFields()
    }
  }

  const handleGenderChange = (gender: ProductFormGender) => {
    const previousGender = formData.gender
    setFormData((prev) => ({
      ...prev,
      gender,
      categoryId: isCategoryValidForProductGender(prev.categoryId, gender || null, categories)
        ? prev.categoryId
        : undefined,
    }))
    if (!gender || (previousGender && previousGender !== gender)) {
      clearSizeFields()
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    if (field === 'description' && typeof value === 'string') {
      if (value && !isValidProductText(value)) {
        setErrors(prev => ({
          ...prev,
          description: PRODUCT_DESCRIPTION_ERROR_MESSAGE,
        }))
      } else {
        // Clear errors when valid
        if (errors.description) {
          setErrors(prev => ({
            ...prev,
            description: ''
          }))
        }
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field]) {
        setErrors(prev => ({
          ...prev,
          [field]: ''
        }))
      }
    }
  }

  const generateSlug = (name: string) => {
    // Convert Georgian characters to Latin equivalents
    const georgianToLatin: { [key: string]: string } = {
      'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
      'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
      'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
      'ქ': 'q', 'ღ': 'gh', 'ყ': 'k', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
      'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
    }

    return name
      .toLowerCase()
      .split('')
      .map(char => georgianToLatin[char] || char)
      .join('')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleNameChange = (name: string) => {
    const slug = generateSlug(name)
    setFormData(prev => ({
      ...prev,
      name: name,
      slug: slug
    }))

    if (name && !isValidProductText(name)) {
      setErrors(prev => ({
        ...prev,
        name: PRODUCT_NAME_ERROR_MESSAGE,
      }))
    } else {
      // Clear errors when valid
      if (errors.name) {
        setErrors(prev => ({
          ...prev,
          name: ''
        }))
      }
    }
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: useCustomColor ? customColor.trim() : formData.color || undefined,
          size: isSizeOptional ? undefined : selectedSize || undefined,
          price: 0,
          stock: 1,
          imageUrl: undefined,
          sizeSystem: isSizeOptional ? undefined : (formData.sizeSystem as ProductVariantFormRow['sizeSystem']),
        },
      ],
    }))
  }

  const pricingMode = flagsToProductPricingMode(showPurchaseOptions, showRentalOptions)

  const handlePricingModeChange = (mode: ProductPricingMode) => {
    const flags = productPricingModeToFlags(mode)
    setShowPurchaseOptions(flags.showPurchaseOptions)
    setShowRentalOptions(flags.showRentalOptions)

    setFormData((prev) => {
      const patch = buildPricingModeFormPatch(mode, {
        variants: prev.variants,
        rentalPriceTiers: prev.rentalPriceTiers,
      })
      const nextVariants =
        mode === 'purchase' && !showVariantOptions && prev.variants.length === 0
          ? [{ price: 0, stock: prev.stock || 1 }]
          : patch.variants

      return {
        ...prev,
        ...patch,
        variants: nextVariants,
      }
    })
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const updateVariant = (index: number, field: string, value: string | number | string[] | undefined) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }))
  }

  const patchVariant = (index: number, patch: Partial<ProductVariantFormRow>) => {
    setFormData((prev) => patchVariantFormRow(prev, index, patch))
  }

  const addRentalPriceTier = () => {
    setFormData(prev => ({
      ...prev,
      rentalPriceTiers: [...(prev.rentalPriceTiers || []), { minDays: 1, pricePerDay: 0 }]
    }))
  }

  const removeRentalPriceTier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rentalPriceTiers: (prev.rentalPriceTiers || []).filter((_, i) => i !== index)
    }))
  }

  const updateRentalPriceTier = (index: number, field: string, value: number) => {
    setFormData(prev => {
      const currentTiers = prev.rentalPriceTiers || []
      // If no tiers exist, create a default one
      const tiers = currentTiers.length === 0 ? [{ minDays: 1, pricePerDay: 0 }] : currentTiers

      return {
        ...prev,
        rentalPriceTiers: tiers.map((tier, i) =>
          i === index ? { ...tier, [field]: value } : tier
        )
      }
    })
  }

  const handleImageChange = (urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: urls
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    if (!agreedToPhotoBackgroundChange) {
      setErrors({ photoBackgroundConsent: PRODUCT_PHOTO_BACKGROUND_CONSENT_ERROR })
      showToast(PRODUCT_PHOTO_BACKGROUND_CONSENT_ERROR, 'error')
      setIsSubmitting(false)
      return
    }

    const fieldErrors = getProductCreateFieldErrors({
      ...formData,
      isSkuVariantProduct: showVariantOptions,
      requireVariantSalePrices: showPurchaseOptions && showVariantOptions,
      requireVariantSize: !isSizeOptional,
      showPurchaseOptions,
      showRentalOptions,
    })
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      showToast(formatProductFormFieldErrors(fieldErrors), 'error')
      setIsSubmitting(false)
      return
    }

    try {
      const pricing = prepareProductPricingSubmit({
        showVariantOptions,
        showPurchaseOptions,
        showRentalOptions,
        variants: formData.variants,
        rentalPriceTiers: formData.rentalPriceTiers,
      })
      const variantsToSubmit = pricing.variantsToSubmit
      
      const dataToValidate: any = {
        ...formData,
        isSkuVariantProduct: showVariantOptions,
        requireVariantSalePrices: showPurchaseOptions && showVariantOptions,
        requireVariantSize: !isSizeOptional,
        isRentable: pricing.isRentable,
        imageUrls: showVariantOptions ? getVariantImageUrls(variantsToSubmit) : formData.imageUrls,
        rentalPriceTiers: pricing.rentalPriceTiers,
        variants: variantsToSubmit.map(({ discount: _discount, ...variant }) => variant),
        color: useCustomColor ? customColor.trim() : formData.color,
        ...(showVariantOptions || isSizeOptional
          ? {
              size: showVariantOptions ? undefined : formData.size,
              sizeSystem: showVariantOptions ? undefined : formData.sizeSystem,
            }
          : {}),
      }

      // Validate form data
      const validatedData = productSchema.parse(dataToValidate)

      // Send data to API
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      })

      const result = await response.json()

      if (result.success) {
        if (wantsVip && result.product?.id) {
          const payResponse = await fetch('/api/product-vip/pay', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ productId: result.product.id, returnTo: 'admin' }),
          })
          const payResult = await payResponse.json()

          if (payResult.success && payResult.redirectUrl) {
            showToast('პროდუქტი შეიქმნა. გადადით VIP გადახდაზე', 'success')
            window.location.href = payResult.redirectUrl
            return
          }

          showToast(payResult.error || 'VIP გადახდის დაწყება ვერ მოხერხდა', 'error')
          router.push('/admin/products')
          return
        }

        showToast('პროდუქტი წარმატებით შეიქმნა!', 'success')
        router.push('/admin/products')
      } else {
        if (result.errors) {
          const newErrors = mapZodIssuesToProductFormErrors(result.errors)
          setErrors(newErrors)
          if (Object.keys(newErrors).length > 0) {
            showToast(formatProductFormFieldErrors(newErrors), 'error')
          }
        } else {
          showToast(result.message || 'შეცდომა პროდუქტის შექმნისას', 'error')
        }
      }

    } catch (error) {
      console.error('Error:', error)
      if (error instanceof z.ZodError) {
        const newErrors = mapZodIssuesToProductFormErrors(error.issues)
        setErrors(newErrors)
        if (Object.keys(newErrors).length > 0) {
          showToast(formatProductFormFieldErrors(newErrors), 'error')
        }
      } else {
        showToast('მოულოდნელი შეცდომა', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
        <div className=" mx-auto px-4 py-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80"
                    >
                        <ArrowLeft className="w-7 font-bold h-7 mr-2" />
                 
                    </button>
                </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">ძირითადი ინფორმაცია</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  სახელი *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="შეიყვანეთ პროდუქტის სახელი"
                  className={`w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                /> 
                {errors.name && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.name}</p>}
              </div>

              <div className={showVariantOptions ? 'hidden' : ''}>
                <label className="block text-[20px] text-black font-medium mb-2">
                  საწყობში რაოდენობა *
                </label>
                <input
                  type="number"
                  value={formData.stock === undefined || formData.stock === 0 ? '' : formData.stock}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : (parseInt(e.target.value) || 0)
                    handleInputChange('stock', val)
                  }}
                  className={`w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.stock && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.stock}</p>}
              </div>

              {showVariantOptions && (
                <div className="md:col-span-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  რაოდენობა მიეთითება ქვემოთ, თითოეული ვარიანტისთვის ცალ-ცალკე.
                </div>
              )}

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  მდებარეობა
                </label>
                <select
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">მდებარეობის არჩევა</option>
                  <option value="თბილისი">თბილისი</option>
                  <option value="ქუთაისი">ქუთაისი</option>
                  <option value="რუსთავი">რუსთავი</option>
                  <option value="ბათუმი">ბათუმი</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowsPickup}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setFormData((prev) => ({
                        ...prev,
                        allowsPickup: checked,
                        pickupAddress: checked ? prev.pickupAddress : undefined,
                      }))
                    }}
                    className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span>
                    <span className="block text-[20px] text-black font-medium">
                      გატანა ადგილიდან
                    </span>
                    <span className="block text-sm text-gray-600 mt-1">
                      თუ მონიშნულია, მყიდველს შეუძლია აირჩიოს ადგილზე მიღება ან მიტანა. თუ არა — მხოლოდ მიტანა.
                    </span>
                  </span>
                </label>
              </div>

              {formData.allowsPickup && (
                <div className="sm:col-span-2">
                  <label className="block text-[20px] text-black font-medium mb-2">
                    გატანის ზუსტი მისამართი *
                  </label>
                  <input
                    type="text"
                    value={formData.pickupAddress || ''}
                    onChange={(e) => handleInputChange('pickupAddress', e.target.value)}
                    placeholder="მაგ: ლეო დავითაშვილის ქუჩა 120, 0190 თბილისი, საქართველო"
                    className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  {errors.pickupAddress && (
                    <p className="text-red-500 text-sm mt-1">{errors.pickupAddress}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    მიუთითეთ ზუსტი მისამართი, სადაც მყიდველი გაიტანს პროდუქტს.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ბრენდი (ოფციონალური)
                </label>
                <input
                  type="text"
                  value={formData.brand || ''}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ვისთვის <span className="text-red-600">*</span>
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleGenderChange(e.target.value as ProductFormGender)}
                  className={`w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">აირჩიეთ სქესი</option>
                  {PRODUCT_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.gender && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.gender}</p>}
              </div>

              {hasSelectedGender && (
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  კატეგორია
                </label>
                <ProductCategorySelect
                  categories={genderCategories}
                  gender={formData.gender || null}
                  value={formData.categoryId || ''}
                  onChange={handleCategoryChange}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              )}

              {!showVariantOptions && (
              <ProductColorPicker
                value={useCustomColor ? 'სხვა ფერი' : (formData.color || '')}
                customColor={customColor}
                onSelect={(selectedValue) => {
                  if (selectedValue === 'სხვა ფერი') {
                    setUseCustomColor(true)
                    handleInputChange('color', customColor)
                  } else {
                    setUseCustomColor(false)
                    handleInputChange('color', selectedValue)
                    setCustomColor('')
                  }
                }}
                onCustomColorChange={(value) => {
                  setCustomColor(value)
                  handleInputChange('color', value)
                }}
              />
              )}

              {!showVariantOptions && hasSelectedGender && !isSizeOptional && (
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">
                    {sizeFieldLabel} (არასავალდებულო)
                  </label>
                  <SizePillSelector
                    value={getProductFormSizeSelectValue(formData.gender, sizeSystem, selectedSize)}
                    onChange={handleCombinedSizeSelect}
                    options={combinedSizeOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    compact={formData.gender === 'CHILDREN'}
                  />
                </div>
              )}

            </div>
            
            <div className="mt-6">
              <label className="block text-[20px] text-black font-medium mb-2">
                აღწერა
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="შეიყვანეთ პროდუქტის აღწერა"
                rows={4}
                className={`w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.description && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.description}</p>}
            </div>

          </div>

          {/* Product type & variants */}
          <ProductTypeSelector
            value={productListingType}
            onChange={handleProductListingTypeChange}
          />

          <ProductMultiPricingSelector
            pricingMode={pricingMode}
            onPricingModeChange={handlePricingModeChange}
            error={errors.pricingMode}
          />

          {showVariantOptions && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-[20px] text-black font-semibold mb-4">ვარიანტები</h2>
              <ProductVariantEditor
                variants={formData.variants}
                gender={formData.gender}
                categoryId={formData.categoryId}
                categories={categories}
                sizeSystem={(formData.sizeSystem || 'EU') as 'EU' | 'US' | 'UK' | 'CN'}
                isSizeOptional={isSizeOptional}
                requireSize={!isSizeOptional}
                requireImage
                showPrice={showPurchaseOptions}
                errors={errors}
                onAdd={addVariant}
                onRemove={removeVariant}
                onUpdate={updateVariant}
                onPatch={patchVariant}
              />
            </div>
          )}

          {/* Rental Options */}
          {showRentalOptions && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <ProductMinPriceNotice mode="rental" className="mb-4" />
            <h2 className="text-[20px] text-black font-semibold mb-6">გაქირავება</h2>



            <div className="space-y-6">
              {/* Rental Price Tiers */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-black">ფასის გეგმა</h3>
                  <button
                    type="button"
                    onClick={addRentalPriceTier}
                    className="bg-black text-white px-4 py-2 rounded-lg text-[20px] flex items-center space-x-2 font-bold"
                  >
                    <Plus className="w-5 h-5 font-bold" />
             
                  </button>
                </div>

                {/* Always show at least one price tier */}
                {(formData.rentalPriceTiers && formData.rentalPriceTiers.length > 0 ? formData.rentalPriceTiers : [{ minDays: 1, pricePerDay: 0 }]).map((tier, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                    <div>
                      <label className="block text-[20px] font-medium text-black mb-2">მინიმალური დღეები</label>
                      <input
                        type="number"
                        min="1"
                        value={tier.minDays < 1 ? '' : tier.minDays}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            updateRentalPriceTier(index, 'minDays', 0)
                            return
                          }
                          const parsed = parseInt(raw, 10)
                          if (!isNaN(parsed)) {
                            updateRentalPriceTier(index, 'minDays', parsed)
                          }
                        }}
                        className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[20px] font-medium text-black mb-2">
                        ფასი დღეში <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.pricePerDay === 0 ? '' : tier.pricePerDay}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                          updateRentalPriceTier(index, 'pricePerDay', val)
                        }}
                        className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="flex items-end">
                      {(formData.rentalPriceTiers && formData.rentalPriceTiers.length > 0 ? formData.rentalPriceTiers.length : 1) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRentalPriceTier(index)}
                          className=" text-white px-3 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                        >
                          <Trash2 className="w-7 h-7 text-red-500" />
                          
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              </div>
              {errors.rentalPriceTiers && (
                <p className="text-red-500 md:text-[18px] text-[16px] mt-2">{errors.rentalPriceTiers}</p>
              )}

              {/* Additional Rental Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">მაქს დღეები(არასავალდებულო)</label>
                  <input
                    type="number"
                    value={formData.maxRentalDays || ''}
                    onChange={(e) => handleInputChange('maxRentalDays', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
            {/* {formData.isRentable && (
            )} */}
          </div>
          )}

          {!showVariantOptions && showPurchaseOptions && (
            <SimpleProductSalePriceSection
              price={formData.variants[0]?.price ?? 0}
              onPriceChange={(price) =>
                setFormData((prev) => ({
                  ...prev,
                  variants: [
                    {
                      ...(prev.variants[0] ?? { stock: prev.stock || 1 }),
                      price,
                      stock: prev.variants[0]?.stock ?? (prev.stock || 1),
                    },
                  ],
                }))
              }
              error={errors['variants.0.price']}
            />
          )}

          {getProductDiscountBasePrice(formData.variants, formData.rentalPriceTiers).basePrice > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ProductDiscountFields
                variants={formData.variants}
                rentalPriceTiers={formData.rentalPriceTiers}
                discount={formData.discount}
                discountDays={formData.discountDays}
                onDiscountChange={(value) => handleInputChange('discount', value)}
                onDiscountDaysChange={(value) => handleInputChange('discountDays', value)}
                discountError={errors.discount}
                discountDaysError={errors.discountDays}
              />
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsVip}
                onChange={(e) => setWantsVip(e.target.checked)}
                className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
              />
              <span>
                <span className="block md:text-[18px] text-[16px] text-black font-medium">
                  VIP პროდუქცია
                </span>
                <span className="block text-sm text-gray-600 mt-1">
                  ღირებულება: {VIP_MONTHLY_PRICE_GEL} ლარი 1 თვეში. თქვენი პროდუქტი გამოჩნდება საიტზე პრიორიტეტულად.
                </span>
                {wantsVip && (
                  <span className="block text-sm text-[#1B3729] font-medium mt-2">
                    დამატების შემდეგ გადახდის გვერდზე გადახდით {VIP_MONTHLY_PRICE_GEL} ლარს VIP სტატუსისთვის.
                  </span>
                )}
              </span>
            </label>
          </div>

          {/* Images */}
          {!showVariantOptions && (
          <div className="bg-white  rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">
              სურათები <span className="text-red-600">*</span>
            </h2>
            <div className="md:max-w-[60%] w-full mx-auto">

            <ImageUploadForProduct
              value={formData.imageUrls}
              onChange={handleImageChange}
            />

            {errors.imageUrls && (
              <p className="text-red-500 md:text-[18px] text-[16px] mt-2">{errors.imageUrls}</p>
            )}


            </div>
          </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-6">
            <ProductPhotoBackgroundConsent
              checked={agreedToPhotoBackgroundChange}
              onChange={(checked) => {
                setAgreedToPhotoBackgroundChange(checked)
                if (checked && errors.photoBackgroundConsent) {
                  setErrors((prev) => ({ ...prev, photoBackgroundConsent: '' }))
                }
              }}
              error={errors.photoBackgroundConsent}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin"
              className="bg-gray-500 text-white px-6 py-3 rounded-lg text-[20px] text-black font-bold hover:bg-gray-600 transition-colors"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !agreedToPhotoBackgroundChange}
              className="bg-black text-white px-6 py-3 rounded-lg text-[20px] text-black font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'მუშავდება...' : 'პროდუქტის დამატება'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewProductPage
