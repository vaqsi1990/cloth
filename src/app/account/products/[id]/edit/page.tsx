"use client"
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import { z } from 'zod'
import { Product, ProductVariant } from '@/types/product'
import ImageUploadForProduct from '@/component/productimage'
import ProductCategorySelect from '@/component/ProductCategorySelect'
import { showToast } from '@/utils/toast'
import { PRODUCT_FORM_COLORS } from '@/lib/product-colors'
import {
  isValidProductText,
  PRODUCT_DESCRIPTION_ERROR_MESSAGE,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import {
  productPickupAddressField,
  refineProductPickupAddress,
} from '@/lib/product-pickup'
import {
  productImageUrlsField,
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
import { getProductDiscountBasePrice } from '@/lib/discount-helpers'
import { isProductVipActive, VIP_MONTHLY_PRICE_GEL } from '@/lib/product-vip'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  filterProductCategoriesByGender,
  isCategoryValidForProductGender,
  isFootwearCategoryId,
  isSizeOptionalCategoryId,
  clearVariantSizes,
  mergeProductCategoriesWithDefaults,
  PRODUCT_GENDER_OPTIONS,
} from '@/lib/product-categories'
import { optionalCategoryIdField } from '@/lib/product-schema-fields'
import {
  mapProductVariantsToFormRows,
  productHasSkuVariants,
  getVariantImageUrls,
  getOrderedProductImageUrls,
  type ProductVariantFormRow,
  patchVariantFormRow,
} from '@/lib/product-variants'
import {
  buildPricingModeFormPatch,
  flagsToProductPricingMode,
  prepareProductPricingSubmit,
  productPricingModeToFlags,
  resolveExclusivePricingFlagsFromProduct,
  type ProductPricingMode,
} from '@/lib/product-form-pricing'
import {
  buildProductFormSizeOptions,
  getProductFormSizeLabel,
  getProductFormSizeSelectValue,
  isValidProductFormSize,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'
import { applyProductListingTypeChange } from '@/lib/product-listing-type-change'
import SizePillSelector from '@/components/SizePillSelector'

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
  sizeSystem: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['EU', 'US', 'UK', 'CN']).optional()
  ),
  size: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
 
  isNew: z.boolean().default(false),
  isSecondHand: z.boolean().default(false),
  discount: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().min(0).optional()
  ),
  discountDays: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().int().min(1).optional()
  ),
  rating: z.number().min(0).max(5).optional(),
  categoryId: optionalCategoryIdField,
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').nullable().optional(),
  maxRentalDays: z.number().nullable().optional(),
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
      discount: z.number().min(0).max(100).optional(),
      sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
    })
  ).default([]),
  imageUrls: z.array(z.string().min(1, 'არასწორი URL')).default([]),
  isSkuVariantProduct: z.boolean().optional(),
  requireVariantSalePrices: z.boolean().optional(),
  requireVariantSize: z.boolean().optional(),
  rentalPriceTiers: z.preprocess(
    (val) => {
      // If it's an array with all pricePerDay = 0, convert to empty array
      if (Array.isArray(val) && val.length > 0) {
        const hasValidPrice = val.some((tier: any) => tier?.pricePerDay > 0)
        return hasValidPrice ? val : []
      }
      return val || []
    },
    z.array(z.object({
      minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
      pricePerDay: z.number().min(0, 'ფასი დღეში უნდა იყოს დადებითი ან ნული')
    })).default([])
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

const EditProductPage = () => {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState(DEFAULT_PRODUCT_CATEGORIES)
  const [loading, setLoading] = useState(true)
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
    isRentable: true,
    pricePerDay: undefined,
    maxRentalDays: undefined,
    status: 'AVAILABLE',
    variants: [],
    imageUrls: [],
    rentalPriceTiers: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [wantsVip, setWantsVip] = useState(false)
  const [wantsRenewal, setWantsRenewal] = useState(false)
  const [vipWasActiveOnLoad, setVipWasActiveOnLoad] = useState(false)
  const [hasPendingVipPayment, setHasPendingVipPayment] = useState(false)
  const [isResumingVipPayment, setIsResumingVipPayment] = useState(false)
  const [customColor, setCustomColor] = useState('')
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [showVariantOptions, setShowVariantOptions] = useState(false)
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)
  const [showRentalOptions, setShowRentalOptions] = useState(false)
  const productListingType: ProductListingType = showVariantOptions ? 'multi' : 'simple'

  const handleProductListingTypeChange = (type: ProductListingType) => {
    const result = applyProductListingTypeChange({
      type,
      formData,
      color: useCustomColor ? customColor.trim() : formData.color || '',
      showPurchaseOptions,
      showRentalOptions,
    })

    setShowVariantOptions(result.showVariantOptions)
    setShowPurchaseOptions(result.showPurchaseOptions)
    setShowRentalOptions(result.showRentalOptions)
    setFormData((prev) => ({
      ...prev,
      ...result.formData,
    }))
  }

  type SizeSystem = NonNullable<ProductFormData['sizeSystem']>

  const sizeOptionsInput = useMemo(
    () => ({ categoryId: formData.categoryId, categories }),
    [formData.categoryId, categories],
  )

  const combinedSizeOptions = useMemo(
    () => buildProductFormSizeOptions(formData.gender, sizeOptionsInput),
    [formData.gender, sizeOptionsInput],
  )

  const sizeFieldLabel = useMemo(
    () => getProductFormSizeLabel(formData.gender, sizeOptionsInput),
    [formData.gender, sizeOptionsInput],
  )

  const genderCategories = useMemo(
    () => filterProductCategoriesByGender(categories, formData.gender),
    [categories, formData.gender],
  )

  const [selectedSizeSystem, setSelectedSizeSystem] = useState<ProductFormData['sizeSystem'] | ''>('')
  const [selectedSizeValue, setSelectedSizeValue] = useState<string>('')

  useEffect(() => {
    if (formData.sizeSystem && formData.size) {
      const isFootwear = isFootwearCategoryId(formData.categoryId, categories)
      setSelectedSizeSystem(
        formData.gender === 'CHILDREN' && !isFootwear ? '' : formData.sizeSystem,
      )
      setSelectedSizeValue(formData.size)
    } else {
      setSelectedSizeSystem('')
      setSelectedSizeValue('')
    }
  }, [formData.sizeSystem, formData.size, formData.gender, formData.categoryId, categories])

  const handleCombinedSizeSelect = (value: string) => {
    if (!value) {
      setSelectedSizeSystem('')
      setSelectedSizeValue('')
      handleInputChange('sizeSystem', undefined)
      handleInputChange('size', undefined)
      setFormData(prev => ({
        ...prev,
        variants: prev.variants.map(variant => ({
          ...variant,
          sizeSystem: undefined,
        })),
      }))
      return
    }

    const parsed = parseProductFormSizeSelection(value, formData.gender)
    setSelectedSizeSystem(parsed.sizeSystem ?? '')
    setSelectedSizeValue(parsed.size ?? '')
    handleInputChange('sizeSystem', parsed.sizeSystem)
    handleInputChange('size', parsed.size)
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(variant => ({
        ...variant,
        sizeSystem: parsed.sizeSystem,
      })),
    }))
  }

  useEffect(() => {
    if (!selectedSizeValue) return
    if (!isValidProductFormSize(selectedSizeValue, formData.gender, sizeOptionsInput)) {
      handleCombinedSizeSelect('')
    }
  }, [formData.gender, formData.categoryId, selectedSizeValue, categories])

  const colors = PRODUCT_FORM_COLORS

  const isSizeOptional = useMemo(
    () => isSizeOptionalCategoryId(formData.categoryId, categories),
    [formData.categoryId, categories],
  )

  const isVipActive = useMemo(
    () => (product ? isProductVipActive(product) : false),
    [product],
  )

  const vipExpiryLabel = product?.vipExpiresAt
    ? new Date(product.vipExpiresAt).toLocaleDateString('ka-GE')
    : null

  const handleResumeVipPayment = async () => {
    setIsResumingVipPayment(true)
    try {
      const payResponse = await fetch('/api/product-vip/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: parseInt(productId, 10) }),
      })
      const payResult = await payResponse.json()
      if (payResult.success && payResult.redirectUrl) {
        window.location.href = payResult.redirectUrl
        return
      }
      showToast(payResult.error || 'VIP გადახდის დაწყება ვერ მოხერხდა', 'error')
    } catch {
      showToast('VIP გადახდის დაწყება ვერ მოხერხდა', 'error')
    } finally {
      setIsResumingVipPayment(false)
    }
  }

  useEffect(() => {
    if (!productId) return
    const fetchVipStatus = async () => {
      try {
        const response = await fetch(`/api/product-vip/status?productId=${productId}`)
        const data = await response.json()
        if (data.success) {
          setHasPendingVipPayment(Boolean(data.hasPendingPayment) && !data.isVipActive)
        }
      } catch {
        // ignore
      }
    }
    void fetchVipStatus()
  }, [productId, product?.isVip, product?.vipExpiresAt])

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success && data.categories?.length > 0) {
        setCategories(mergeProductCategoriesWithDefaults(data.categories))
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`, { cache: 'no-store' })
        const data = await response.json()
        if (data.success) {
          const product = data.product
          const imageUrls = getOrderedProductImageUrls(product)
          setProduct(product)
          const vipActive = isProductVipActive(product)
          setWantsVip(vipActive)
          setVipWasActiveOnLoad(vipActive)
          setWantsRenewal(false)
          const productColor = product.color || ''
          // Check if color is in the predefined list
          const isPredefinedColor = colors.some(c => c.label === productColor)
          if (productColor && !isPredefinedColor) {
            setCustomColor(productColor)
            setUseCustomColor(true)
          } else {
            setCustomColor('')
            setUseCustomColor(false)
          }
          setFormData({
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            brand: product.brand || '',
            stock: product.stock || 0,
            gender: product.gender || 'UNISEX',
            color: productColor,
            location: product.location || '',
            allowsPickup: product.allowsPickup ?? false,
            pickupAddress: product.pickupAddress || undefined,
            sizeSystem: product.sizeSystem,
            size: product.size || undefined,
            isNew: product.isNew,
            isSecondHand: product.isSecondHand ?? false,
            discount: product.discount,
            discountDays: product.discountDays,
            rating: product.rating || 0,
            categoryId: product.category?.id ?? product.categoryId ?? undefined,
            isRentable: product.isRentable ?? true,
            pricePerDay: product.pricePerDay || undefined,
            maxRentalDays: product.maxRentalDays || undefined,
            status: product.status || 'AVAILABLE',
            variants: mapProductVariantsToFormRows(product),
            imageUrls: imageUrls,
            rentalPriceTiers: product.rentalPriceTiers && product.rentalPriceTiers.length > 0 
              ? product.rentalPriceTiers 
              : [{ minDays: 1, pricePerDay: 0 }]
          })
          const mappedVariants = mapProductVariantsToFormRows(product)
          const pricingFlags = resolveExclusivePricingFlagsFromProduct({
            variants: mappedVariants,
            isRentable: product.isRentable,
            rentalPriceTiers: product.rentalPriceTiers,
          })
          setShowPurchaseOptions(pricingFlags.showPurchaseOptions)
          setShowRentalOptions(pricingFlags.showRentalOptions)
          setShowVariantOptions(productHasSkuVariants(product))
        }
      } catch (error) {
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
      }
    }

    if (productId) {
      fetchProduct()
      fetchCategories()
    }
  }, [productId])

  const generateSlug = (name: string) => {
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
    
    // Validate Georgian characters in real-time
    if (name && !isValidProductText(name)) {
      setErrors(prev => ({
        ...prev,
        name: PRODUCT_NAME_ERROR_MESSAGE,
      }))
    } else {
      // Clear errors when valid
      if (errors.name) {
        setErrors(prev => ({ ...prev, name: '' }))
      }
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'sizeSystem'
        ? {
            variants: prev.variants.map(variant => ({
              ...variant,
              sizeSystem:
                typeof value === 'string' && value.trim() !== ''
                  ? (value as ProductFormData['sizeSystem'])
                  : undefined
            }))
          }
        : {})
    }))
    
    // Validate Georgian characters for description in real-time
    if (field === 'description' && typeof value === 'string') {
      if (value && !isValidProductText(value)) {
        setErrors(prev => ({
          ...prev,
          description: PRODUCT_DESCRIPTION_ERROR_MESSAGE,
        }))
      } else {
        // Clear errors when valid
        if (errors.description) {
          setErrors(prev => ({ ...prev, description: '' }))
        }
      }
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: '' }))
      }
    }
  }

  const clearSizeFields = () => {
    setSelectedSizeSystem('')
    setSelectedSizeValue('')
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
      selectedSizeValue &&
      !isValidProductFormSize(selectedSizeValue, formData.gender, {
        categoryId,
        categories,
      })
    ) {
      clearSizeFields()
    }
  }

  const handleGenderChange = (gender: 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX') => {
    const previousGender = formData.gender
    setFormData((prev) => ({
      ...prev,
      gender,
      categoryId: isCategoryValidForProductGender(prev.categoryId, gender, categories)
        ? prev.categoryId
        : undefined,
    }))
    if (previousGender !== gender) {
      clearSizeFields()
    }
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: useCustomColor ? customColor.trim() : formData.color || undefined,
          size: isSizeOptional ? undefined : formData.size || undefined,
          price: 0,
          stock: 1,
          imageUrl: undefined,
          sizeSystem: isSizeOptional ? undefined : formData.sizeSystem,
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

  const handleImageChange = (urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: urls
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
      // If no tiers exist, create one with the updated value
      if (currentTiers.length === 0) {
        const newTier = { minDays: 1, pricePerDay: 0 }
        return {
          ...prev,
          rentalPriceTiers: [{ ...newTier, [field]: value }]
        }
      }
      
      return {
        ...prev,
        rentalPriceTiers: currentTiers.map((tier, i) =>
          i === index ? { ...tier, [field]: value } : tier
        )
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    if (isImageUploading) {
      showToast('დაელოდეთ სურათის ატვირთვის დასრულებას', 'error')
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
      
      const dataToValidate = {
        ...formData,
        isSkuVariantProduct: showVariantOptions,
        requireVariantSalePrices: showPurchaseOptions && showVariantOptions,
        requireVariantSize: !isSizeOptional,
        isRentable: pricing.isRentable,
        imageUrls: showVariantOptions ? getVariantImageUrls(variantsToSubmit) : formData.imageUrls,
        // Convert empty string to undefined for sizeSystem
        sizeSystem: formData.sizeSystem && formData.sizeSystem.trim() !== '' 
          ? formData.sizeSystem 
          : undefined,
        // Convert empty string to undefined for size
        size: formData.size && formData.size.trim() !== '' 
          ? formData.size 
          : undefined,
        // Convert null to undefined for discount
        discount: formData.discount !== null && formData.discount !== undefined 
          ? formData.discount 
          : undefined,
        discountDays: formData.discountDays !== null && formData.discountDays !== undefined 
          ? formData.discountDays 
          : undefined,
        pricePerDay: formData.pricePerDay || undefined,
        maxRentalDays: formData.maxRentalDays || undefined,
        rentalPriceTiers: pricing.rentalPriceTiers ?? [],
        variants: variantsToSubmit.map(({ discount: _discount, ...variant }) => variant),
        color: useCustomColor ? customColor.trim() : formData.color,
        ...(showVariantOptions || isSizeOptional
          ? {
              size: showVariantOptions ? undefined : formData.size,
              sizeSystem: showVariantOptions ? undefined : formData.sizeSystem,
            }
          : {}),
      }
      
      const validatedData = productSchema.parse(dataToValidate)
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      })
      
      const result = await response.json()
      
      if (result.success) {
        const needsVipPayment = (!vipWasActiveOnLoad && wantsVip) || wantsRenewal
        if (needsVipPayment) {
          const payResponse = await fetch('/api/product-vip/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: parseInt(productId, 10) }),
          })
          const payResult = await payResponse.json()

          if (payResult.success && payResult.redirectUrl) {
            showToast('პროდუქტი განახლდა. გადადით VIP გადახდაზე', 'success')
            window.location.href = payResult.redirectUrl
            return
          }

          showToast(payResult.error || 'VIP გადახდის დაწყება ვერ მოხერხდა', 'error')
          router.push('/account/products')
          return
        }

        showToast('პროდუქტი წარმატებით განახლდა!', 'success')
        router.push('/account/profile')
      } else {
        if (result.errors) {
          const newErrors = mapZodIssuesToProductFormErrors(result.errors)
          setErrors(newErrors)
          if (Object.keys(newErrors).length > 0) {
            showToast(formatProductFormFieldErrors(newErrors), 'error')
          }
        } else {
          showToast(result.message || 'შეცდომა პროდუქტის განახლებისას', 'error')
        }
      }
    } catch (error) {
      console.error('Error updating product:', error)
      if (error instanceof z.ZodError) {
        const newErrors = mapZodIssuesToProductFormErrors(error.issues)
        setErrors(newErrors)
        if (Object.keys(newErrors).length > 0) {
          showToast(formatProductFormFieldErrors(newErrors), 'error')
        }
      } else {
        showToast('შეცდომა პროდუქტის განახლებისას', 'error')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-black mb-4">იტვირთება...</h2>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">პროდუქტი ვერ მოიძებნა</h1>
          <button 
            onClick={() => router.push('/account')}
            className="text-black hover:text-black"
          >
            დაბრუნდი ანგარიშში
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="mx-auto px-4 py-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              უკან დაბრუნება
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
                  className={`w-full px-4 py-3  border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{errors.name}</p>}
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
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.stock ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.stock && <p className="text-red-500 md:text-[18px] text-[16px] mt-1">{errors.stock}</p>}
              </div>

              {showVariantOptions && (
                <div className="md:col-span-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  რაოდენობა მიეთითება ქვემოთ, თითოეული ვარიანტისთვის ცალ-ცალკე.
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  სქესი
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleGenderChange(e.target.value as 'MEN' | 'WOMEN' | 'CHILDREN' | 'UNISEX')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {PRODUCT_GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  კატეგორია
                </label>
                <ProductCategorySelect
                  categories={genderCategories}
                  gender={formData.gender}
                  value={formData.categoryId || ''}
                  onChange={handleCategoryChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {!showVariantOptions && (
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ფერი
                </label>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ფერი</option>
                  {colors.map(color => (
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
                    className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                )}
              </div>
              )}

              {!showVariantOptions && !isSizeOptional && (
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">
                    {sizeFieldLabel} (არასავალდებულო)
                  </label>
                  <SizePillSelector
                    value={getProductFormSizeSelectValue(
                      formData.gender,
                      selectedSizeSystem || undefined,
                      selectedSizeValue || undefined,
                    )}
                    onChange={handleCombinedSizeSelect}
                    options={combinedSizeOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    compact={formData.gender === 'CHILDREN'}
                  />
                </div>
              )}

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  მდებარეობა
                </label>
                <select
                  value={formData.location || ''}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">მდებარეობის არჩევა</option>
                  <option value="თბილისი">თბილისი</option>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {errors.pickupAddress && (
                    <p className="text-red-500 text-sm mt-1">{errors.pickupAddress}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    მიუთითეთ ზუსტი მისამართი, სადაც მყიდველი გაიტანს პროდუქტს.
                  </p>
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
                className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
           
          </div>

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
                    className="bg-black text-white px-4 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ფასის გეგმის დამატება</span>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[20px] font-medium text-black mb-2">ფასი დღეში</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.pricePerDay}
                        onChange={(e) => updateRentalPriceTier(index, 'pricePerDay', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="flex items-end">
                      {(formData.rentalPriceTiers && formData.rentalPriceTiers.length > 0 ? formData.rentalPriceTiers.length : 1) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRentalPriceTier(index)}
                          className="bg-red-500 text-white px-3 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                        >
                          <X className="w-4 h-4" />
                          <span>წაშლა</span>
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
                    className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>
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
            {isVipActive ? (
              <div>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={wantsVip}
                    disabled
                    className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span>
                    <span className="block md:text-[18px] text-[16px] text-black font-medium">
                      VIP პროდუქცია
                    </span>
                    <span className="block text-sm text-[#1B3729] font-medium mt-1">
                      VIP აქტიურია ვადამდე: {vipExpiryLabel}
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={wantsRenewal}
                    onChange={(e) => setWantsRenewal(e.target.checked)}
                    className="mt-1 w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm text-gray-600">
                    განაახლე VIP — {VIP_MONTHLY_PRICE_GEL} ლარი 1 თვეში
                  </span>
                </label>
              </div>
            ) : (
              <div>
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
                        განახლების შემდეგ გადახდის გვერდზე გადახდით {VIP_MONTHLY_PRICE_GEL} ლარს VIP სტატუსისთვის.
                      </span>
                    )}
                  </span>
                </label>
                {hasPendingVipPayment && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-900 mb-3">
                      VIP გადახდა დაწყებულია, მაგრამ ჯერ არ არის დასრულებული. ფილტრში გამოჩნდება მხოლოდ გადახდის შემდეგ.
                    </p>
                    <button
                      type="button"
                      onClick={handleResumeVipPayment}
                      disabled={isResumingVipPayment}
                      className="bg-[#1B3729] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {isResumingVipPayment ? 'იტვირთება...' : `გადახდის გაგრძელება (${VIP_MONTHLY_PRICE_GEL} ლარი)`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Images */}
          {!showVariantOptions && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">სურათები</h2>
            <ImageUploadForProduct
              value={formData.imageUrls}
              onChange={handleImageChange}
              onUploadingChange={setIsImageUploading}
            />
          </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/account/profile"
              className="bg-gray-500 text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-600 transition-colors"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || isImageUploading}
              className="bg-black text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-800 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'მუშავდება...' : 'პროდუქტის განახლება'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProductPage
