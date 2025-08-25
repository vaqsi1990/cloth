"use client"
import React, { useState, useEffect } from 'react'

import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation} from 'swiper/modules'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Import Swiper styles
import 'swiper/css'


const Deal = () => {
    const [timeLeft, setTimeLeft] = useState({
        days: 7,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 7); // 7 დღე

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance <= 0) {
                clearInterval(timer);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor(
                        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
                    ),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000),
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const dealProducts = [
        {
            id: 1,
            name: 'Summer Collection Dress',
            originalPrice: 65.00,
            salePrice: 49.00,
            category: 'Women',
            image: '/deals/1.jpg',
            badge: 'SALE',
            badgeColor: 'bg-red-500'
        },
        {
            id: 2,
            name: 'Casual Denim Jacket',
            originalPrice: 85.00,
            salePrice: 78.00,
            category: 'Men',
            image: '/deals/1.jpg',
            badge: 'SALE',
            badgeColor: 'bg-red-500'
        },
        {
            id: 3,
            name: 'Premium Cotton T-Shirt',
            originalPrice: 50.00,
            salePrice: 45.00,
            category: 'Unisex',
            image: '/deals/1.jpg',
            badge: 'NEW',
            badgeColor: 'bg-green-500'
        },
        {
            id: 4,
            name: 'Designer Handbag',
            originalPrice: 21.00,
            salePrice: 20.00,
            category: 'Accessories',
            image: '/deals/1.jpg',
            badge: 'NEW',
            badgeColor: 'bg-green-500'
        },
        {
            id: 5,
            name: 'Organic Cotton Hoodie',
            originalPrice: 3.00,
            salePrice: 2.00,
            category: 'Unisex',
            image: '/deals/1.jpg'
        },
        {
            id: 6,
            name: 'Organic Cotton Hoodie',
            originalPrice: 3.00,
            salePrice: 2.00,
            category: 'Unisex',
            image: '/deals/1.jpg'
        }
    ];

    return (
        <section className="py-[40px] max-[767px]:py-[30px] bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex flex-wrap justify-between items-center mx-auto min-[1600px]:max-w-[1600px] min-[1400px]:max-w-[1320px] min-[1200px]:max-w-[1140px] min-[992px]:max-w-[960px] min-[768px]:max-w-[720px] min-[576px]:max-w-[540px]">
                <div className="w-full flex flex-wrap px-[15px] overflow-hidden">
                    <div className="gi-deal-section w-full">
                        <div className="gi-products">
                            <div className="section-title mb-[20px] relative flex justify-between pb-[20px] z-[5] max-[767px]:flex-col">
                                <div className="section-detail">
                                    <h2 className="gi-title mb-[0] text-[25px] font-semibold text-black relative inline p-[0] capitalize leading-[1] font-manrope max-[991px]:text-[24px] max-[767px]:text-[22px] max-[575px]:text-[20px]">
                                        კვირის <span className="text-teal-600">შემოთავაზება</span></h2>
                                    
                                </div>

                                <div id="dealend" className="dealend-timer flex gap-4 max-[767px]:mt-[15px]">
                                    <div className="time-block text-center">
                                        <div className="time text-2xl font-bold">{timeLeft.days}</div>
                                        <span className="day text-[16px]">დღე</span>
                                    </div>
                                    <div className="time-block text-center">
                                        <div className="time text-2xl font-bold">{timeLeft.hours}</div>
                                        <span className="day text-[16px]">საათი</span>
                                    </div>
                                    <div className="time-block text-center">
                                        <div className="time text-2xl font-bold">{timeLeft.minutes}</div>
                                        <span className="day text-[16px]">წუთი</span>
                                    </div>
                                    <div className="time-block text-center">
                                        <div className="time text-2xl font-bold">{timeLeft.seconds}</div>
                                        <span className="day text-[16px]">წამი</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="gi-deal-block mx-[-12px] w-full relative">
                        {/* Custom Navigation Buttons */}
                        <button className="swiper-button-prev cursor-pointer absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all duration-300 group border border-gray-200">
                            <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                        </button>

                        <button className="swiper-button-next cursor-pointer absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all duration-300 group border border-gray-200">
                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                        </button>

                        {/* Swiper Carousel */}
                        <Swiper
                            modules={[Navigation  ]}
                            spaceBetween={20}
                            slidesPerView={1}
                            breakpoints={{
                                640: {
                                    slidesPerView: 2,
                                    spaceBetween: 20,
                                },
                                768: {
                                    slidesPerView: 3,
                                    spaceBetween: 20,
                                },
                                1024: {
                                    slidesPerView: 4,
                                    spaceBetween: 20,
                                },
                                1280: {
                                    slidesPerView: 5,
                                    spaceBetween: 20,
                                },
                            }}
                            loop={true}
                            autoplay={{
                                delay: 3000,
                                disableOnInteraction: false,
                            }}
                            pagination={{
                                clickable: true,
                                renderBullet: function (index, className) {
                                    return `<span class="${className} w-2 h-2 bg-gray-400 opacity-60 hover:opacity-100 transition-opacity"></span>`
                                },
                            }}
                            navigation={{
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            }}
                            className="deal-swiper py-4"
                        >
                            {dealProducts.map((product) => (
                                <SwiperSlide key={product.id}>
                                    <div className="gi-product-content h-full px-[12px]">
                                        <div className="gi-product-inner transition-all duration-[0.3s] ease-in-out flex flex-col overflow-hidden border-[1px] border-solid border-[#eee] bg-white  rounded-lg">
                                            <div className="gi-pro-image-outer transition-all duration-[0.3s] delay-[0s] ease z-[11] relative">
                                                {/* Product Image */}
                                                <div className="relative aspect-square overflow-hidden">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name}
                                                        fill
                                                        className="object-cover w-full h-full"
                                                    />
                                                    
                                                   
                                                </div>
                                            </div>

                                            {/* Product Info */}
                                            <div className="p-4 flex-1 flex flex-col">
                                                {/* Category */}
                                                <div className="mb-2">
                                                    <span className="text-[14px] text-gray-500 uppercase tracking-wide">
                                                        {product.category}
                                                    </span>
                                                </div>

                                                {/* Product Title */}
                                                <h3 className="text-sm font-medium text-gray-900 mb-3 leading-tight line-clamp-2">
                                                    {product.name}
                                                </h3>

                                                {/* Pricing */}
                                                <div className="mt-auto">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-lg font-bold text-gray-900">
                                                            ${product.salePrice.toFixed(2)}
                                                        </span>
                                                        <span className="text-sm text-gray-400 line-through">
                                                            ${product.originalPrice.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Deal