import Link from 'next/link'
import React from 'react'

const cat = [
    {
        id: 1,
        title: "ქალების კოლექცია",
        image: "/cat/1.jpg",
    },
    {
        id: 2,
        title: "ბავშვების კოლექცია",
        image: "/cat/2.jpg",
    },

    {
        id: 3,
        title: "კაცების კოლექცია",
        image: "/cat/3.jpg",
    },


]

const Cat = () => {
    return (
        <>
            <div className="gi-offer-section overflow-hidden py-10 md:py-8">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cat.map((item) => (
                            <div
                                key={item.id}
                                className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 group"
                            >
                                {/* Image */}
                                <div className="relative w-full h-64 md:h-80 overflow-hidden">
                                    <img
                                        src={item.image}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />

                                    {/* Overlay gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                </div>

                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col justify-center items-end p-6 z-10">
                                    <h5 className="text-white  md:text-[20px] text-[18px] font-bold drop-shadow-lg group-hover:scale-105 transition-transform duration-300 text-right">
                                        {item.title}
                                    </h5>
                                    <Link
                                        href="/"
                                        className="gi-btn-1 transition-all duration-[0.3s] ease-in-out overflow-hidden text-center relative py-[10px] max-[767px]:py-[6px] px-[15px] max-[767px]:px-[10px] bg-[#4b5966] text-[#fff] border-[0] text-[15px] mt-4 max-[767px]:text-[13px] tracking-[0] font-medium inline-flex items-center hover:bg-[#5caf90] hover:text-[#fff]"
                                    >
                                        იშოპინგე
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


        </>
    )
}

export default Cat