import React from 'react'
import Image from '@/component/AppImage'
import Link from 'next/link'

const About = () => {
    return (
        <section className="px-[12px] pb-14 ">
            <div className="flex flex-wrap justify-between items-center mx-auto max-w-7xl">
                <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
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

                    <div className="w-full lg:w-1/2">
                        <div className="text-black text-[20px] leading-relaxed">
                            <h2 className="text-[20px] md:text-[30px] font-bold mb-6 text-gray-900">
                                ჩვენს შესახებ
                            </h2>
                            <p className="mb-4">
                                <span className="font-bold">შ.პ.ს. „დრესსლა“</span> არის თანამედროვე ონლაინ მარკეტპლეის პლატფორმა, რომელიც აერთიანებს ფიზიკურ პირებსა და საქართველოს კანონმდებლობით რეგისტრირებულ ინდივიდუალურ მეწარმეებსა და იურიდიულ პირებს და აძლევს მათ შესაძლებლობას განათავსონ განცხადებები ტანსაცმლისა და აქსესუარების გაყიდვისა და გაქირავების მიზნით.
                            </p>
                            <p className="mb-4">
                                პლატფორმაზე პროდუქციის გაყიდვა დასაშვებია მხოლოდ ახალი ნივთების შემთხვევაში, ხოლო გაქირავება — როგორც ახალი, ისე გამოყენებული ტანსაცმლისა და აქსესუარებისთვის.
                            </p>
                            <Link
                                href="/about"
                                className="inline-block font-semibold text-black underline underline-offset-4 hover:opacity-80"
                            >
                                სრული ინფორმაცია
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default About
