"use client"
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'

import ImageUploadForProduct from '@/component/productimage'
import { showToast } from '@/utils/toast'
const sizeOptions = {
  XS: { UK: [4, 6], EU: [32, 34], US: [0, 2],  },
  S: { UK: [8, 10], EU: [36, 38], US: [4, 6],  },
  M: { UK: [12], EU: [40], US: [8],  },
  L: { UK: [14], EU: [42], US: [10],  },
  XL: { UK: [16], EU: [44], US: [12], },
  XXL: { UK: [18], EU: [46], US: [14],  },
  XXXL: { UK: [20], EU: [48], US: [16],  },

}
const FALLBACK_SIZE = 'STANDARD'
const categories = [
  { id: 1, name: 'კაბები', slug: 'dresses' },
  { id: 2, name: 'ბლუზები', slug: 'tops' },
  { id: 3, name: 'შარვლები', slug: 'pants' },
  { id: 4, name: 'ქვედაბოლოები', slug: 'skirts' },
  { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
  { id: 6, name: 'პალტოები და მოსასხამი', slug: 'coats' },
  { id: 7, name: 'საქორწინო კაბები', slug: 'wedding-dresses' },
  { id: 8, name: 'საღამოს ტანსაცმელი', slug: 'evening-wear' },
  { id: 9, name: 'სათხილამურო ქურთუკი', slug: 'ski-jacket' },
  { id: 10, name: 'თერმო ტანსაცმელი', slug: 'thermal-wear' },
  { id: 11, name: 'სათვალე', slug: 'goggles' },
  { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },
  { id: 13, name: 'ტრადიციული ტანსაცმელი', slug: 'traditional' },
  { id: 14, name: 'ქოსფლეის კოსტუმები', slug: 'cosplay' },
  { id: 15, name: 'შარვალ კოსტუმი', slug: 'suit' },
  { id: 16, name: 'პიჯაკი', slug: 'blazer' },
  { id: 17, name: 'აქსესუარები', slug: 'accessories' },
  { id: 18, name: 'ბავშვთა კაბები', slug: 'kids-dresses' },
  { id: 19, name: 'ბავშვთა ტრადიციული ტანსაცმელი', slug: 'kids-traditional' },
  { id: 20, name: 'ბავშვთა სათხილამურო ტანსაცმელი', slug: 'kids-ski' },
  { id: 21, name: 'ყოველდღიური ტანსაცმელი', slug: 'everyday' },
  { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
  { id: 23, name: 'სადღესასწაულო ტანსაცმელი', slug: 'festive' }
]
type Category = {
  id: number
  name: string
  slug: string
}
const productSchema = z.object({
  name: z.string()
    .min(1, 'სახელი აუცილებელია')
    .regex(/^[\u10A0-\u10FF\s]+$/, 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string()
    .optional()
    .refine((val) => !val || /^[\u10A0-\u10FF\s]+$/.test(val), {
      message: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს'
    }),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  size: z.string().optional(),
  isNew: z.boolean().default(false),
  discount: z.number().int().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(true), // 🆕
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(), // 🆕
  maxRentalDays: z.number().optional(), // 🆕
  deposit: z.number().min(0, 'გირაო უნდა იყოს დადებითი').optional(), // 🆕
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  variants: z.array(
    z.object({
      size: z.preprocess(
        (val) => (val === '' || val === null ? undefined : val),
        z.string().optional()
      ),
      stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
      price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
      discount: z.number().min(0).max(100).optional(),
      sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional()
    })
  ).default([]),
  imageUrls: z.array(z.string().url('არასწორი URL')).default([]),
  rentalPriceTiers: z.array(z.object({
    minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
    pricePerDay: z.number().positive('ფასი დღეში უნდა იყოს დადებითი')
  })).optional()
})


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
    sizeSystem: undefined,
    size: undefined,
    isNew: false,
    discount: undefined,
    rating: 0,
    categoryId: undefined,
    isRentable: true, // 🆕
    pricePerDay: undefined,
    maxRentalDays: undefined,
    deposit: undefined,
    status: 'AVAILABLE',
    variants: [],
    imageUrls: [],
    rentalPriceTiers: [{ minDays: 1, pricePerDay: 0 }],
  })


  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPurchaseOptions, setShowPurchaseOptions] = useState(false)
  const [sizeSystem, setSizeSystem] = useState(formData.sizeSystem ?? '')
  const [selectedSize, setSelectedSize] = useState('')

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

    const [system, ...sizeParts] = value.split(':')
    const nextSize = sizeParts.join(':')

    setSizeSystem(system as SizeSystem)
    setSelectedSize(nextSize)
    handleInputChange('sizeSystem', system as SizeSystem)
    handleInputChange('size', nextSize)
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(variant => ({
        ...variant,
        sizeSystem: system as SizeSystem
      }))
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
    { id: "beige", label: "ბეჟი", color: "#8B4513" }
  ]

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Validate Georgian characters for description in real-time
    if (field === 'description' && typeof value === 'string') {
      if (value && !/^[\u10A0-\u10FF\s]+$/.test(value)) {
        setErrors(prev => ({
          ...prev,
          description: 'აღწერა უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს'
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

    // Validate Georgian characters in real-time
    if (name && !/^[\u10A0-\u10FF\s]+$/.test(name)) {
      setErrors(prev => ({
        ...prev,
        name: 'სახელი უნდა შეიცავდეს მხოლოდ ქართულ სიმბოლოებს'
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
    const defaultSizeOption =
      (sizeSystem && selectedSize && `${sizeSystem}:${selectedSize}`) ||
      combinedSizeOptions[0]?.value

    const defaultSize =
      (defaultSizeOption ? defaultSizeOption.split(':')[1] : undefined) || selectedSize || FALLBACK_SIZE

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          size: defaultSize,
          stock: 0,
          price: 0,
          discount: undefined,
          sizeSystem: prev.sizeSystem
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
      // Validate form data
      const validatedData = productSchema.parse(formData)

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
        showToast('პროდუქტი წარმატებით შეიქმნა!', 'success')
        router.push('/admin')
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
                    <Link href="/" className="flex md:text-[20px] text-[18px] items-center text-black hover:opacity-80">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        უკან დაბრუნება
                    </Link>
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

            

              {/* <div>
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
                {errors.stock && <p className="text-red-500 md:text-[16px] text-[14px] mt-1">{errors.stock}</p>}
              </div> */}
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
                  value={formData.color || ''}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ფერი</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.label}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>



            </div>
            <div className="mt-6">
              <label className="block text-[20px] text-black font-medium mb-2">
                ზომა (არასავალდებულო)
              </label>
              <select
                value={sizeSystem && selectedSize ? `${sizeSystem}:${selectedSize}` : ''}
                onChange={(e) => handleCombinedSizeSelect(e.target.value)}
                className="w-full px-4 py-3 md:w-1/2 w-full border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">აირჩიეთ ზომა</option>
                {combinedSizeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
                className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.description && <p className="text-red-500 md:text-[20px] text-[18px] mt-1">{errors.description}</p>}
            </div>


          </div>

          {/* Variants */}

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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg md:text-[18px] text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg md:text-[18px] text-[16px] text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">გირაოს თანხა</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.deposit || ''}
                  onChange={(e) => handleInputChange('deposit', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
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
                <span>ყიდვის პარამეტრები</span>
              </label>
              {showPurchaseOptions && (
                <button
                  type="button"
                  onClick={addVariant}
                  className="bg-black text-white px-4 py-2 rounded-lg text-[20px] text-black flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span> დამატება</span>
                </button>
              )}
            </div>

            {showPurchaseOptions && formData.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">საწყობი</label>
                  <input
                    type="number"
                    value={variant.stock}
                    onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">ფასდაკლება </label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.discount ?? ''}
                    onChange={(e) => updateVariant(index, 'discount', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="bg-red-500 text-white px-3 py-2 rounded-lg text-[20px] text-black flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>წაშლა</span>
                  </button>
                </div>
              </div>
            ))}

            {showPurchaseOptions && formData.variants.length === 0 && (
              <p className="md:text-[18px] text-[16px] text-black">თქვენ შეგიძლიათ დაამატოთ ზომები და საწყობის რაოდენობა.</p>
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
              {isSubmitting ? 'მუშავდება...' : 'პროდუქტის დამატება'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewProductPage
