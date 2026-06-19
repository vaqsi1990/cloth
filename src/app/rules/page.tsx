"use client"

import React, { useEffect, useState } from 'react'
import { Shield, FileText, RotateCcw, Cookie } from 'lucide-react'
import TermsContent from '@/component/rules/TermsContent'
import PrivacyContent from '@/component/rules/PrivacyContent'
import ReturnContent from '@/component/rules/ReturnContent'

const VALID_TABS = ['privacy', 'terms', 'return', 'coockies'] as const

const RulesPage = () => {
    const [activeTab, setActiveTab] = useState('privacy')

    useEffect(() => {
        const tab = new URLSearchParams(window.location.search).get('tab')
        if (tab && VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
            setActiveTab(tab)
        }
    }, [])

    const tabs = [
        { 
            id: 'privacy', 
            label: 'პერსონალურ მონაცემთა დაცვის პოლიტიკა', 
            icon: Shield 
        },
        { 
            id: 'terms', 
            label: 'ვადები და პირობები', 
            icon: FileText 
        },
        { 
            id: 'return', 
            label: 'დაბრუნების პოლიტიკა', 
            icon: RotateCcw 
        },
        { 
            id: 'coockies', 
            label: 'Cookie Policy', 
            icon: Cookie 
        },
    ]

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto px-4 py-10">
                <h1 className="text-3xl font-bold mb-8 text-center">წესები და პოლიტიკა</h1>
                
                {/* Tabs */}
                <div className="flex flex-wrap gap-4 mb-8 border-b border-gray-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-lg transition-colors text-[16px] md:text-[18px] font-medium ${
                                activeTab === tab.id
                                    ? 'bg-[#1B3729] text-white border-b-2 border-[#1B3729]'
                                    : 'text-black hover:text-[#1B3729] hover:bg-gray-50'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-10">
                    {activeTab === 'privacy' && <PrivacyContent />}

                    {activeTab === 'terms' && <TermsContent />}

                    {activeTab === 'return' && <ReturnContent />}

                    {activeTab === 'coockies' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold mb-6">Cookie პოლიტიკა</h2>
                            
                            <section className="space-y-4">
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                    <span className="font-bold">შპს „Dressla“-ში</span>ვიყენებთ Cookie - ს თქვენი გამოცდილების გასაუმჯობესებლად ჩვენი ვებსაიტის დათვალიერებისას. ჩვენი ვებსაიტის გამოყენებით თქვენ ეთანხმებით cookie - ს გამოყენებას ამ Cookie Policy - ის შესაბამისად. Cookie - ს  გვეხმარება ვიზიტისას უკეთესი გამოცდილების შექმნაში ჩვენს ონლაინ არხზე. ასეთი ტექნოლოგიის გამოყენება შეესაბამება საქართველოს პერსონალურ მონაცემთა დაცვის კანონსა და ევროკავშირის მონაცემთა დაცვის ზოგად რეგულაციას (GDPR). წინამდებარე პოლიტიკა განმარტავს რა არის ქ Cookie,როგორ ვიყენებთ მათ და როგორ შეგიძლიათ მართოთ თქვენი Cookie პრეფერენციები.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">რა არის Cookie ?</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                Cookie არის მცირე ტექსტური ფაილები, რომლებიც ინახება თქვენს მოწყობილობაზე ვებსაიტის მონახულებისას. ისინი საშუალებას აძლევს ვებსაიტს ამოიცნოს თქვენი მოწყობილობა და დაიმახსოვროს გარკვეული ინფორმაცია თქვენი ვიზიტის შესახებ, როგორიცაა ენის პრეფერენციები, შესვლის დეტალები ან დათვალიერების ისტორია.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">Cookie-ს მოქმედების ვადა</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                    <span className="font-bold">სესიური Cookie:</span> სესიური Cookie აქტიურია მიმდინარე დათვალიერების სესიის განმავლობაში და ჩვეულებრივ აქვს მოკლე ვადა (1–2 წუთიდან 1–2 დღემდე).
                                </p>
                                <p className="md:text-[18px] text-[16px] leading-relaxed mt-4">
                                    <span className="font-bold">მუდმივი Cookie:</span> მუდმივი Cookie აქტიურია უფრო ხანგრძლივი პერიოდის განმავლობაში (1 წელიც კი), ვიდრე სესიური Cookie; ვადა განსხვავდება თითოეული Cookie - სთვის და განისაზღვრება ვებსაიტის ოპერატორის მიერ.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">ჩვენ მიერ გამოყენებული Cookie ტიპები და მათი გამოყენების მიზნები</h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed font-semibold mb-2">1. აუცილებელი Cookie:</p>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        ეს Cookie აუცილებელია ჩვენი ვებსაიტის ფუნქციონირებისთვის. ისინი უზრუნველყოფენ ძირითად ფუნქციებს, როგორიცაა გვერდებზე ნავიგაცია, უსაფრთხო ავტორიზაცია და შეზღუდულ არეალებზე წვდომა. ამ Cookie - სგარეშე ჩვენი ვებსაიტის ზოგიერთი სერვისი ვერ იმუშავებს.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed font-semibold mb-2">2. შესრულების Cookie:</p>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        :შესრულების Cookie აგროვებენ ინფორმაციას იმის შესახებ, თუ როგორ იყენებთ ჩვენს ვებსაიტს, მაგალითად რომელ გვერდებს სტუმრობთ ყველაზე ხშირად ან შეხვდით თუ არა შეცდომებს. ეს Cookie გვეხმარება ვებსაიტის მუშაობის გაუმჯობესებასა და მომხმარებლის გამოცდილების დახვეწაში.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed font-semibold mb-2">3. ფუნქციური Cookie:</p>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed">
                                            იმახსოვრებს მომხმარებლის პრეფერენციებსა და პარამეტრებს (მაგ., ენა, რეგიონი) მომავალი ვიზიტებისთვის.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed font-semibold mb-2">4. სამიზნე Cookie:</p>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        ეს Cookie საშუალებას აძლევს ჩვენს ვებსაიტს დაიმახსოვროს თქვენი პრეფერენციები და პარამეტრები. მაგალითად, თუ აირჩიეთ სასურველი ენა ან რეგიონი, ფუნქციური Cookie უზრუნველყოფენ, რომ თქვენი არჩევანი შენარჩუნდეს მომავალ ვიზიტებზეც.
                                        </p>
                                    </div>
                                    <div>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed font-semibold mb-2">5. ანალიტიკური Cookie:</p>
                                        <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        ეს Cookie გვაძლევს საშუალებას დავაკვირდეთ ვებსაიტის ვიზიტებსა და ტრაფიკის წყაროებს, რაც გვაძლევს შესაძლებლობას გავზომოთ და გავაუმჯობესოთ ჩვენი საიტის მუშაობა. ისინი გვაწვდიან ინფორმაციას ყველაზე და ყველაზე ნაკლებად პოპულარული გვერდებისა და მომხმარებელთა გადაადგილების შესახებ საიტზე. ამ Cookie შეგროვებული ყველა მონაცემი არის აგრეგირებული. კომპანია ამ ინფორმაციას იყენებს სტატისტიკის შესადგენად, მაგალითად, რომელი იყო ყველაზე პოპულარული გვერდი, რა მოეწონათ მომხმარებლებს და სხვ. ეს Cookie ნაგულისხმევად ჩართულია ვებსაიტის გახსნისას, თუმცა მომხმარებელს შეუძლია მათი გამორთვა. ამ Cookie გამორთვა ართულებს კომპანიისთვის ვებსაიტის მუშაობის სათანადოდ მონიტორინგს, რაც ხელს უშლის რეალური მომხმარებლის საჭიროებებზე მორგებული გაუმჯობესებების განხორციელებას.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">Cookie დამდგმელი მხარე</h3>
                                <div className="space-y-3">
                                    <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        <span className="font-bold">პირველი მხარის Cookie:</span> ეს Cookie განთავსებულია უშუალოდ იმ ვებსაიტის მიერ, რომელსაც სტუმრობთ. მხოლოდ ვებსაიტის ოპერატორს შეუძლია მათი წაკითხვა და Cookie - ში შენახულ ინფორმაციაზე წვდომა.
                                    </p>
                                    <p className="md:text-[18px] text-[16px] leading-relaxed">
                                        <span className="font-bold">მესამე მხარის Cookie:</span>ეს Cookie განთავსებულია ვებსაიტზე მესამე მხარის მიერ, რომელიც არ არის ვებსაიტის ოპერატორი. თუ ვებსაიტის ოპერატორი გადაწყვეტს სხვა ვებსაიტების ელემენტების ჩაშენებას საკუთარ ვებსაიტში, მაშინ ვებსაიტის გახსნისას ეს მესამე მხარის Cookie არ განთავსდება მომხმარებლის მოწყობილობაზე იმ ვებსაიტის მიერ, რომელსაც სტუმრობთ, არამედ მესამე მხარის (Cookie მენეჯერის) მიერ, როგორიცაა რეკლამის განმთავსებელი ან ანალიტიკის მომსახურების მიმწოდებელი (მაგ., Facebook, Google). ამ მესამე მხარეებმა შესაძლოა მიიღონ ინფორმაცია მომხმარებლის მიერ მონახულებული ვებსაიტის დათვალიერების შესახებ. როდესაც მესამე მხარის Cookie იდგმება, ვებსაიტი, რომელიც Cookie ადგენს, მოქმედებს როგორც შუამავალი და მხოლოდ ის მესამე მხარე, რომელიც მართავს Cookie ,აქვს წვდომა Cookie შენახულ და გადაცემულ ინფორმაციაზე.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">ვის და რა მიზნით ვაწვდით პერსონალურ მონაცემებს?</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                ჩვენ შეიძლება გადავცეთ თქვენი პერსონალური მონაცემები შესაბამისი შეტყობინების საფუძველზე სამართალდამცავ ორგანოებს იმ შემთხვევებში, როდესაც არსებობს სამართლებრივი საფუძველი.
                                </p>
                                <p className="md:text-[18px] text-[16px] leading-relaxed mt-4">
                                ჩვენ შეიძლება გადავცეთ თქვენი პერსონალური მონაცემები შესაბამისი შეტყობინების საფუძველზე სამართალდამცავ ორგანოებს იმ შემთხვევებში, როდესაც არსებობს სამართლებრივი საფუძველი.
                                </p>

                                <p className="md:text-[18px] text-[16px] leading-relaxed mt-4">
                                იმ კომპანიას/ფიზიკური პირის რომლებიც თქვენი მოთხოვნის შემთხვევაში უზრუნველყოფენ ნივთის მიწოდებას.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">როგორ ვიყენებთ Cookie-ს?</h3>
                                <ul className="list-disc list-inside space-y-2 md:text-[18px] text-[16px] ml-4">
                                    <li>მომხმარებლის გამოცდილების გასაუმჯობესებლად: Cookie გვაძლევს საშუალებას მოვარგოთ ვებსაიტის შინაარსი თქვენს პრეფერენციებსა და დათვალიერების ჩვევებს.</li>
                                    <li>ვებსაიტის ტრაფიკის გასაანალიზებლად: ვიყენებთ Cookie იმის გასაგებად, თუ როგორ ურთიერთობენ ვიზიტორები ჩვენს ვებსაიტთან, რაც გვეხმარება ფუნქციონალისა და დიზაინის გაუმჯობესებაში.</li>
                                    <li>მარკეტინგული მიზნებისთვის: Cookie გვეხმარება თქვენთვის პერსონალიზებული რეკლამების ან აქციების ჩვენებაში ჩვენს სერვისებთან დაკავშირებით.</li>
                                    <li>თქვენი პრეფერენციების დასამახსოვრებლად: ვინახავთ ინფორმაციას, როგორიცაა ენა და რეგიონი, რათა მოგაწოდოთ მორგებული დათვალიერების შესაძლებლობა.</li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">Cookie განთავსების სამართლებრივი საფუძველი</h3>
                                <div className="space-y-3 md:text-[18px] text-[16px] leading-relaxed">
                                    <p>1. მომხმარებლის თანხმობა   კანონის 5.1.ა მუხლის შესაბამისად, მონცემთა დამუშავება შესაძლებელია თუ მონაცემთა სუბიექტმა განაცხადა თანხმობა მის შესახებ მონაცემთა ერთი ან რამდენიმე კონკრეტული მიზნით დამუშავებაზე.</p>
                                    <p>2.ვებსაიტის ოპერატორის ლეგიტიმური ინტერესი საქართველოს პერსონალურ მონაცემთა დაცვის კანონის 5.1.ი მუხლის შესაბამისად: მონაცემთა დამუშავება აუცილებელია დამუშავებისთვის პასუხისმგებელი პირის ან მესამე პირის მნიშვნელოვანი ლეგიტიმური  ინტერესების დასაცავად, გარდა იმ შემთხვევიდა, თუ არსებობს მონაცემთა სუბიექტის (მათ შორის, არასრულწლოვანის) უფლებების დაცვის აღმატებული ინტერესი.</p>
                                    <p>3. ლეგიტიმური ინტერესი: ვებსაიტის ფუნქციონირების კომერციული და ეკონომიკური ინტერესი. ლეგიტიმური ინტერესის საფუძველზე დამუშავებული ფუნქციური და შესრულების Cookie მომხმარებელს შეუძლია გამორთოს ვებსაიტის გახსნისას და ნებისმიერ დროს შემდგომში.</p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">თქვენი Cookie პრეფერენციების მართვა</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                თქვენ გაქვთ შესაძლებლობა ნებისმიერ დროს მართოთ და აკონტროლოთ Cookie თქვენი ბრაუზერის პარამეტრების მეშვეობით Cookie შეტყობინების გვერდის გახსნით. გთხოვთ გაითვალისწინოთ, რომ ზოგიერთი Cookie გამორთვამ ან უარყოფამ შეიძლება გავლენა იქონიოს ჩვენი ვებსაიტის ფუნქციონირებაზე.
Cookie მართვისა და „Do Not Track“-ის ჩართვის ინსტრუქცია თქვენი ბრაუზერისთვის:

                                </p>
                               
                                <ul className="list-disc list-inside space-y-2 md:text-[18px] text-[16px] ml-4">
                                    <li>Google Chrome: <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-[#1B3729] underline">https://support.google.com/chrome/answer/95647</a></li>
                                    <li>Mozilla Firefox: <a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-[#1B3729] underline">https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences</a></li>
                                    <li>Safari: <a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-[#1B3729] underline">https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac</a></li>
                                    <li>Microsoft Edge: <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-[#1B3729] underline">https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09</a></li>
                                </ul>
                            </section>

                          

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">მონაცემთა დაცვის უფლებები და სამართლებრივი საშუალებები</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                მომხმარებლის მონაცემთა დაცვის უფლებები და სამართლებრივი საშუალებები და მათი შეზღუდვები დეტალურად არის აღწერილი საქართველოს პერსონალურ მონაცემთა დაცვის კანონში.
                                </p>
                                <p className="md:text-[18px] text-[16px] font-semibold leading-relaxed"> მომხმარებელს შეუძლია:</p>
                                <ul className="list-disc list-inside space-y-2 md:text-[18px] text-[16px] ml-4">
                                    <li>Cookie განთავსების ჩართვა ან გამორთვა Cookie პარამეტრების გამოყენებით;</li>
                                    <li>მოითხოვოს ინფორმაცია იმის შესახებ, თუ რა სახის პერსონალური მონაცემები მუშავდება Cookie გამოყენებისას;</li>
                                    <li>მოითხოვოს მისი პერსონალური მონაცემების გასწორება, რომლებიც მუშავდება Cookie გამოყენებისას;</li>
                                    <li>მოითხოვოს მისი პერსონალური მონაცემების წაშლა ან მათი დამუშავების შეზღუდვა Cookie გამოყენებისას;</li>
                                    <li>საკუთარი მდგომარეობიდან გამომდინარე ნებისმიერ დროს გააპროტესტოს მისი პერსონალური მონაცემების დამუშავება „ლეგიტიმური ინტერესის“ საფუძველზე Cookie გამოყენებისას. ამ შემთხვევაში პერსონალური მონაცემები აღარ დამუშავდება, თუ მონაცემთა კონტროლიორი არ დაამტკიცებს, რომ მონაცემთა დამუშავება გამართლებულია სავალდებულო ლეგიტიმური მიზეზებით, რომლებიც უპირატესობას ანიჭებენ მომხმარებლის ინტერესებს, უფლებებსა და თავისუფლებებს, ან დაკავშირებულია სამართლებრივი მოთხოვნების წარდგენასთან, აღსრულებასთან ან დაცვასთან. თუ მომხმარებელი გააპროტესტებს პერსონალური მონაცემების დამუშავებას პირდაპირი მარკეტინგის მიზნებისთვის, მაშინ პერსონალური მონაცემები აღარ დამუშავდება ამ მიზნით;</li>
                                    <li>მოითხოვოს ზიანის ანაზღაურება იმ ზარალისთვის, რომელიც მიადგა პერსონალური მონაცემების უკანონო დამუშავების შედეგად.</li>
                                </ul>
                                <p className="md:text-[18px] text-[16px] leading-relaxed mt-4">
                                სხვა ადმინისტრაციული ან სამართლებრივი საშუალებების შეუზღუდავად, მომხმარებელს აქვს უფლება შეიტანოს საჩივარი მონაცემთა დაცვის ოფიცერთან, თუ Cookie გამოყენებისას პერსონალური მონაცემების დამუშავება არღვევს საქართველოს პერსონალურ მონაცემთა დაცვის კანონის მოთხოვნებს.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">Cookie პოლიტიკის ცვლილებები</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                ჩვენ პერიოდულად შეიძლება განვაახლოთ Cookie პოლიტიკა (განახლებული და იურიდიულად დახვეწილი ვერსია). ნებისმიერი ცვლილება გამოქვეყნდება ამ გვერდზე და განახლების თარიღი აისახება პოლიტიკის ზედა ნაწილში. გირჩევთ რეგულარულად გადაამოწმოთ ეს პოლიტიკა, რათა იყოთ ინფორმირებული იმის შესახებ, თუ როგორ ვიყენებთ Cookie.
                                </p>
                                
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold">უფლებების განხორციელება და საკონტაქტო ინფორმაცია</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                იმისათვის, რომ მარტივად გამოიყენოთ ზემოთ ჩამოთვლილი უფლებები და გამოგვიგზავნოთ შესაბამისი მოთხოვნები, შეგიძლიათ დაგვიკავშირდეთ ქვემოთ მითითებული საკონტაქტო ინფორმაციის მეშვეობით. ჩვენ გიპასუხებთ უმოკლეს ვადაში თქვენი მოთხოვნის ბუნებიდან გამომდინარე და არაუგვიანეს 30 დღის განმავლობაში. როგორც ზოგადი წესი, მონაცემთა სუბიექტის მოთხოვნებზე პასუხი გაიცემა უფასოდ; თუმცა, ჩვენ ვიტოვებთ უფლებას დავაწესოთ გადასახადი პერსონალურ მონაცემთა დაცვის საბჭოს მიერ განსაზღვრული ტარიფის შესაბამისად იმ შემთხვევაში, თუ მოთხოვნა მოითხოვს დამატებით ხარჯებს.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h3 className="text-xl font-semibold"> საკონტაქტო ინფორმაცია</h3>
                                <p className="md:text-[18px] text-[16px] leading-relaxed">
                                    <span className="font-semibold">ელ.ფოსტა:</span> <a href="mailto:dressla.online@gmail.com" className="text-[#1B3729] underline">dressla.online@gmail.com</a>
                                    <br />
                                    <span className="font-semibold">ტელეფონი:</span> +995 599 55 63 95
                                    <br />
                                    <span className="font-semibold">მისამართი:</span> საქართველო, თბილისი, აეროპორტის დასახლება, კორპუსი 120, ბინა 13
                                </p>
                            </section>

                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default RulesPage