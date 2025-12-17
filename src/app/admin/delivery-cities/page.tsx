'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit2, Trash2, MapPin, X, Save, Check, XCircle } from 'lucide-react'
import { showToast } from '@/utils/toast'

interface DeliveryCity {
  id: number
  name: string
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const AdminDeliveryCitiesPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cities, setCities] = useState<DeliveryCity[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    isActive: true
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const fetchCities = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/delivery-cities?includeInactive=${showInactive}`)
      const data = await response.json()
      
      if (data.success) {
        setCities(data.cities)
      } else {
        showToast(data.error || 'შეცდომა ქალაქების ჩატვირთვისას', 'error')
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
      showToast('შეცდომა ქალაქების ჩატვირთვისას', 'error')
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      fetchCities()
    }
  }, [status, session?.user?.role, fetchCities])

  const handleCreate = () => {
    setIsCreating(true)
    setFormData({ name: '', price: '', isActive: true })
    setEditingId(null)
  }

  const handleEdit = (city: DeliveryCity) => {
    setEditingId(city.id)
    setFormData({
      name: city.name,
      price: city.price.toString(),
      isActive: city.isActive
    })
    setIsCreating(false)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormData({ name: '', price: '', isActive: true })
  }

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      showToast('ქალაქის სახელი აუცილებელია', 'error')
      return
    }

    const price = parseFloat(formData.price)
    if (isNaN(price) || price < 0) {
      showToast('მიტანის ფასი უნდა იყოს დადებითი რიცხვი', 'error')
      return
    }

    try {
      if (isCreating) {
        // Create new city
        const response = await fetch('/api/admin/delivery-cities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            price: price,
            isActive: formData.isActive
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          showToast('ქალაქი წარმატებით დაემატა', 'success')
          setIsCreating(false)
          setFormData({ name: '', price: '', isActive: true })
          fetchCities()
        } else {
          showToast(data.error || 'შეცდომა ქალაქის დამატებისას', 'error')
        }
      } else if (editingId) {
        // Update existing city
        const response = await fetch('/api/admin/delivery-cities', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: editingId,
            name: formData.name.trim(),
            price: price,
            isActive: formData.isActive
          }),
        })

        const data = await response.json()
        
        if (data.success) {
          showToast('ქალაქი წარმატებით განახლდა', 'success')
          setEditingId(null)
          setFormData({ name: '', price: '', isActive: true })
          fetchCities()
        } else {
          showToast(data.error || 'შეცდომა ქალაქის განახლებისას', 'error')
        }
      }
    } catch (error) {
      console.error('Error saving city:', error)
      showToast('შეცდომა ქალაქის შენახვისას', 'error')
    }
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`ნამდვილად გსურთ ქალაქის "${name}" წაშლა?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/delivery-cities?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        showToast('ქალაქი წარმატებით წაიშალა', 'success')
        fetchCities()
      } else {
        showToast(data.error || 'შეცდომა ქალაქის წაშლისას', 'error')
      }
    } catch (error) {
      console.error('Error deleting city:', error)
      showToast('შეცდომა ქალაქის წაშლისას', 'error')
    }
  }

  const handleToggleActive = async (city: DeliveryCity) => {
    try {
      const response = await fetch('/api/admin/delivery-cities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: city.id,
          isActive: !city.isActive
        }),
      })

      const data = await response.json()
      
      if (data.success) {
        showToast(
          city.isActive ? 'ქალაქი გააუქმდა' : 'ქალაქი გააქტიურდა',
          'success'
        )
        fetchCities()
      } else {
        showToast(data.error || 'შეცდომა სტატუსის შეცვლისას', 'error')
      }
    } catch (error) {
      console.error('Error toggling active status:', error)
      showToast('შეცდომა სტატუსის შეცვლისას', 'error')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-black mb-4">წვდომა აკრძალულია</h1>
          <p className="text-black mb-6">თქვენ არ გაქვთ ამ გვერდზე წვდომა.</p>
          <Link
            href="/"
            className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            მთავარ გვერდზე დაბრუნება
          </Link>
        </div>
      </div>
    )
  }

  const filteredCities = showInactive 
    ? cities 
    : cities.filter(city => city.isActive)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex items-center justify-center text-black hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 font-bold" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-[20px] md:text-[24px] font-bold text-gray-900 break-words">
                  მიტანის ქალაქების მართვა
                </h1>
                <p className="text-sm sm:text-base text-black mt-1 hidden sm:block">
                  დაამატე, შეცვალე ან წაშალე მიტანის ქალაქები
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors w-full sm:w-auto text-sm sm:text-base font-bold"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>ახალი ქალაქი</span>
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Filter */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-4 h-4 sm:w-5 sm:h-5 text-black border-gray-300 rounded focus:ring-black"
              />
              <span className="text-sm sm:text-base md:text-[18px] text-black">
                არააქტიური ქალაქების ჩვენება
              </span>
            </label>
          </div>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg md:text-[20px] font-bold text-black">
                {isCreating ? 'ახალი ქალაქის დამატება' : 'ქალაქის რედაქტირება'}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-black transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-black text-sm sm:text-base md:text-[18px] font-medium mb-2">
                  ქალაქის სახელი *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="მაგ: თბილისი"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base md:text-[18px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-black text-sm sm:text-base md:text-[18px] font-medium mb-2">
                  მიტანის ფასი (₾) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base md:text-[18px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              
              <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer w-full sm:w-auto">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 sm:w-5 sm:h-5 text-black border-gray-300 rounded focus:ring-black"
                  />
                  <span className="text-sm sm:text-base md:text-[18px] text-black">აქტიური</span>
                </label>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 mt-6">
              <button
                onClick={handleCancel}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 border border-gray-300 text-black rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base md:text-[18px] font-bold"
              >
                გაუქმება
              </button>
              <button
                onClick={handleSave}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm sm:text-base md:text-[18px] font-bold flex items-center justify-center"
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-2" />
                შენახვა
              </button>
            </div>
          </div>
        )}

        {/* Cities List */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredCities.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <MapPin className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-sm sm:text-base md:text-[18px] text-gray-600">
                {showInactive ? 'ქალაქები არ მოიძებნა' : 'აქტიური ქალაქები არ მოიძებნა'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-[18px] font-bold text-black">
                        ქალაქი
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-left text-sm lg:text-[18px] font-bold text-black">
                        მიტანის ფასი
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-sm lg:text-[18px] font-bold text-black">
                        სტატუსი
                      </th>
                      <th className="px-4 lg:px-6 py-3 lg:py-4 text-center text-sm lg:text-[18px] font-bold text-black">
                        მოქმედებები
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCities.map((city) => (
                      <tr
                        key={city.id}
                        className={`hover:bg-gray-50 ${!city.isActive ? 'opacity-60' : ''}`}
                      >
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm lg:text-[18px] text-black font-medium">
                              {city.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className="text-sm lg:text-[18px] text-black font-semibold">
                            ₾{city.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-center">
                          <button
                            onClick={() => handleToggleActive(city)}
                            className={`inline-flex items-center space-x-2 px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm ${
                              city.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {city.isActive ? (
                              <>
                                <Check className="w-3 h-3 lg:w-4 lg:h-4" />
                                <span className="font-medium">აქტიური</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 lg:w-4 lg:h-4" />
                                <span className="font-medium">არააქტიური</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(city)}
                              className="p-1.5 lg:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="რედაქტირება"
                            >
                              <Edit2 className="w-4 h-4 lg:w-5 lg:h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(city.id, city.name)}
                              className="p-1.5 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4 lg:w-5 lg:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredCities.map((city) => (
                  <div
                    key={city.id}
                    className={`p-4 ${!city.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <span className="text-base text-black font-medium truncate">
                          {city.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleEdit(city)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="რედაქტირება"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(city.id, city.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="წაშლა"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-gray-600">მიტანის ფასი:</span>
                        <span className="text-base text-black font-semibold ml-2">
                          ₾{city.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleActive(city)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs ${
                          city.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {city.isActive ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span className="font-medium">აქტიური</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span className="font-medium">არააქტიური</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDeliveryCitiesPage
