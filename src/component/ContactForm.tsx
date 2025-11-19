'use client'

import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, User, MessageSquare } from 'lucide-react'

const ContactForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    })

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        
        // Simulate form submission
        setTimeout(() => {
            setIsSubmitting(false)
            setIsSubmitted(true)
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            })
            
            // Reset success message after 3 seconds
            setTimeout(() => {
                setIsSubmitted(false)
            }, 3000)
        }, 1000)
    }

    return (
        <section className="">
            <div className="container max-w-7xl mx-auto px-4">
                {/* Header */}
             

                <div className="grid mt-10 lg:grid-cols-2 gap-12">
                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div>
                          
                            <p className="text-black md:text-[18px] text-[16px] mb-8">
                                ჩვენი გუნდი მზად არის დაგეხმაროთ ნებისმიერი კითხვის გადაჭრაში. 
                                დაგვიკავშირდით ნებისმიერ დროს
                            </p>
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-6">
                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-[#1B3729] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="block md:text-[18px] text-[16px] font-medium text-black mb-2">ელფოსტა</h4>
                                    <p className="text-black">info@cloth.ge</p>
                                    <p className="text-black">support@cloth.ge</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-[#1B3729] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="block md:text-[18px] text-[16px] font-medium text-black mb-2">ტელეფონი</h4>
                                    <p className="text-black">+995 555 123 456</p>
                                    <p className="text-black">+995 555 789 012</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 bg-[#1B3729] rounded-lg flex items-center justify-center flex-shrink-0">
                                    <MapPin className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="block md:text-[18px] text-[16px] font-medium text-black mb-2">მისამართი</h4>
                                    <p className="text-black">თბილისი, საქართველო</p>
                                    <p className="text-black">რუსთაველის გამზირი 15</p>
                                </div>
                            </div>
                        </div>

                      
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg mb-14">
                        <h3 className="md:text-[20px] text-[18px] font-bold text-gray-900 mb-6">
                            გამოგვიგზავნეთ შეტყობინება
                        </h3>

                        {isSubmitted && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 font-medium">
                                     შეტყობინება წარმატებით გაიგზავნა! ჩვენ მალე დაგიკავშირდებით.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Name */}
                            <div>
                                <label htmlFor="name" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                                    სახელი *
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                                        placeholder="შეიყვანეთ თქვენი სახელი"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                                    ელფოსტა *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                                        placeholder="შეიყვანეთ თქვენი ელფოსტა"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label htmlFor="phone" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                                    ტელეფონი
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                                        placeholder="+995 555 123 456"
                                    />
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label htmlFor="subject" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                                    თემა *
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300"
                                    placeholder="შეიყვანეთ თემა"
                                />
                            </div>

                            {/* Message */}
                            <div>
                                <label htmlFor="message" className="block md:text-[18px] text-[16px] font-medium text-black mb-2">
                                    შეტყობინება *
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        rows={5}
                                        className="w-full text-black pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-300 resize-none"
                                        placeholder="შეიყვანეთ თქვენი შეტყობინება..."
                                    />
                                </div>
                            </div>

                       
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#1B3729] cursor-pointer text-white py-3 px-6 rounded-lg md:text-[18px] text-[16px] font-bold transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        <span>იგზავნება...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        <span>შეტყობინების გაგზავნა</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ContactForm
