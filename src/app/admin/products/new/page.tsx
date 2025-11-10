"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'

import ImageUploadForProduct from '@/component/productimage'

const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  brand: z.string().optional(),
  description: z.string().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  sizeSystem: z.enum(['EU', 'US', 'UK', 'CN']).optional(),
  isNew: z.boolean().default(false),
  discount: z.number().int().min(0).max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(false), // 🆕
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional(), // 🆕
  maxRentalDays: z.number().optional(), // 🆕
  deposit: z.number().min(0, 'გირაო უნდა იყოს დადებითი').optional(), // 🆕
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  variants: z.array(
    z.object({
      size: z.string().min(1, 'ზომა აუცილებელია'),
      stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
      price: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
      discount: z.number().min(0).max(100).optional()
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
    isNew: false,
    discount: undefined,
    rating: 0,
    categoryId: undefined,
    isRentable: false, // 🆕
    pricePerDay: undefined,
    maxRentalDays: undefined,
    deposit: undefined,
    status: 'AVAILABLE',
    variants: [],
    imageUrls: [],
    rentalPriceTiers: [],
  })


  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    // ძირითადი
    { id: 1, name: 'კაბები', slug: 'dresses' },
    { id: 2, name: 'ბლუზები', slug: 'tops' },
    { id: 3, name: 'შარვლები', slug: 'pants' },
    { id: 4, name: 'ქვედაბოლოები', slug: 'skirts' },
    { id: 5, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
    { id: 6, name: 'პალტოები და მოსასხამი', slug: 'coats' },

    // საქორწინო და სადღესასწაულო
    { id: 7, name: 'საქორწინო კაბები', slug: 'wedding-dresses' },
    { id: 8, name: 'საღამოს ტანსაცმელი', slug: 'evening-wear' },

    // სპორტული და სათხილამურო
    { id: 9, name: 'სათხილამურო ქურთუკი', slug: 'ski-jacket' },
    { id: 10, name: 'თერმო ტანსაცმელი', slug: 'thermal-wear' },
    { id: 11, name: 'სათვალე', slug: 'goggles' },
    { id: 12, name: 'ჩაფხუტი', slug: 'helmet' },

    // კულტურული და თემატური
    { id: 13, name: 'ტრადიციული ტანსაცმელი', slug: 'traditional' },
    { id: 14, name: 'ქოსფლეის კოსტუმები', slug: 'cosplay' },

    // მამაკაცების
    { id: 15, name: 'შარვალ კოსტუმი', slug: 'suit' },
    { id: 16, name: 'პიჯაკი', slug: 'blazer' },

    // აქსესუარები
    { id: 17, name: 'აქსესუარები', slug: 'accessories' },

    // ბავშვები
    { id: 18, name: 'ბავშვთა კაბები', slug: 'kids-dresses' },
    { id: 19, name: 'ბავშვთა ტრადიციული ტანსაცმელი', slug: 'kids-traditional' },
    { id: 20, name: 'ბავშვთა სათხილამურო ტანსაცმელი', slug: 'kids-ski' },

    // სხვა
    { id: 21, name: 'ყოველდღიური ტანსაცმელი', slug: 'everyday' },
    { id: 22, name: 'სპორტული ტანსაცმელი', slug: 'sportwear' },
    { id: 23, name: 'სადღესასწაულო ტანსაცმელი', slug: 'festive' }
  ]


  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

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

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
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

    // Clear errors when user starts typing
    if (errors.name) {
      setErrors(prev => ({
        ...prev,
        name: ''
      }))
    }
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { size: '', stock: 0, price: 0, discount: undefined }]
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
        alert('პროდუქტი წარმატებით შეიქმნა!')
        router.push('/admin')
      } else {
        if (result.errors) {
          const newErrors: Record<string, string> = {}
          result.errors.forEach((err: { path: string[]; message: string }) => {
            if (err.path.length > 0) {
              newErrors[err.path.join('.')] = err.message
            }
          })
          setErrors(newErrors)
        } else {
          alert(result.message || 'შეცდომა პროდუქტის შექმნისას')
        }
      }

    } catch (error) {
      console.error('Error:', error)
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path.join('.')] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        alert('მოულოდნელი შეცდომა')
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
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  Slug (ავტომატური)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black bg-gray-50 cursor-not-allowed"
                />
                <p className="text-gray-500 text-sm mt-1">Slug ავტომატურად გენერირდება სახელიდან</p>
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
                {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
              </div> */}


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
                  <option value="">აირჩიეთ კატეგორია</option>
                  {categories.map(category => (
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
                <label className="block text-[20px] text-black font-medium mb-2">
                  ფერი
                </label>
                <select
                  value={formData.color || ''}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ფერი</option>
                  {colors.map(color => (
                    <option key={color.id} value={color.label}>
                      {color.label}
                    </option>
                  ))}
                </select>
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
                  ზომის სისტემა
                </label>
                <select
                  value={formData.sizeSystem || ''}
                  onChange={(e) => handleInputChange('sizeSystem', e.target.value || undefined)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">აირჩიეთ ზომის სისტემა</option>
                  <option value="EU">EU</option>
                  <option value="US">US</option>
                  <option value="UK">UK</option>
                  <option value="CN">CN</option>
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
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>


          </div>

          {/* Variants */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] text-black font-semibold">ზომები და საწყობი</h2>
              <button
                type="button"
                onClick={addVariant}
                className="bg-black text-white px-4 py-2 rounded-lg text-[20px] text-black flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>ზომის დამატება</span>
              </button>
            </div>

            {formData.variants.map((variant, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">ზომა</label>
                  <select
                    value={variant.size}
                    onChange={(e) => updateVariant(index, 'size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="">აირჩიეთ ზომა</option>
                    {sizes.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>

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
                    value={variant.price || ''}
                    onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
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
          </div>

          {/* Rental Options */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">გაქირავების პარამეტრები</h2>

            <label className="flex items-center mb-4">
              <input
                type="checkbox"
                checked={formData.isRentable}
                onChange={(e) => handleInputChange('isRentable', e.target.checked)}
                className="mr-2"
              />
              <span className="text-[20px] text-black">პროდუქტის გაქირავება შესაძლებელია</span>
            </label>

            {formData.isRentable && (
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-[20px] text-black font-medium mb-2">სტატუსი</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      <option value="AVAILABLE">თავისუფალია</option>
                      <option value="RENTED">გაქირავებულია</option>
                      <option value="RESERVED">დაჯავშნილია</option>
                      <option value="MAINTENANCE">რესტავრაციაზე</option>
                    </select>
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
                </div>
              </div>
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
