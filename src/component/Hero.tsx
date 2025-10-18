'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

const Hero = () => {
    return (
        <section className="relative w-full    overflow-hidden">
            {/* Background decorative elements */}


            {/* Main content card */}
            <div className="relative z-10 flex  justify-center  ">
                <div className=" rounded-3xl  p-8 md:p-12 lg:p-16 max-w-7xl w-full mx-4">




                    {/* Central content */}
                    <div className="flex flex-col text-center lg:text-left lg:flex-row items-center justify-between gap-8">
                        {/* Left side - QUALITY */}
                        <div className="text-center lg:text-left">
                            <h2 className="text-[20px] md:text-[30px] font-bold uppercase tracking-wider text-black">
                            მხოლოდ
                            </h2>
                        </div>
                        <div className="relative flex-shrink-0">
                            {/* Decorative stacked images */}
                            <div className="absolute w-64 h-80 md:w-80 md:h-96 rounded-2xl overflow-hidden shadow-lg bg-gray-200 transform -rotate-[10deg] -translate-x-12 translate-y-4 z-0">
                                <Image
                                    src="/hero/1.jpg"
                                    alt="Background 1"
                                    fill
                                    className="object-cover opacity-90"
                                />
                            </div>

                            <div className="absolute w-64 h-80 md:w-80 md:h-96 rounded-2xl overflow-hidden shadow-lg bg-gray-200 transform rotate-[10deg] translate-x-12 translate-y-6 z-0">
                                <Image
                                    src="/hero/3.jpg"
                                    alt="Background 2"
                                    fill
                                    className="object-cover opacity-90"
                                />
                            </div>

                            {/* Center image (main model) */}
                            <div className="relative w-64 h-80 md:w-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl z-10">
                                <Image
                                    src="/hero/2.jpg"
                                    alt="Fashion Model"
                                    fill
                                    className="object-cover"
                                    priority
                                />
                            </div>
                        </div>


                        {/* Right side - MATTERS */}
                        <div className="text-center lg:text-right">
                            <h2 className="text-[20px] md:text-[30px] font-bold uppercase tracking-wider text-black">
                               საუკეთესო
                            </h2>
                          
                        </div>
                    </div>

                    {/* Bottom text */}
                    <Link
                                href="/shop"
                                className="flex md:text-[20px] text-[18px] font-bold justify-center md:mt-14 items-center w-[200px] mx-auto mt-4 bg-black text-white px-8 py-4 rounded-lg font-medium uppercase tracking-wide hover:bg-gray-800 transition-colors duration-300"
                            >
                              დაათვალიერე
                            </Link>
                </div>
            </div>
        </section>
    )
}

export default Hero