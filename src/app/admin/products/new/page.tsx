"use client"
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'
import ImageUpload from '@/component/CloudinaryUploader'

// Zod validation schema based on Prisma models
const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  description: z.string().optional(),
  currentPrice: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
  originalPrice: z.number().min(0, 'ორიგინალური ფასი უნდა იყოს დადებითი').optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  isNew: z.boolean().default(false),
  hasSale: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  variants: z.array(z.object({
    size: z.string().min(1, 'ზომა აუცილებელია'),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი').optional()
  })).default([]),
  imageUrls: z.array(z.string().url('არასწორი URL')).default([])
})

type ProductFormData = z.infer<typeof productSchema>

const NewProductPage = () => {
  const router = useRouter()
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    currentPrice: 0,
    originalPrice: undefined,
    stock: 0,
    isNew: false,
    hasSale: false,
    rating: 0,
    categoryId: undefined,
    variants: [],
    imageUrls: []
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    { id: 1, name: 'კაბები', slug: 'dresses' },
    { id: 2, name: 'ბლუზები', slug: 'tops' },
    { id: 3, name: 'შარვლები', slug: 'bottoms' },
    { id: 4, name: 'ზედა ტანსაცმელი', slug: 'outerwear' },
    { id: 5, name: 'აქსესუარები', slug: 'accessories' }
  ]

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
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
      variants: [...prev.variants, { size: '', stock: 0, price: undefined }]
    }))
  }

  const removeVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }))
  }

  const updateVariant = (index: number, field: string, value: any) => {
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
          result.errors.forEach((err: any) => {
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
          <div className="flex items-center space-x-4">
            <Link 
              href="/admin"
              className="flex items-center text-[20px] text-black hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              დაბრუნება
            </Link>
            <h1 className="text-[20px] text-black font-bold">ახალი პროდუქტის დამატება</h1>
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
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
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

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  მიმდინარე ფასი *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.currentPrice}
                  onChange={(e) => handleInputChange('currentPrice', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${
                    errors.currentPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.currentPrice && <p className="text-red-500 text-sm mt-1">{errors.currentPrice}</p>}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  ორიგინალური ფასი
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.originalPrice || ''}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className={`w-full px-4 py-3 border rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black ${
                    errors.originalPrice ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.originalPrice && <p className="text-red-500 text-sm mt-1">{errors.originalPrice}</p>}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  საწყობის რაოდენობა
                </label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
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

            <div className="mt-6 flex space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isNew}
                  onChange={(e) => handleInputChange('isNew', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-[20px] text-black">ახალი პროდუქტი</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasSale}
                  onChange={(e) => handleInputChange('hasSale', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-[20px] text-black">ფასდაკლება</span>
              </label>
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
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg mb-4">
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
                  <label className="block text-[20px] text-black font-medium mb-2">ფასი (ოფციონალური)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variant.price || ''}
                    onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
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

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-[20px] text-black font-semibold mb-6">სურათები</h2>
            <ImageUpload
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
