"use client"
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'

import ImageUploadForProduct from '@/component/productimage'
import ProductCategorySelect from '@/component/ProductCategorySelect'
import { showToast } from '@/utils/toast'
import { PURPOSE_OPTIONS } from '@/data/purposes'
import { PRODUCT_FORM_COLORS } from '@/lib/product-colors'
import {
  isValidProductText,
  PRODUCT_DESCRIPTION_ERROR_MESSAGE,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  isSizeOptionalCategoryId,
  PRODUCT_GENDER_OPTIONS,
} from '@/lib/product-categories'
import {
  productPickupAddressField,
  refineProductPickupAddress,
} from '@/lib/product-pickup'
import ProductDiscountFields from '@/components/ProductDiscountFields'
import { VIP_MONTHLY_PRICE_GEL } from '@/lib/product-vip'
import { getProductDiscountBasePrice } from '@/lib/discount-helpers'
import { optionalCategoryIdField } from '@/lib/product-schema-fields'
import {
  buildProductFormSizeOptions,
  getProductFormSizeSelectValue,
  isChildrenAgeSize,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'

const purposes = PURPOSE_OPTIONS
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
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
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
  purposeSlug: z.string().optional(),
  isRentable: z.boolean().default(true), // 🆕
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(), // 🆕
  maxRentalDays: z.number().optional(), // 🆕
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  variants: z.array(
    z.object({
      size: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().optional()
      ),
      price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
      discount: z.number().min(0).optional(),
      sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
    })
  ).default([]),
  imageUrls: z.array(z.string().url('არასწორი URL')).default([]),
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
}).superRefine(refineProductPickupAddress)


type ProductFormData = z.infer<typeof productSchema>

const NewProductPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    brand: '',
    description: '',
    stock: 0,
    gender: 'UNISEX',
    color: '',
    location: '',
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
    purposeSlug: undefined,
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
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)
  const [sizeSystem, setSizeSystem] = useState(formData.sizeSystem ?? '')
  const [selectedSize, setSelectedSize] = useState('')
  const [customColor, setCustomColor] = useState('')
  const [useCustomColor, setUseCustomColor] = useState(false)

  type SizeSystem = NonNullable<ProductFormData['sizeSystem']>

  const combinedSizeOptions = useMemo(
    () => buildProductFormSizeOptions(formData.gender),
    [formData.gender],
  )

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
    if (formData.gender === 'CHILDREN') {
      if (selectedSize && !isChildrenAgeSize(selectedSize)) {
        handleCombinedSizeSelect('')
      }
      return
    }

    if (selectedSize && isChildrenAgeSize(selectedSize)) {
      handleCombinedSizeSelect('')
    }
  }, [formData.gender, selectedSize])

  const colors = PRODUCT_FORM_COLORS

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
    const selectionValue =
      getProductFormSizeSelectValue(formData.gender, sizeSystem, selectedSize) ||
      combinedSizeOptions[0]?.value
    const parsed = parseProductFormSizeSelection(selectionValue, formData.gender)

    const defaultSize = isSizeOptional ? undefined : parsed.size || selectedSize || undefined

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          size: defaultSize,
          price: 0,
          discount: undefined,
          sizeSystem: isSizeOptional ? undefined : prev.sizeSystem,
        },
      ],
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const updateVariant = (index: number, field: string, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }))
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

    try {
      // Clean up rentalPriceTiers if all prices are 0
      const hasRentalPrice = formData.rentalPriceTiers && formData.rentalPriceTiers.length > 0 && formData.rentalPriceTiers.some(tier => tier.pricePerDay > 0)
      
      // Prepare data for validation
      const dataToValidate: any = {
        ...formData,
        rentalPriceTiers: hasRentalPrice
          ? (formData.rentalPriceTiers || []).map((tier) => ({
              ...tier,
              minDays: tier.minDays < 1 ? 1 : tier.minDays,
            }))
          : undefined,
        color: useCustomColor ? customColor.trim() : formData.color,
        ...(isSizeOptional
          ? {
              size: undefined,
              sizeSystem: undefined,
              variants: formData.variants.map((variant) => ({
                ...variant,
                size: undefined,
                sizeSystem: undefined,
              })),
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
          const newErrors: Record<string, string> = {}
          const errorMessages: string[] = []
          result.errors.forEach((err: { path: string[]; message: string }) => {
            if (err.path.length > 0) {
              const fieldPath = err.path.join('.')
              newErrors[fieldPath] = err.message
              // Add to error messages for toaster
              const fieldName = fieldPath === 'name' ? 'სახელი' : 
                               fieldPath === 'description' ? 'აღწერა' :
                               fieldPath === 'slug' ? 'Slug' :
                               fieldPath === 'imageUrls' ? 'სურათები' :
                               fieldPath === 'rentalPriceTiers' ? 'ფასის გეგმა' :
                               fieldPath.startsWith('rentalPriceTiers.') ? 'ფასის გეგმა' :
                               fieldPath.startsWith('variants.') ? 'ვარიანტი' :
                               fieldPath
              errorMessages.push(`${fieldName}: ${err.message}`)
            } else {
              errorMessages.push(err.message)
            }
          })
          setErrors(newErrors)
          // Show all errors in toaster
          if (errorMessages.length > 0) {
            showToast(errorMessages.join('; '), 'error')
          }
        } else {
          showToast(result.message || 'შეცდომა პროდუქტის შექმნისას', 'error')
        }
      }

    } catch (error) {
      console.error('Error:', error)
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        const errorMessages: string[] = []
        error.issues.forEach(err => {
          if (err.path.length > 0) {
            const fieldPath = err.path.join('.')
            newErrors[fieldPath] = err.message
            // Add to error messages for toaster
            const fieldName = fieldPath === 'name' ? 'სახელი' : 
                             fieldPath === 'description' ? 'აღწერა' :
                             fieldPath === 'slug' ? 'Slug' :
                             fieldPath === 'imageUrls' ? 'სურათები' :
                             fieldPath === 'rentalPriceTiers' ? 'ფასის გეგმა' :
                             fieldPath.startsWith('rentalPriceTiers.') ? 'ფასის გეგმა' :
                             fieldPath.startsWith('variants.') ? 'ვარიანტი' :
                             fieldPath
            errorMessages.push(`${fieldName}: ${err.message}`)
          } else {
            errorMessages.push(err.message)
          }
        })
        setErrors(newErrors)
        // Show all errors in toaster
        if (errorMessages.length > 0) {
          showToast(errorMessages.join('; '), 'error')
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

              <div>
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
                  კატეგორია
                </label>
                <ProductCategorySelect
                  categories={categories}
                  value={formData.categoryId || ''}
                  onChange={handleCategoryChange}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  დანიშნულება
                </label>
                <select
                  value={formData.purposeSlug || ''}
                  onChange={(e) => handleInputChange('purposeSlug', e.target.value ? e.target.value : undefined)}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">აირჩიეთ დანიშნულება</option>
                  {purposes.map((purpose) => (
                    <option key={purpose.slug} value={purpose.slug}>
                      {purpose.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  სქესი
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value as 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX')}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  {PRODUCT_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">ფერი</label>
                <select
                  value={useCustomColor ? 'სხვა ფერი' : (formData.color || '')}
                  onChange={(e) => {
                    const selectedValue = e.target.value
                    if (selectedValue === 'სხვა ფერი') {
                      setUseCustomColor(true)
                      handleInputChange('color', customColor)
                    } else {
                      setUseCustomColor(false)
                      handleInputChange('color', selectedValue)
                      setCustomColor('')
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="">აირჩიეთ ფერი</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.label}>
                      {color.label}
                    </option>
                  ))}
                </select>
                {useCustomColor && (
                  <input
                    type="text"
                    value={customColor}
                    onChange={(e) => {
                      const value = e.target.value
                      setCustomColor(value)
                      handleInputChange('color', value)
                    }}
                    placeholder="შეიყვანეთ ფერი"
                    className="w-full mt-2 pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                )}
              </div>

              {!isSizeOptional && (
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">
                    {formData.gender === 'CHILDREN' ? 'ასაკი (არასავალდებულო)' : 'ზომა (არასავალდებულო)'}
                  </label>
                  <select
                    value={getProductFormSizeSelectValue(formData.gender, sizeSystem, selectedSize)}
                    onChange={(e) => handleCombinedSizeSelect(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">
                      {formData.gender === 'CHILDREN' ? 'აირჩიეთ ასაკი' : 'აირჩიეთ ზომა'}
                    </option>
                    {combinedSizeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

          {/* Variants */}

          {/* Rental Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
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
                      <label className="block text-[20px] font-medium text-black mb-2">ფასი დღეში</label>
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

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-3 text-[20px] text-black font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPurchaseOptions}
                  onChange={(e) => setShowPurchaseOptions(e.target.checked)}
                  className="h-5 w-5"
                />
                <span>გაყიდვა</span>
              </label>
              {showPurchaseOptions && (
                <button
                  type="button"
                  onClick={addVariant}
                  className="bg-black text-white px-4 py-2 rounded-lg text-[20px] text-black font-bold flex items-center space-x-2"
                >
                  <Plus className="w-7 h-7 font-bold" />
                
                </button>
              )}
            </div>

            {showPurchaseOptions && formData.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">ფასი </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price === 0 ? '' : variant.price || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : (e.target.value ? parseFloat(e.target.value) : undefined)
                      updateVariant(index, 'price', val)
                    }}
                    className="w-full pl-10 pr-4 py-3 placeholder:text-gray-500 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className=" text-white px-3 py-2 rounded-lg text-[20px] text-black flex items-center space-x-2"
                  >
                    <Trash2 className="w-7 h-7 text-red-500" />
                    
                  </button>
                </div>
              </div>
            ))}

            {showPurchaseOptions && formData.variants.length === 0 && (
              <p className="md:text-[18px] text-[16px] text-black">თქვენ შეგიძლიათ დაამატოთ ზომები და საწყობის რაოდენობა.</p>
            )}

          </div>

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
          <div className="bg-white  rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">სურათები</h2>
            <div className="md:max-w-[60%] w-full mx-auto">

            <ImageUploadForProduct
              value={formData.imageUrls}
              onChange={handleImageChange}
              
            />


            </div>
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
              disabled={isSubmitting}
              className="bg-black text-white px-6 py-3 rounded-lg text-[20px] text-black font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
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
