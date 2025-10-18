import React from 'react'
import Image from 'next/image'

const About = () => {
    return (
        <section className="px-[12px] pb-14 ">
            <div className="flex flex-wrap justify-between items-center mx-auto max-w-7xl">
                <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
                    {/* Image - Left Side */}
                    <div className="w-full lg:w-1/2">
                        <div className="relative aspect-square lg:aspect-[4/3] rounded-lg overflow-hidden">
                            <Image
                                src="/about.jpg"
                                alt="About Us"
                                fill
                                className="object-cover"
                                sizes="(max-width: 1024px) 100vw, 50vw"
                            />
                        </div>
                    </div>

                    {/* Text Content - Right Side */}
                    <div className="w-full lg:w-1/2">
                        <div className="text-black text-[20px] leading-relaxed">
                            <h2 className="text-[20px] md:text-[30px] font-bold mb-6 text-gray-900">
                                ჩვენს შესახებ
                            </h2>
                            <p className="mb-4">
                                ჩვენი კომპანია მუშაობს ფეშენის სფეროში და გთავაზობთ ხარისხიან ტანსაცმელს ყველა ასაკისა და სტილისთვის.
                            </p>
                            <p className="mb-4">
                                ჩვენი მისიაა მოგაწოდოთ ყველაზე მოდური და კომფორტული ტანსაცმელი, რომელიც გამოირჩევა ხარისხითა და სტილით.
                            </p>
                            <p>
                                ჩვენი გუნდი მუდმივად მუშაობს ახალი კოლექციების შექმნაზე, რათა მოგაწოდოთ ყველაზე განახლებული ტრენდები და სტილები.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default About
