'use client'

import React from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules'
import Image from 'next/image'
import Link from 'next/link'

// Import Swiper styles
import 'swiper/css'

import 'swiper/css/pagination'

import 'swiper/css/effect-fade'

const Hero = () => {
    const heroSlides = [
        {
            id: 1,
            image: '/hero/1.jpg',
            title: 'ახალი კოლექცია 2024',
            subtitle: 'მოდის უახლესი ტრენდები აქ დაგხვდება',
            description: 'დაამატე გარდერობს სიახლე – ისარგებლე 40%-მდე ფასდაკლებით',
            buttonText: 'შეიძინე ახლავე',
            buttonLink: '/new-arrivals',
            overlayColor: 'rgba(255, 255, 255, 0.1)'
        },
        {
            id: 2,
            image: '/hero/2.jpg',
            title: 'ზაფხულის სტილი',
            subtitle: 'მსუბუქი, თავისუფალი და კომფორტული',
            description: 'აირჩიე იდეალური ლუქი შენი ყოველი დღისთვის',
            buttonText: 'გაიგე მეტი',
            buttonLink: '/summer-collection',
            overlayColor: 'rgba(255, 255, 255, 0.15)'
        }

    ]

    return (
        <section className="relative w-full h-[600px] md:h-[600px]  overflow-hidden">
            <Swiper
                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                effect="fade"
                spaceBetween={0}
                slidesPerView={1}
                loop={true}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                pagination={{
                    clickable: true,
                    renderBullet: function (index: number, className: string) {
                        return `<span class="${className} w-3 h-3 bg-white opacity-60 hover:opacity-100 transition-opacity"></span>`
                    },
                }}
                navigation={{
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev',
                }}
                className="h-full w-full"
            >
                {heroSlides.map((slide) => (
                    <SwiperSlide key={slide.id} className="relative">
                        {/* Background Image */}
                        <div className="relative w-full h-full">
                            <Image
                                src={slide.image}
                                alt={slide.title}
                                fill
                                className="object-cover"
                                priority={slide.id === 1}
                            />
                            {/* Overlay */}
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: slide.overlayColor }}
                            />

                            {/* Content */}
                            <div className="absolute inset-0 flex items-center">
                                <div className="text-center md:text-start text-white px-8 md:px-12 lg:px-16 max-w-3xl">
                                    <h1 className="md:text-[38px] text-[24px] font-serif font-bold text-black drop-shadow-lg">
                                        {slide.title}
                                    </h1>
                                    <h2 className="md:text-[22px] text-[16px] font-serif italic text-black  max-w-lg drop-shadow-md">
                                        {slide.subtitle}
                                    </h2>
                                    <p className="text-black md:text-xl mb-4 max-w-xl drop-shadow-md">
                                        {slide.description}
                                    </p>
                                    <Link
                                        href={slide.buttonLink}
                                        className="gi-btn-1 transition-all duration-[0.3s] ease-in-out overflow-hidden text-center relative py-[10px] max-[767px]:py-[6px] px-[15px] max-[767px]:px-[10px] bg-[#4b5966] text-[#fff] border-[0] text-[15px] max-[767px]:text-[13px] tracking-[0] font-medium inline-flex items-center hover:bg-[#5caf90] hover:text-[#fff]"
                                    >
                                        {slide.buttonText}
                                      
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>

            {/* Custom Navigation Buttons */}


            {/* Custom Pagination */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
                <div className="swiper-pagination"></div>
            </div>

        </section>
    )
}

export default Hero