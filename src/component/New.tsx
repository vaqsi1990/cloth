"use client"
import React, { useState } from "react"
import Image from "next/image"
import {  ShoppingCart, Heart } from "lucide-react"
import Link from "next/link"
import productsData from '@/data/products.json'

const New = () => {
  const [activeTab, setActiveTab] = useState("ALL")

  const tabs = [
    { id: "ALL", label: "ყველა" },
    { id: "CLOTHES", label: "ტანსაცმელი" },
    { id: "FOOTWEAR", label: "ფეხსაცმელი" },
  ]

  // Get new products from JSON data
  const newProducts = productsData.products.filter(product => product.isNew)



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
                className={`pb-2 text-lg font-medium transition-colors duration-300 border-b-2 ${activeTab === tab.id
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
              <div className="relative aspect-square overflow-hidden rounded-t-lg bg-white">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
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
                    {product.currentPrice.toFixed(2)} ლარი
                  </span>
                  {product.originalPrice > product.currentPrice && (
                    <span className="text-[14px] text-gray-400 line-through">
                      {product.originalPrice.toFixed(2)} ლარი
                    </span>
                  )}
                </div>

                <Link
                  href={`/product/${product.id}`}
                  className="gi-btn-1 mt-4 transition-all duration-[0.3s] ease-in-out overflow-hidden text-center relative py-[10px] max-[767px]:py-[6px] px-[15px] max-[767px]:px-[10px] bg-[#4b5966] text-[#fff] border-[0] text-[15px] max-[767px]:text-[13px] tracking-[0] font-medium inline-flex items-center hover:bg-[#5caf90] hover:text-[#fff]"
                >
                  დეტალები

                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default New
