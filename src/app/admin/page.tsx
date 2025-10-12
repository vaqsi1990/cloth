"use client"
import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Package, ShoppingCart, Users, BarChart3, Settings, Upload, Edit, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import { Product } from '@/types/product'
// Removed JSON import - now using database

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    const tabs = [
        { id: 'dashboard', label: 'დაფა', icon: BarChart3 },
        { id: 'products', label: 'პროდუქტები', icon: Package },
        { id: 'orders', label: 'შეკვეთები', icon: ShoppingCart },
        { id: 'settings', label: 'პარამეტრები', icon: Settings }
    ]

    const stats = [
        { title: 'სულ პროდუქტები', value: '156', change: '+12%' },
        { title: 'შეკვეთები', value: '89', change: '+5%' },
        { title: 'შემოსავალი', value: '₾12,450', change: '+18%' },
        { title: 'მომხმარებლები', value: '234', change: '+8%' }
    ]

    const recentOrders = [
        { id: 1, customer: 'ანა ნიკოლაიშვილი', total: '₾125.50', status: 'მიწოდებული', date: '2024-01-15' },
        { id: 2, customer: 'გიორგი მელაძე', total: '₾89.99', status: 'მუშავდება', date: '2024-01-14' },
        { id: 3, customer: 'მარიამ ხუციშვილი', total: '₾245.00', status: 'გადახდილი', date: '2024-01-13' }
    ]

    // Fetch products from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch('/api/products')
                const data = await response.json()
                if (data.success) {
                    setProducts(data.products)
                }
            } catch (error) {
                console.error('Error fetching products:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [])

    const getCategoryLabel = (category: Product['category']) => {
        if (!category) return 'უცნობი'
        return category.name
    }

    const getMainImage = (product: Product) => {
        if (product.images && product.images.length > 0) {
            return product.images[0].url
        }
        return '/placeholder.jpg'
    }

    // Handle edit product
    const handleEditProduct = (productId: number) => {
        // Navigate to edit page
        window.location.href = `/admin/products/${productId}/edit`
    }

    // Handle delete product
    const handleDeleteProduct = async (productId: number, productName: string) => {
        if (!confirm(`დარწმუნებული ხართ, რომ გსურთ წაშალოთ "${productName}"?`)) {
            return
        }

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            })
            
            const data = await response.json()
            
            if (data.success) {
                alert('პროდუქტი წარმატებით წაიშალა!')
                // Refresh products list
                const fetchProducts = async () => {
                    try {
                        const response = await fetch('/api/products')
                        const data = await response.json()
                        if (data.success) {
                            setProducts(data.products)
                        }
                    } catch (error) {
                        console.error('Error fetching products:', error)
                    }
                }
                fetchProducts()
            } else {
                alert(data.message || 'შეცდომა პროდუქტის წაშლისას')
            }
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('შეცდომა პროდუქტის წაშლისას')
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="px-6 py-4">
                    <h1 className="text-[20px] text-black font-bold">ადმინისტრაციის პანელი</h1>
                </div>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-64 bg-white shadow-sm min-h-screen">
                    <div className="p-6">
                        <nav className="space-y-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-[20px] text-black transition-colors ${
                                            activeTab === tab.id
                                                ? 'bg-black text-white'
                                                : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{tab.label}</span>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-6">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stats.map((stat, index) => (
                                    <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                                        <h3 className="text-[20px] text-black text-gray-600 mb-2">{stat.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[20px] text-black font-bold text-2xl">{stat.value}</span>
                                            <span className="text-[20px] text-black text-green-600 text-sm">{stat.change}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Recent Orders */}
                            <div className="bg-white rounded-lg shadow-sm">
                                <div className="p-6 border-b border-gray-200">
                                    <h2 className="text-[20px] text-black font-semibold">ბოლო შეკვეთები</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">ID</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">მომხმარებელი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">თანხა</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">სტატუსი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">თარიღი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">მოქმედება</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {recentOrders.map((order) => (
                                                <tr key={order.id}>
                                                    <td className="px-6 py-4 text-[20px] text-black">#{order.id}</td>
                                                    <td className="px-6 py-4 text-[20px] text-black">{order.customer}</td>
                                                    <td className="px-6 py-4 text-[20px] text-black font-semibold">{order.total}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[20px] text-black text-sm ${
                                                            order.status === 'მიწოდებული' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'მუშავდება' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-[20px] text-black">{order.date}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex space-x-2">
                                                            <button className="p-1 text-[20px] text-black hover:text-blue-600">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                            <button className="p-1 text-[20px] text-black hover:text-green-600">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-[20px] text-black font-semibold">პროდუქტები</h2>
                                <Link 
                                    href="/admin/products/new"
                                    className="bg-black text-white px-4 py-2 rounded-lg text-[20px] text-black flex items-center space-x-2 hover:bg-gray-800 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>ახალი პროდუქტი</span>
                                </Link>
                            </div>

                            <div className="bg-white rounded-lg shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">სურათი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">ID</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">სახელი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">ფასი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">კატეგორია</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">სტატუსი</th>
                                                <th className="px-6 py-3 text-left text-[20px] text-black font-medium">მოქმედება</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {loading ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-4 text-center text-[20px] text-black">
                                                        იტვირთება...
                                                    </td>
                                                </tr>
                                            ) : products.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-4 text-center text-[20px] text-black">
                                                        პროდუქტები ვერ მოიძებნა
                                                    </td>
                                                </tr>
                                            ) : (
                                                products.map((product) => (
                                                    <tr key={product.id}>
                                                        <td className="px-6 py-4">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                                                                <Image
                                                                    src={getMainImage(product)}
                                                                    alt={product.name}
                                                                    width={48}
                                                                    height={48}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[20px] text-black">#{product.id}</td>
                                                        <td className="px-6 py-4 text-[20px] text-black font-medium">{product.name}</td>
                                                        <td className="px-6 py-4 text-[20px] text-black">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">₾{product.currentPrice.toFixed(2)}</span>
                                                                {product.originalPrice && product.originalPrice > product.currentPrice && (
                                                                    <span className="text-gray-500 line-through text-sm">₾{product.originalPrice.toFixed(2)}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[20px] text-black">{getCategoryLabel(product.category)}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col space-y-1">
                                                                {product.isNew && (
                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-[20px] text-black text-xs">ახალი</span>
                                                                )}
                                                                {product.hasSale && (
                                                                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-[20px] text-black text-xs">ფასდაკლება</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex space-x-2">
                                                                <button 
                                                                    onClick={() => handleEditProduct(product.id)}
                                                                    className="p-1 text-[20px] text-black hover:text-blue-600 transition-colors"
                                                                    title="რედაქტირება"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteProduct(product.id, product.name)}
                                                                    className="p-1 text-[20px] text-black hover:text-red-600 transition-colors"
                                                                    title="წაშლა"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="space-y-6">
                            <h2 className="text-[20px] text-black font-semibold">შეკვეთების მართვა</h2>
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <p className="text-[20px] text-black text-gray-600">შეკვეთების დეტალური მართვა აქ იქნება</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <h2 className="text-[20px] text-black font-semibold">პარამეტრები</h2>
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <p className="text-[20px] text-black text-gray-600">სისტემის პარამეტრები აქ იქნება</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default AdminPage
