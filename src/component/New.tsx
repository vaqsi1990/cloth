"use client"
import React, { useState } from "react"
import Image from "next/image"
import { Star, ShoppingCart, Heart } from "lucide-react"

const New = () => {
  const [activeTab, setActiveTab] = useState("ALL")

  const tabs = [
    { id: "ALL", label: "ყველა" },
    { id: "CLOTHES", label: "ტანსაცმელი" },
    { id: "FOOTWEAR", label: "ფეხსაცმელი" },
  ]

  const newProducts = [
    {
      id: 1,
      name: "Men's Stylish Printed Shirt",
      category: "CLOTHES",
      currentPrice: 59.0,
      originalPrice: 87.0,
      rating: 5,
      image: "/new/1.jpg",
      hasSale: false,
    },
    {
      id: 2,
      name: "Men's Stylish Printed Shirt",
      category: "CLOTHES",
      currentPrice: 59.0,
      originalPrice: 87.0,
      rating: 5,
      image: "/new/2.jpg",
      hasSale: false,
    },
    {
      id: 3,
      name: "Men's Stylish Printed Shirt",
      category: "CLOTHES",
      currentPrice: 59.0,
      originalPrice: 87.0,
      rating: 5,
      image: "/new/3.jpg",
      hasSale: false,
    },
    {
      id: 6,
      name: "Men's Stylish Printed Shirt",
      category: "FOOTWEAR",
      currentPrice: 59.0,
      originalPrice: 87.0,
      rating: 5,
      image: "/new/6.jpg",
      hasSale: false,
    },
    {
      id: 5,
      name: "Stylish Printed Women's Dress",
      category: "FOOTWEAR",
      currentPrice: 78.0,
      originalPrice: 85.0,
      rating: 5,
      image: "/new/4.jpg",
      hasSale: true,
    },
    {
      id: 8,
      name: "Printed Round Neck T-shirt",
      category: "CLOTHES",
      currentPrice: 32.0,
      originalPrice: 45.0,
      rating: 5,
      image: "/new/5.jpg",
      hasSale: false,
    },
    {
      id: 7,
      name: "Women's Sport Shoes",
      category: "FOOTWEAR",
      currentPrice: 500.0,
      originalPrice: 600.0,
      rating: 4,
      image: "/new/7.jpg",
      hasSale: true,
    },
  ]

  

  // ფილტრაცია ტაბის მიხედვით
  const filteredProducts =
    activeTab === "ALL"
      ? newProducts
      : newProducts.filter((p) => p.category === activeTab)

  return (
    <section className="gi-product-tab px-3 gi-products py-10 wow fadeInUp">
      <div className="container mx-auto">
        {/* Title + Tabs */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold  mb-4 md:mb-0">
            ახალი <span className="text-teal-600">ნივთები</span>
          </h2>

          {/* Navigation Tabs */}
          <div className="flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2 text-lg font-medium transition-colors duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? "text-teal-600 border-teal-600"
                    : "text-gray-600 border-transparent hover:text-teal-500 hover:border-teal-500"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 group"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden rounded-t-lg">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Sale Badge */}
                {product.hasSale && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
                    SALE
                  </div>
                )}

                {/* Quick Actions */}
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                    <Heart className="w-4 h-4 text-gray-600" />
                  </button>
                  <button className="bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-colors">
                    <ShoppingCart className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                {/* Category */}
                <div className="mb-2">
                  <span className="text-[14px] text-gray-500 uppercase tracking-wide">
                    {product.category}
                  </span>
                </div>

                {/* Product Title */}
                <h3 className="text-[16px] font-medium text-gray-900 mb-3 leading-tight line-clamp-2">
                  {product.name}
                </h3>

             

                {/* Pricing */}
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-900">
                    ${product.currentPrice.toFixed(2)}
                  </span>
                  {product.originalPrice > product.currentPrice && (
                    <span className="text-[14px] text-gray-400 line-through">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default New
