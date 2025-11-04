"use client"
import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Save, X, Plus } from 'lucide-react'
import { z } from 'zod'
import { Product } from '@/types/product'
import ImageUploadForProduct from '@/component/productimage'

const productSchema = z.object({
  name: z.string().min(1, 'სახელი აუცილებელია'),
  slug: z.string().min(1, 'Slug აუცილებელია').regex(/^[a-z0-9-]+$/, 'Slug უნდა შეიცავდეს მხოლოდ პატარა ასოებს, ციფრებს და ტირეებს'),
  description: z.string().optional(),
  stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი').default(0),
  gender: z.enum(['MEN', 'WOMEN', 'CHILDREN', 'UNISEX']).default('UNISEX'),
  color: z.string().optional(),
  location: z.string().optional(),
  isNew: z.boolean().default(false),
  hasSale: z.boolean().default(false),
  rating: z.number().min(0).max(5).optional(),
  categoryId: z.number().optional(),
  isRentable: z.boolean().default(false),
  pricePerDay: z.number().min(0, 'ფასი უნდა იყოს დადებითი').nullable().optional(),
  maxRentalDays: z.number().nullable().optional(),
  deposit: z.number().min(0, 'გირაო უნდა იყოს დადებითი').nullable().optional(),
  status: z.enum(['AVAILABLE', 'RENTED', 'RESERVED', 'MAINTENANCE']).default('AVAILABLE'),
  variants: z.array(z.object({
    size: z.string().min(1, 'ზომა აუცილებელია'),
    stock: z.number().min(0, 'საწყობი უნდა იყოს დადებითი'),
    price: z.number().min(0, 'ფასი უნდა იყოს დადებითი')
  })).default([]),
  imageUrls: z.array(z.string().min(1, 'URL აუცილებელია')).default([]),
  rentalPriceTiers: z.array(z.object({
    minDays: z.number().int().min(1, 'მინიმალური დღეები უნდა იყოს დადებითი'),
    pricePerDay: z.number().positive('ფასი დღეში უნდა იყოს დადებითი')
  })).default([])
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
    stock: 0,
    gender: 'UNISEX',
    color: '',
    location: '',
    isNew: false,
    hasSale: false,
    rating: 0,
    categoryId: undefined,
    isRentable: false,
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

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.success) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${productId}`)
        const data = await response.json()
        if (data.success) {
          const product = data.product
          const imageUrls = product.images?.map((img: { url: string }) => img.url) || []
          setProduct(product)
          setFormData({
            name: product.name,
            slug: product.slug,
            description: product.description || '',
            stock: parseInt(product.sku) || 0,
            gender: product.gender || 'UNISEX',
            color: product.color || '',
            location: product.location || '',
            isNew: product.isNew,
            hasSale: product.hasSale,
            rating: product.rating || 0,
            categoryId: product.categoryId,
            isRentable: product.isRentable || false,
            pricePerDay: product.pricePerDay || undefined,
            maxRentalDays: product.maxRentalDays || undefined,
            deposit: product.deposit || undefined,
            status: product.status || 'AVAILABLE',
            variants: product.variants || [],
            imageUrls: imageUrls,
            rentalPriceTiers: product.rentalPriceTiers || []
          })
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
      variants: [...prev.variants, { size: '', stock: 0, price: 0 }]
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
      rentalPriceTiers: [...(prev.rentalPriceTiers || []), { minDays: 1, pricePerDay: 1 }]
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
      const tiers = currentTiers.length === 0 ? [{ minDays: 1, pricePerDay: 1 }] : currentTiers
      
      return {
        ...prev,
        rentalPriceTiers: tiers.map((tier, i) =>
          i === index ? { ...tier, [field]: value } : tier
        )
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      const dataToValidate = {
        ...formData,
        pricePerDay: formData.pricePerDay || undefined,
        maxRentalDays: formData.maxRentalDays || undefined,
        deposit: formData.deposit || undefined,
        rentalPriceTiers: formData.rentalPriceTiers || []
      }
      
      const validatedData = productSchema.parse(dataToValidate)
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validatedData),
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('პროდუქტი წარმატებით განახლდა!')
        router.push('/account')
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
          alert(result.message || 'შეცდომა პროდუქტის განახლებისას')
        }
      }
    } catch (error) {
      console.error('Error updating product:', error)
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.issues.forEach(err => {
          if (err.path.length > 0) {
            newErrors[err.path.join('.')] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        alert('შეცდომა პროდუქტის განახლებისას')
      }
    } finally {
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
            onClick={() => router.push('/account')}
            className="text-black hover:text-gray-600"
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
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/account')}
              className="flex items-center text-[20px] text-black hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              დაბრუნება
            </button>
            <h1 className="text-[20px] text-black font-bold">პროდუქტის რედაქტირება</h1>
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
                  <h3 className="text-lg font-medium text-black mb-4">ფასის გეგმა</h3>

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
                        <button
                          type="button"
                          onClick={() => removeRentalPriceTier(index)}
                          className="bg-red-500 text-white px-3 py-2 rounded-lg text-[20px] flex items-center space-x-2"
                        >
                          <X className="w-4 h-4" />
                          <span>წაშლა</span>
                        </button>
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
            <button
              type="button"
              onClick={() => router.push('/account')}
              className="bg-gray-500 text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-600 transition-colors"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-black text-white px-6 py-3 rounded-lg text-[20px] text-black hover:bg-gray-800 transition-colors disabled:bg-gray-400 flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSubmitting ? 'მუშავდება...' : 'პროდუქტის განახლება'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProductPage
