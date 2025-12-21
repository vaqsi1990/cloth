"use client"
import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import { z } from 'zod'
import { Product, ProductVariant } from '@/types/product'
import ImageUploadForProduct from '@/component/productimage'
import { showToast } from '@/utils/toast'
import { PURPOSE_OPTIONS } from '@/data/purposes'
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(/^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/, 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || /^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/.test(val), {
      message: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'
    }),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  sizeSystem: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.enum(['EU', 'US', 'UK', 'CN']).optional()
  ),
  size: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.string().optional()
  ),
  isNew: z.boolean().default(false),
  discount: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().min(0).optional()
  ),
  discountDays: z.preprocess(
    (val) => (val === null ? undefined : val),
    z.number().int().min(1).optional()
  ),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  purposeSlug: z.string().optional(),
  isRentable: z.boolean().default(true),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').nullable().optional(),
  maxRentalDays: z.number().nullable().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE', 'DAMAGED']).default('AVAILABLE'),
  variants: z.array(z.object({
    size: z.preprocess(
      (val) => (val === '' || val === null ? undefined : val),
      z.string().optional()
    ),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
    discount: z.number().min(0).max(100).optional(),
    sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([]),
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
})

const purposes = PURPOSE_OPTIONS

type ProductFormData = z.infer<typeof productSchema>

const EditProductPage = () => {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([])
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
    sizeSystem: undefined,
    size: undefined,
    isNew: false,
    discount: undefined,
    discountDays: undefined,
    rating: 0,
    categoryId: undefined,
    purposeSlug: undefined,
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
  const [customColor, setCustomColor] = useState('')

  const sizeOptions = {
    XS: { UK: [4, 6], EU: [32, 34], US: [0, 2] },
    S: { UK: [8, 10], EU: [36, 38], US: [4, 6] },
    M: { UK: [12], EU: [40], US: [8] },
    L: { UK: [14], EU: [42], US: [10] },
    XL: { UK: [16], EU: [44], US: [12] },
    XXL: { UK: [18], EU: [46], US: [14] },
    XXXL: { UK: [20], EU: [48], US: [16] },
  }

  type SizeSystem = NonNullable<ProductFormData['sizeSystem']>
  type MeasurementSystem = Exclude<SizeSystem, 'CN'>
  type CombinedSizeOption = {
    value: string
    label: string
    system: SizeSystem
    size: string
  }

  const combinedSizeOptions = useMemo<CombinedSizeOption[]>(() => {
    const options: CombinedSizeOption[] = []
    const measurementSystems: MeasurementSystem[] = ['EU', 'US', 'UK']

    measurementSystems.forEach((system) => {
      const sizes = Array.from(
        new Set(
          Object.values(sizeOptions)
            .map((entry) => {
              const systemValues = entry[system]
              return systemValues ? systemValues.map((value) => String(value)) : []
            })
            .flat()
            .filter((value): value is string => Boolean(value))
        )
      )

      sizes.forEach((size) => {
        options.push({
          value: `${system}:${size}`,
          label: `${system} - ${size}`,
          system,
          size,
        })
      })
    })

    Object.keys(sizeOptions).forEach((sizeKey) => {
      options.push({
        value: `CN:${sizeKey}`,
        label: `CN - ${sizeKey}`,
        system: 'CN',
        size: sizeKey,
      })
    })

    return options
  }, [])

  const [selectedSizeSystem, setSelectedSizeSystem] = useState<ProductFormData['sizeSystem'] | ''>('')
  const [selectedSizeValue, setSelectedSizeValue] = useState<string>('')

  useEffect(() => {
    if (formData.sizeSystem && formData.size) {
      setSelectedSizeSystem(formData.sizeSystem)
      setSelectedSizeValue(formData.size)
    } else {
      setSelectedSizeSystem('')
      setSelectedSizeValue('')
    }
  }, [formData.sizeSystem, formData.size])

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

    const [system, ...sizeParts] = value.split(':')
    const nextSize = sizeParts.join(':')

    setSelectedSizeSystem(system as SizeSystem)
    setSelectedSizeValue(nextSize)
    handleInputChange('sizeSystem', system as SizeSystem)
    handleInputChange('size', nextSize)
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(variant => ({
        ...variant,
        sizeSystem: system as SizeSystem,
      })),
    }))
  }

  const colors = [
    { id: "black", label: "შავი", color: "#000000" },
    { id: "white", label: "თეთრი", color: "#FFFFFF" },
    { id: "red", label: "წითელი", color: "#FF0000" },
    { id: "blue", label: "ლურჯი", color: "#0000FF" },
    { id: "green", label: "მწვანე", color: "#008000" },
    { id: "yellow", label: "ყვითელი", color: "#FFFF00" },
    { id: "pink", label: "ვარდისფერი", color: "#FFC0CB" },
    { id: "purple", label: "იისფერი", color: "#800080" },
    { id: "gray", label: "ნაცრისფერი", color: "#A52A2A" },
    { id: "beige", label: "ბეჟი", color: "#8B4513" },
    { id: "other", label: "სხვა ფერი", color: "#CCCCCC" }
  ]

  // Fetch categories
  const fetchCategories = async () => {
    try {
      console.log('=== FETCHING CATEGORIES ===')
      const response = await fetch('/api/categories')
      const data = await response.json()
      console.log('Categories response:', data)
      if (data.success) {
        setCategories(data.categories)
        console.log('Categories set successfully:', data.categories)
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
        const response = await fetch(`/api/products/${productId}`)
        console.log('Fetch response status:', response.status)
        const data = await response.json()
        console.log('Fetch response data:', data)
        if (data.success) {
          const product = data.product
          console.log('Product data:', product)
          console.log('Product images:', product.images)
          const imageUrls = product.images?.map((img: { url: string }) => img.url) || []
          console.log('Mapped image URLs:', imageUrls)
          setProduct(product)
          const productColor = product.color || ''
          // Check if color is in the predefined list
          const isPredefinedColor = colors.some(c => c.label === productColor)
          if (productColor && !isPredefinedColor) {
            setCustomColor(productColor)
          } else {
            setCustomColor('')
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
            sizeSystem: product.sizeSystem,
            size: product.size || undefined,
            isNew: product.isNew,
            discount: product.discount,
            discountDays: product.discountDays,
            rating: product.rating || 0,
            categoryId: product.categoryId,
            purposeSlug: product.purpose?.slug,
            isRentable: product.isRentable ?? true,
            pricePerDay: product.pricePerDay || undefined,
            maxRentalDays: product.maxRentalDays || undefined,
            status: product.status || 'AVAILABLE',
            variants: (product.variants || []).map((variant: ProductVariant) => ({
              price: variant.price
            })),
            imageUrls: imageUrls,
            rentalPriceTiers: product.rentalPriceTiers && product.rentalPriceTiers.length > 0 
              ? product.rentalPriceTiers 
              : [{ minDays: 1, pricePerDay: 0 }]
          })
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
    if (name && !/^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/.test(name)) {
      setErrors(prev => ({
        ...prev,
        name: 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'
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
      if (value && !/^[\u10A0-\u10FF\s.,:;!?\-()""''0-9]+$/.test(value)) {
        setErrors(prev => ({
          ...prev,
          description: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს, პუნქტუაციას და ციფრებს'
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

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        { price: 0 }
      ]
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
    console.log('=== FORM SUBMISSION STARTED ===')
    console.log('Form submitted!')
    console.log('Product ID:', productId)
    console.log('Form data:', formData)
    console.log('Is submitting:', isSubmitting)
    setIsSubmitting(true)
    setErrors({})

    try {
      console.log('About to validate form data...')
      console.log('Form data before validation:', JSON.stringify(formData, null, 2))
      console.log('Image URLs in form data:', formData.imageUrls)
      console.log('Rental price tiers:', formData.rentalPriceTiers)
      
      // Clean up rentalPriceTiers if all prices are 0
      const hasRentalPrice = formData.rentalPriceTiers && formData.rentalPriceTiers.some(tier => tier.pricePerDay > 0)
      
      // Ensure rentalPriceTiers is properly formatted and handle null values
      const dataToValidate = {
        ...formData,
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
        // If no rental price is set, remove rentalPriceTiers
        rentalPriceTiers: hasRentalPrice ? (formData.rentalPriceTiers || []) : []
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
        console.log('=== SUCCESS ===')
        showToast('პროდუქტი წარმატებით განახლდა!', 'success')
        router.push('/admin')
      } else {
        console.log('=== API ERROR ===')
        console.log('Error result:', result)
        if (result.errors) {
          const newErrors: Record<string, string> = {}
           result.errors.forEach((err: { path: string[]; message: string }) => {
            if (err.path.length > 0) {
              newErrors[err.path.join('.')] = err.message
            }
          })
          setErrors(newErrors)
        } else {
          showToast(result.message || 'შეცდომა პროდუქტის განახლებისას', 'error')
        }
      }
    } catch (error) {
      console.log('=== CATCH ERROR ===')
      console.error('Error updating product:', error)
      if (error instanceof z.ZodError) {
        console.log('Zod validation error:', error.issues)
        const newErrors: Record<string, string> = {}
        error.issues.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path.join('.')] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('General error:', error)
        showToast('შეცდომა პროდუქტის განახლებისას', 'error')
      }
    } finally {
      console.log('=== FINALLY BLOCK ===')
      setIsSubmitting(false)
    }
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
            onClick={() => router.push('/admin')}
            className="text-black hover:text-black"
          >
            დაბრუნდი ადმინში
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

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  საწყობი *
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${errors.stock ? 'border-red-500' : 'border-gray-300'
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
                  <option value="ქუთაისი">ქუთაისი</option>
                  <option value="რუსთავი">რუსთავი</option>
                  <option value="ბათუმი">ბათუმი</option>
                </select>
              </div>

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
                  კატეგორია
                </label>
                <select
                  value={formData.categoryId || ''}
                  onChange={(e) => handleInputChange('categoryId', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">
                    აირჩიეთ კატეგორია
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="UNISEX">უნივერსალური</option>
                  <option value="MEN">კაცისთვის</option>
                  <option value="WOMEN">ქალისთვის</option>
                  <option value="CHILDREN">ბავშვისთვის</option>
                </select>
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">ფერი</label>
                <select
                  value={
                    formData.color && colors.some(c => c.label === formData.color)
                      ? formData.color
                      : formData.color && !colors.some(c => c.label === formData.color)
                        ? 'სხვა ფერი'
                        : formData.color || ''
                  }
                  onChange={(e) => {
                    const selectedValue = e.target.value
                    if (selectedValue === 'სხვა ფერი') {
                      handleInputChange('color', customColor || 'სხვა ფერი')
                    } else {
                      handleInputChange('color', selectedValue)
                      setCustomColor('')
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ფერი</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.label}>
                      {color.label}
                    </option>
                  ))}
                </select>
                {(formData.color === 'სხვა ფერი' || (formData.color && !colors.some(c => c.label === formData.color))) && (
                  <input
                    type="text"
                    value={customColor || (formData.color && !colors.some(c => c.label === formData.color) ? formData.color : '')}
                    onChange={(e) => {
                      const value = e.target.value
                      setCustomColor(value)
                      handleInputChange('color', value || 'სხვა ფერი')
                    }}
                    placeholder="შეიყვანეთ ფერი"
                    className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                )}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ზომა (არასავალდებულო)
                </label>
                <select
                  value={
                    selectedSizeSystem && selectedSizeValue
                      ? `${selectedSizeSystem}:${selectedSizeValue}`
                      : ''
                  }
                  onChange={(e) => handleCombinedSizeSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ზომა</option>
                {combinedSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              </div>
            
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ფასდაკლება (₾)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount ?? ''}
                  onChange={(e) => handleInputChange('discount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ფასდაკლების ვადა (დღეები)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.discountDays ?? ''}
                  onChange={(e) => handleInputChange('discountDays', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="დღეები"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
            </div>
          </div>

          {/* Rental Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">გაქირავების პარამეტრები</h2>

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
                        value={tier.minDays}
                        onChange={(e) => updateRentalPriceTier(index, 'minDays', parseInt(e.target.value) || 1)}
                        className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 text-black py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <label className="flex items-center gap-3 text-[20px] text-black font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.variants.length > 0}
                  onChange={(e) => {
                    if (!e.target.checked) {
                      setFormData(prev => ({ ...prev, variants: [] }))
                    } else {
                      addVariant()
                    }
                  }}
                  className="h-5 w-5"
                />
                <span>ყიდვის პარამეტრები</span>
              </label>
              {formData.variants.length > 0 && (
                <button
                  type="button"
                  onClick={addVariant}
                  className="bg-black text-white px-4 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span> დამატება</span>
                </button>
              )}
            </div>

            {formData.variants.length > 0 && formData.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">ფასი </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price || ''}
                    onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="hidden ">
                  <div>
                    <label className="block text-[20px] text-black font-medium mb-2">
                    ფასდაკლება (₾)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount ?? ''}
                      onChange={(e) => handleInputChange('discount', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
               
              </div>
                  <div >
                    <label className="block text-[20px] text-black font-medium mb-2">
                    ფასდაკლების ვადა (დღეები)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.discountDays ?? ''}
                      onChange={(e) => handleInputChange('discountDays', e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="დღეები"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>წაშლა</span>
                  </button>
                </div>
              </div>
            ))}

            {formData.variants.length === 0 && (
              <p className="text-sm text-gray-500">თქვენ შეგიძლიათ დაამატოთ ზომები და საწყობის რაოდენობა.</p>
            )}

        
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">სურათები</h2>
            <ImageUploadForProduct
              value={formData.imageUrls}
              onChange={handleImageChange}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/admin"
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
