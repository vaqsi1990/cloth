"use client"
import React, { useState, useEffect } from 'react'

import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation } from 'swiper/modules'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import productsData from '@/data/products.json'

// Import Swiper styles
import 'swiper/css'
import Link from 'next/link'


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

    // Get products with sales for deals
    const dealProducts = productsData.products.filter(product => product.hasSale);

    return (
        <section className="py-[40px] max-[767px]:py-[30px] bg-gradient-to-br from-red-50 to-orange-50">
            <div className="flex flex-wrap justify-between items-center mx-auto min-[1600px]:max-w-[1600px] min-[1400px]:max-w-[1320px] min-[1200px]:max-w-[1140px] min-[992px]:max-w-[960px] min-[768px]:max-w-[720px] min-[576px]:max-w-[540px]">
                <div className="w-full flex flex-wrap  overflow-hidden">
                    <div className="gi-deal-section w-full">
                        <div className="gi-products">
                           

                            <div className="flex mx-auto flex-col mb-8">
                                <h2 className="text-2xl text-black text-center  font-bold mb-6 text-center ">
                                    კვირის შემოთავაზება
                                </h2>

                                {/* Navigation Tabs */}
                                <div className="flex mx-auto text-black flex-wrap justify-center md:justify-start gap-4 sm:gap-4 md:gap-6">
                                    <div id="dealend" className="dealend-timer text-[16px]   flex gap-2 sm:gap-3 md:gap-4">
                                        <div className="time-block text-center min-w-[40px] sm:min-w-[50px]">
                                            <div className="time font-bold ">{timeLeft.days}</div>
                                            <span className="day ">დღე</span>
                                        </div>
                                        <div className="time-block text-center min-w-[40px] sm:min-w-[50px]">
                                            <div className="time font-bold ">{timeLeft.hours}</div>
                                            <span className="day ">საათი</span>
                                        </div>
                                        <div className="time-block text-center min-w-[40px] sm:min-w-[50px]">
                                            <div className="time font-bold ">{timeLeft.minutes}</div>
                                            <span className="day ">წუთი</span>
                                        </div>
                                        <div className="time-block text-center min-w-[40px] sm:min-w-[50px]">
                                            <div className="time font-bold ">{timeLeft.seconds}</div>
                                            <span className="day ">წამი</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="gi-deal-block mx-auto mx-[-12px] w-full relative">
                        {/* Custom Navigation Buttons */}
                        <button className="swiper-button-prev cursor-pointer absolute left-2 sm:left-4 top-1/3 transform -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all duration-300 group border border-gray-200">
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-900" />
                        </button>

                        <button className="swiper-button-next cursor-pointer absolute right-2 sm:right-4 top-1/3 transform -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-white shadow-lg rounded-full flex items-center justify-center hover:bg-gray-50 transition-all duration-300 group border border-gray-200">
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 group-hover:text-gray-900" />
                        </button>

                        {/* Swiper Carousel */}
                        <Swiper
                            modules={[Navigation]}
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
                                            <div className="p-4 text-black text-center flex-1 flex flex-col">
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
                                                <div className="mt-auto">
                                                    <div className="flex items-center justify-center flex-row md:text-[16px] text-[16px] space-x-2">
                                                        <span className=" font-bold text-black">
                                                            {product.currentPrice.toFixed(2)} ლარი
                                                        </span>
                                                        <span className=" text-black line-through">
                                                            {product.originalPrice.toFixed(2)} ლარი
                                                        </span>
                                                    </div>
                                                    <Link
                                                        href={`/product/${product.id}`}
                                                        className="gi-btn-1 rounded-md transition-all duration-[0.3s] ease-in-out overflow-hidden text-center relative py-[10px] max-[767px]:py-[6px] px-[15px] max-[767px]:px-[10px] bg-[#4b5966] text-[#fff] border-[0] text-[18px] md:text-[20px] mt-4  tracking-[0] font-medium inline-flex items-center"
                                                    >
                                                        დეტალები

                                                    </Link>
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