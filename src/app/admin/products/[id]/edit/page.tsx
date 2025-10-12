"use client"
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, X } from 'lucide-react'
import { z } from 'zod'
import { Product } from '@/types/product'
import ImageUpload from '@/component/CloudinaryUploader'

const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  description: z.string().optional(),
  currentPrice: z.number().min(0, 'ფასი უნდა იყოს დადებითი'),
  originalPrice: z.number().min(0, 'ორიგინალური ფასი უნდა იყოს დადებითი').nullable().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  isNew: z.boolean().default(false),
  hasSale: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  variants: z.array(z.object({
    size: z.string().min(1, 'ზომა აუცილებელია'),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი').nullable().optional()
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([])
})

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
          setFormData({
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            currentPrice: product.currentPrice,
            originalPrice: product.originalPrice,
            stock: parseInt(product.sku) || 0,
            isNew: product.isNew,
            hasSale: product.hasSale,
            rating: product.rating || 0,
            categoryId: product.categoryId,
            variants: product.variants || [],
            imageUrls: imageUrls
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
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: '' }))
    }
  }

  const handleInputChange = (field: keyof ProductFormData, value: string | number | boolean | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, { size: '', stock: 0, price: prev.currentPrice }]
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
      const validatedData = productSchema.parse(formData)
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
        alert('პროდუქტი წარმატებით განახლდა!')
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
          alert(result.message || 'შეცდომა პროდუქტის განახლებისას')
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
        alert('შეცდომა პროდუქტის განახლებისას')
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
            </button>
            <h1 className="text-[20px] text-black font-bold">პროდუქტის რედაქტირება</h1>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-6">
              <h2 className="text-[20px] text-black font-semibold">ძირითადი ინფორმაცია</h2>
              
              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  პროდუქტის სახელი *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="შეიყვანეთ პროდუქტის სახელი"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black bg-gray-50"
                />
                {errors.slug && <p className="text-red-500 text-sm mt-1">{errors.slug}</p>}
              </div>

              <div>
                <label className="block text-[20px] text-black font-medium mb-2">
                  აღწერა
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="შეიყვანეთ პროდუქტის აღწერა"
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
                  <option value="">კატეგორიის არჩევა</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[20px] text-black font-medium mb-2">
                    მიმდინარე ფასი *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.currentPrice}
                    onChange={(e) => handleInputChange('currentPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
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

              <div className="flex space-x-4">
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

            {/* Images and Variants */}
            <div className="space-y-6">
              <h2 className="text-[20px] text-black font-semibold">სურათები</h2>
              
              <ImageUpload
                value={formData.imageUrls}
                onChange={handleImageChange}
              />

              <h2 className="text-[20px] text-black font-semibold">ვარიანტები</h2>
              
              <div className="space-y-4">
                {formData.variants.map((variant, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-[20px] text-black font-medium">ვარიანტი {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm text-black mb-1">ზომა</label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) => updateVariant(index, 'size', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-black mb-1">საწყობი</label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-black mb-1">ფასი</label>
                        <input
                          type="number"
                          step="0.01"
                          value={variant.price || ''}
                          onChange={(e) => updateVariant(index, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-[20px] text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-[20px] text-black hover:border-black transition-colors"
                >
                  + ვარიანტის დამატება
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-6 py-3 border border-gray-300 rounded-lg text-[20px] text-black hover:bg-gray-50 transition-colors"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-black text-white rounded-lg text-[20px] font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                'მიმდინარეობს...'
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  განახლება
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProductPage
