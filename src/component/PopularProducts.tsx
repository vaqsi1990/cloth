'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Star, Heart } from 'lucide-react'

const PopularProducts = () => {
    const [currentSlide, setCurrentSlide] = useState(0)

    const products = [
        {
            id: 1,
            name: "შავი ელეგანტური კაბა",
            brand: "House of CB",
            price: 45,
            originalPrice: 595,
            size: "S",
            image: "/hero/1.jpg",
            category: "პოპულარული",
            rating: 4.8,
            reviews: 24
        },
        {
            id: 2,
            name: "ოქროსფერი საღამოს კაბა",
            brand: "Reformation",
            price: 36,
            originalPrice: 690,
            size: "M",
            image: "/hero/2.jpg",
            category: "პოპულარული",
            rating: 4.9,
            reviews: 18
        },
        {
            id: 3,
            name: "თეთრი მინიმალისტური კაბა",
            brand: "Rosie Etienne",
            price: 69,
            originalPrice: 1575,
            size: "S",
            image: "/hero/3.jpg",
            category: "პოპულარული",
            rating: 4.7,
            reviews: 31
        },
        {
            id: 4,
            name: "ვარდისფერი კოორდინატი",
            brand: "Reformation",
            price: 45,
            originalPrice: 870,
            size: "M",
            image: "/hero/4.jpg",
            category: "პოპულარული",
            rating: 4.6,
            reviews: 22
        },
        {
            id: 5,
            name: "ბორდოს ფერის კაბა",
            brand: "Self-Portrait",
            price: 48,
            originalPrice: 1140,
            size: "S",
            image: "/hero/5.jpg",
            category: "პოპულარული",
            rating: 4.8,
            reviews: 27
        },
        {
            id: 6,
            name: "შავი კლასიკური კაბა",
            brand: "House of CB",
            price: 30,
            originalPrice: 595,
            size: "M",
            image: "/hero/6.jpg",
            category: "პოპულარული",
            rating: 4.9,
            reviews: 35
        }
    ]

    const [slidesToShow, setSlidesToShow] = useState(4)
    
    // Update slidesToShow based on screen size
    React.useEffect(() => {
        const updateSlidesToShow = () => {
            if (window.innerWidth < 768) {
                setSlidesToShow(1) // Mobile: 1 item
            } else if (window.innerWidth < 1024) {
                setSlidesToShow(2) // Tablet: 2 items
            } else {
                setSlidesToShow(4) // Desktop: 4 items
            }
        }
        
        updateSlidesToShow()
        window.addEventListener('resize', updateSlidesToShow)
        
        return () => window.removeEventListener('resize', updateSlidesToShow)
    }, [])

    const totalSlides = Math.ceil(products.length / slidesToShow)

    // Ensure we always have enough products to fill slides
    const paddedProducts = [...products]
    while (paddedProducts.length % slidesToShow !== 0) {
        paddedProducts.push(...products.slice(0, slidesToShow - (paddedProducts.length % slidesToShow)))
    }

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides)
    }

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
    }

    const getCurrentProducts = () => {
        const start = currentSlide * slidesToShow
        return products.slice(start, start + slidesToShow)
    }

    return (
        <section className="pb-14 ">
            <div className="container max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-[20px] md:text-[30px] font-bold text-black mb-4">
                        პოპულარული პროდუქტები
                    </h2>
                    <p className="text-lg text-black max-w-2xl mx-auto">
                        აღმოაჩინეთ ყველაზე მოთხოვნადი ტანსაცმელი ჩვენი კოლექციიდან
                    </p>
                </div>


                <div className="relative">

                    <button
                        onClick={prevSlide}
                        className="absolute cursor-pointer left-0 top-[30%] -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300"
                    >
                        <ChevronLeft className="w-6 h-6 text-black" />
                    </button>

                    <button
                        onClick={nextSlide}
                        className="absolute cursor-pointer right-0 top-[30%] -translate-y-1/2 translate-x-4 z-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all duration-300"
                    >
                        <ChevronRight className="w-6 h-6 text-black" />
                    </button>


                    <div className="overflow-hidden">
                        <div
                            className="flex transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {Array.from({ length: totalSlides }).map((_, slideIndex) => (
                                <div key={slideIndex} className="w-full flex-shrink-0">
                                        <div className="grid pb-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                        {paddedProducts.slice(slideIndex * slidesToShow, (slideIndex + 1) * slidesToShow).map((product) => (
                                            <div key={product.id} className="group">
                                                <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ">

                                                    <div className="relative aspect-[3/4] overflow-hidden">
                                                        <Image
                                                            src={product.image}
                                                            alt={product.name}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />








                                                        <div className="absolute bottom-3 left-3">
                                                            <span className="bg-white/90 text-black md:text-[18px] text-[16px] px-2 py-1 rounded text-xs font-medium">
                                                                {product.size} ზომა
                                                            </span>
                                                        </div>
                                                    </div>


                                                    <div className="p-4">
                                                        <div className="mb-2">
                                                            <h3 className="font-semibold text-black md:text-[18px] text-[16px] mb-1 line-clamp-2">
                                                                {product.name}
                                                            </h3>

                                                        </div>




                                                        {/* Price */}
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <span className="text-lg font-bold text-black">
                                                                    ₾{product.price}
                                                                </span>
                                                                <span className="text-xs text-black ml-1">
                                                                    /დღე
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-xs text-black line-through">
                                                                    {product.originalPrice} ლარი
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Rent Button */}
                                                        <Link
                                                            href={`/product/${product.id}`}
                                                            className="block w-full mt-3 bg-[#1B3729] md:text-[18px] text-[16px] text-white text-center py-2 rounded-lg font-bold transition-colors duration-300"
                                                        >
                                                            დაჯავშნე
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                </div>

                {/* View All Button */}
                <div className="text-center ">
                    <Link
                        href="/shop"
                        className="flex md:text-[20px] text-[18px] font-bold justify-center  items-center w-[200px] mx-auto mt-4 bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide  transition-colors duration-300"
                    >
                        დაათვალიერე
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default PopularProducts
