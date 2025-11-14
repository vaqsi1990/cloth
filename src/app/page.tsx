

// import Hero from "@/component/Hero";
// import HowItWorks from "@/component/HowItWorks";
import PopularProducts from "@/component/PopularProducts";
import About from "@/component/About";
import ContactForm from "@/component/ContactForm";
import { Suspense } from "react";
import ShopPageClient from "../component/ShopPageClient";

export default function Home() {
  return (
    <>
    <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-black">იტვირთება...</p>
                </div>
            </div>
        }>
            <ShopPageClient />
        </Suspense>
    </>
  );
}
