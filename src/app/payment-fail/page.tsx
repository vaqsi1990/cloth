"use client"
import React from 'react'
import Link from 'next/link'
import { XCircle, ArrowLeft, Home, ShoppingBag, CreditCard } from 'lucide-react'

const PaymentFailPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 py-16">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Error Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                            <XCircle className="w-12 h-12 text-red-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-black mb-2">
                            გადახდა წარუმატებლად დასრულდა
                        </h1>
                        <p className="text-black text-lg">
                            სამწუხაროდ, თქვენი გადახდა ვერ განხორციელდა
                        </p>
                    </div>

                    {/* Error Details Card */}
                    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-semibold text-black mb-4">რა შეიძლება იყოს მიზეზი?</h2>
                        
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <CreditCard className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-black font-medium">ბარათის ინფორმაცია</p>
                                    <p className="text-gray-600 text-sm">შეამოწმეთ, რომ ბარათის ნომერი, CVV და ვადის გასვლის თარიღი სწორია</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <CreditCard className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-black font-medium">ბარათის ბალანსი</p>
                                    <p className="text-gray-600 text-sm">დარწმუნდით, რომ ბარათზე საკმარისი თანხაა</p>
                                </div>
                            </div>
                            
                            <div className="flex items-start space-x-3">
                                <CreditCard className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-black font-medium">ბანკის შეზღუდვები</p>
                                    <p className="text-gray-600 text-sm">თქვენმა ბანკმა შეიძლება უარყო ტრანზაქცია უსაფრთხოების მიზნით</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-2xl shadow-sm p-6">
                        <div className="space-y-4">
                            <Link
                                href="/checkout"
                                className="flex items-center justify-center w-full bg-[#1B3729] text-white px-8 py-4 rounded-lg font-bold uppercase tracking-wide transition-colors duration-300 hover:opacity-95"
                            >
                                <CreditCard className="w-5 h-5 mr-2" />
                                კვლავ სცადეთ გადახდა
                            </Link>
                            
                            <Link
                                href="/cart"
                                className="flex items-center justify-center w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                            >
                                <ShoppingBag className="w-5 h-5 mr-2" />
                                კალათაში დაბრუნება
                            </Link>
                            
                            <Link
                                href="/shop"
                                className="flex items-center justify-center w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                მაღაზიაში დაბრუნება
                            </Link>
                            
                            <Link
                                href="/"
                                className="flex items-center justify-center w-full bg-gray-100 text-black py-4 px-6 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                            >
                                <Home className="w-5 h-5 mr-2" />
                                მთავარ გვერდზე დაბრუნება
                            </Link>
                        </div>

                        {/* Help Info */}
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="font-medium text-black mb-2">დახმარება გჭირდებათ?</h3>
                            <p className="text-black text-sm mb-2">
                                თუ პრობლემა გრძელდება, გთხოვთ დაგვიკავშირდეთ:
                            </p>
                            <p className="text-black text-sm font-medium">
                                ელ. ფოსტა: support@dressla.ge
                            </p>
                            <p className="text-black text-sm font-medium">
                                ტელეფონი: +995 XXX XXX XXX
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PaymentFailPage
