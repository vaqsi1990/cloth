"use client"
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import { z } from 'zod'
import { Product, ProductVariant } from '@/types/product'
import ImageUploadForProduct from '@/component/productimage'
import ProductCategorySelect from '@/component/ProductCategorySelect'
import { showToast } from '@/utils/toast'
import { PRODUCT_COLORS } from '@/lib/product-colors'
import ProductColorPicker, { getProductColorPickerState } from '@/components/ProductColorPicker'
import {
  isValidProductText,
  PRODUCT_NAME_ERROR_MESSAGE,
  PRODUCT_TEXT_REGEX,
} from '@/lib/product-text'
import {
  DEFAULT_PRODUCT_CATEGORIES,
  getProductFormGenderCategories,
  isCategoryValidForProductGender,
  isFootwearCategoryId,
  isSizeOptionalCategoryId,
  clearVariantSizes,
  mergeProductCategoriesWithDefaults,
  PRODUCT_GENDER_OPTIONS,
  resolveProductFormCategoryId,
  resolveCategorySlugForSubmit,
} from '@/lib/product-categories'
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
import { getProductDiscountBasePrice } from '@/lib/discount-helpers'
import {
  mapProductVariantsToFormRows,
  ensureMultiVariantFormRows,
  getVariantImageUrls,
  getOrderedProductImageUrls,
  type ProductVariantFormRow,
  patchVariantFormRow,
} from '@/lib/product-variants'
import {
  buildPricingModeFormPatch,
  flagsToProductPricingMode,
  getSimpleSaleStockValue,
  patchSimpleSaleFormState,
  prepareProductPricingSubmit,
  productPricingModeToFlags,
  resolveExclusivePricingFlagsFromProduct,
  type ProductPricingMode,
} from '@/lib/product-form-pricing'
import ProductMultiPricingSelector from '@/components/ProductMultiPricingSelector'
import {
  optionalCategoryIdField,
} from '@/lib/product-schema-fields'
import { isProductVipActive, VIP_MONTHLY_PRICE_GEL } from '@/lib/product-vip'
import {
  buildProductFormSizeOptions,
  getProductFormSizeLabel,
  getProductFormSizeSelectValue,
  isValidProductFormSize,
  parseProductFormSizeSelection,
} from '@/lib/shop-product-filters'
import ProductFormSizeField from '@/components/ProductFormSizeField'
import { isSupport } from '@/lib/roles'

const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(PRODUCT_TEXT_REGEX, PRODUCT_NAME_ERROR_MESSAGE),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string().optional(),
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
  categorySlug: z.string().optional(),
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
      discount: z.number().min(0).optional(),
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
  const { data: session, status } = useSession()
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
  const [wantsVip, setWantsVip] = useState(false)
  const [wantsRenewal, setWantsRenewal] = useState(false)
  const [vipWasActiveOnLoad, setVipWasActiveOnLoad] = useState(false)
  const [customColor, setCustomColor] = useState('')
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [showVariantOptions] = useState(true)
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)
  const [showRentalOptions, setShowRentalOptions] = useState(false)

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
    () =>
      getProductFormGenderCategories(
        categories,
        formData.gender,
        formData.categoryId,
        product?.category ?? null,
      ),
    [categories, formData.gender, formData.categoryId, product?.category],
  )

  useEffect(() => {
    if (!product || categories.length === 0) return
    const resolved = resolveProductFormCategoryId(
      product.category?.id ?? product.categoryId ?? undefined,
      categories,
      product.category ?? null,
    )
    if (!resolved) return
    setFormData((prev) => {
      if (prev.categoryId != null) {
        const mappedSelection = resolveProductFormCategoryId(
          prev.categoryId,
          categories,
          null,
        )
        if (
          mappedSelection &&
          categories.some((entry) => entry.id === mappedSelection)
        ) {
          return prev.categoryId === mappedSelection
            ? prev
            : { ...prev, categoryId: mappedSelection }
        }
      }
      return prev.categoryId === resolved ? prev : { ...prev, categoryId: resolved }
    })
  }, [product, categories])

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

    const parsed = parseProductFormSizeSelection(value, formData.gender, sizeOptionsInput)
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

  const colors = PRODUCT_COLORS

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

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated' && !isSupport(session?.user?.role)) {
      router.push('/')
    }
  }, [status, session, router])

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
        console.log('=== FETCHING PRODUCT ===')
        console.log('Product ID:', productId)
        const response = await fetch(`/api/products/${productId}`, { cache: 'no-store' })
        console.log('Fetch response status:', response.status)
        const data = await response.json()
        console.log('Fetch response data:', data)
        if (data.success) {
          const product = data.product
          console.log('Product data:', product)
          console.log('Product images:', product.images)
          const orderedImageUrls = getOrderedProductImageUrls(product)
          const mappedVariants = mapProductVariantsToFormRows(product)
          const multiVariants = ensureMultiVariantFormRows({
            product,
            mappedVariants,
            imageUrls: orderedImageUrls,
          })
          console.log('Mapped image URLs:', orderedImageUrls)
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
            categoryId: resolveProductFormCategoryId(
              product.category?.id ?? product.categoryId ?? undefined,
              categories,
              product.category ?? null,
            ),
            isRentable: product.isRentable ?? true,
            pricePerDay: product.pricePerDay || undefined,
            maxRentalDays: product.maxRentalDays || undefined,
            status: product.status || 'AVAILABLE',
            variants: multiVariants,
            imageUrls: [],
            rentalPriceTiers: product.rentalPriceTiers && product.rentalPriceTiers.length > 0 
              ? product.rentalPriceTiers 
              : [{ minDays: 1, pricePerDay: 0 }]
          })
          const pricingFlags = resolveExclusivePricingFlagsFromProduct({
            variants: multiVariants,
            isRentable: product.isRentable,
            rentalPriceTiers: product.rentalPriceTiers,
          })
          setShowPurchaseOptions(pricingFlags.showPurchaseOptions)
          setShowRentalOptions(pricingFlags.showRentalOptions)
          console.log('Form data set successfully')
        } else {
          console.log('API returned success: false')
        }
      } catch (error) {
        console.error('=== ERROR FETCHING PRODUCT ===')
        console.error('Error fetching product:', error)
      } finally {
        setLoading(false)
        console.log('Loading set to false')
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
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
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
      categoryId: isCategoryValidForProductGender(
        prev.categoryId,
        gender,
        categories,
        product?.category ?? null,
      )
        ? resolveProductFormCategoryId(
            prev.categoryId,
            categories,
            product?.category ?? null,
          )
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
          ? [{ price: 0, stock: prev.stock && prev.stock > 0 ? prev.stock : 1 }]
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
      imageUrls: showVariantOptions && field === 'imageUrl' ? [] : prev.imageUrls,
      variants: prev.variants.map((variant, i) =>
        i === index ? { ...variant, [field]: value } : variant
      )
    }))
  }

  const patchVariant = (index: number, patch: Partial<ProductVariantFormRow>) => {
    setFormData((prev) => {
      const next = patchVariantFormRow(prev, index, patch)
      return patch.imageUrl !== undefined && showVariantOptions
        ? { ...next, imageUrls: [] }
        : next
    })
  }

  const handleImageChange = (urls: string[]) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: urls,
      variants: showVariantOptions
        ? prev.variants
        : prev.variants.map((variant) => ({ ...variant, imageUrl: undefined })),
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
    console.log('=== FORM SUBMISSION STARTED ===')
    console.log('Form submitted!')
    console.log('Product ID:', productId)
    console.log('Form data:', formData)
    console.log('Is submitting:', isSubmitting)
    setIsSubmitting(true)
    setErrors({})

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
      console.log('About to validate form data...')
      console.log('Form data before validation:', JSON.stringify(formData, null, 2))
      console.log('Image URLs in form data:', formData.imageUrls)
      console.log('Rental price tiers:', formData.rentalPriceTiers)
      
      const pricing = prepareProductPricingSubmit({
        showVariantOptions,
        showPurchaseOptions,
        showRentalOptions,
        productStock: formData.stock,
        variants: formData.variants,
        rentalPriceTiers: formData.rentalPriceTiers,
      })
      const variantsToSubmit = pricing.variantsToSubmit
      
      const dataToValidate = {
        ...formData,
        stock:
          !showVariantOptions && showPurchaseOptions
            ? getSimpleSaleStockValue(formData)
            : formData.stock,
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
        categorySlug:
          resolveCategorySlugForSubmit(formData.categoryId, genderCategories) ??
          resolveCategorySlugForSubmit(formData.categoryId, categories),
      }
      
      console.log('Data to validate:', JSON.stringify(dataToValidate, null, 2))
      const validatedData = productSchema.parse(dataToValidate)
      console.log('Validation successful, sending update request:', validatedData)
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      })
      
      const result = await response.json()
      console.log('=== API RESPONSE ===')
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      console.log('Update response:', result)
      
      if (result.success) {
        const needsVipPayment = (!vipWasActiveOnLoad && wantsVip) || wantsRenewal
        if (needsVipPayment) {
          const payResponse = await fetch('/api/product-vip/pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: parseInt(productId, 10), returnTo: 'support' }),
          })
          const payResult = await payResponse.json()

          if (payResult.success && payResult.redirectUrl) {
            showToast('პროდუქტი განახლდა. გადადით VIP გადახდაზე', 'success')
            window.location.href = payResult.redirectUrl
            return
          }

          showToast(payResult.error || 'VIP გადახდის დაწყება ვერ მოხერხდა', 'error')
          router.push('/support/products')
          return
        }

        console.log('=== SUCCESS ===')
        showToast('პროდუქტი წარმატებით განახლდა!', 'success')
        router.push('/support/products')
      } else {
        console.log('=== API ERROR ===')
        console.log('Error result:', result)
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
      console.log('=== CATCH ERROR ===')
      console.error('Error updating product:', error)
      if (error instanceof z.ZodError) {
        console.log('Zod validation error:', error.issues)
        const newErrors = mapZodIssuesToProductFormErrors(error.issues)
        setErrors(newErrors)
        if (Object.keys(newErrors).length > 0) {
          showToast(formatProductFormFieldErrors(newErrors), 'error')
        }
      } else {
        console.error('General error:', error)
        showToast('შეცდომა პროდუქტის განახლებისას', 'error')
      }
    } finally {
      console.log('=== FINALLY BLOCK ===')
      setIsSubmitting(false)
    }
  }

  if (!session || !isSupport(session.user.role)) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">იტვირთება...</h1>
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
            onClick={() => router.push('/support/products')}
            className="text-black hover:text-black"
          >
            დაბრუნდი საფორთში
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
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.name}</p>}
              </div>

              <div className={showVariantOptions || showPurchaseOptions ? 'hidden' : ''}>
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
                {errors.stock && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.stock}</p>}
              </div>

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

              <ProductColorPicker
                value={
                  getProductColorPickerState(formData.color).value === 'სხვა ფერი'
                    ? ''
                    : getProductColorPickerState(formData.color).value
                }
                customColor={getProductColorPickerState(formData.color).customColor}
                onSelect={(selectedValue) => {
                  setUseCustomColor(false)
                  setCustomColor('')
                  handleInputChange('color', selectedValue)
                }}
                onCustomColorChange={(value) => {
                  setUseCustomColor(true)
                  setCustomColor(value)
                  handleInputChange('color', value)
                }}
              />

              {!isSizeOptional && (
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">
                    {sizeFieldLabel} (არასავალდებულო)
                  </label>
                  <ProductFormSizeField
                    gender={formData.gender}
                    sizeOptionsInput={sizeOptionsInput}
                    value={getProductFormSizeSelectValue(
                      formData.gender,
                      selectedSizeSystem || undefined,
                      selectedSizeValue || undefined,
                      sizeOptionsInput,
                    )}
                    onChange={handleCombinedSizeSelect}
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
                className="w-full px-4 text-black py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

          </div>

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
                        className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {!showVariantOptions && showPurchaseOptions && (
            <SimpleProductSalePriceSection
              price={formData.variants[0]?.price ?? 0}
              stock={getSimpleSaleStockValue(formData)}
              onPriceChange={(price) =>
                setFormData((prev) => patchSimpleSaleFormState(prev, { price }))
              }
              onStockChange={(stock) =>
                setFormData((prev) =>
                  patchSimpleSaleFormState(prev, { stock: stock ?? 0 }),
                )
              }
              error={errors['variants.0.price']}
              stockError={errors['variants.0.stock'] || errors.stock}
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
            )}
          </div>

          {/* Images */}
          {!showVariantOptions && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">სურათები</h2>
            <ImageUploadForProduct
              value={formData.imageUrls}
              onChange={handleImageChange}
            />
          </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/support/products"
              className="bg-gray-500 text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-600 transition-colors"
            >
              გაუქმება
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
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
