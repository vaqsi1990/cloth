import type { Metadata } from "next";
// import Hero from "@/component/Hero";
// import HowItWorks from "@/component/HowItWorks";
import PopularProducts from "@/component/PopularProducts";
import About from "@/component/About";
import ContactForm from "@/component/ContactForm";
import { Suspense } from "react";
import ShopPageClient from "../component/ShopPageClient";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Dressla.ge • ტანსაცმლის ქირაობა",
  description:
    "Dressla.ge - ტანსაცმლის ქირაობა და შეძენა საქართველოში",
  openGraph: {
    title: "Dressla.ge - ტანსაცმლის ქირაობა და შეძენა საქართველოში",
    description:
      "Dressla.ge — ტანსაცმლის ქირაობა, კოლექცია და პროდუქტები საქართველოში",
    images: ["/logo.jpg"],
  },
};

export default function Home() {
  return (
    <>
      <StructuredData type="Organization" />
      <StructuredData type="WebSite" />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <header className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-black">
            Dressla.ge — ტანსაცმლის ქირაობა, კოლექციები და პროდუქტები საქართველოში
          </h1>
          <p className="text-lg md:text-xl text-black">
            ქალი, კაცი და ბავშვების კოლექცია
          </p>
        </header>
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-black">იტვირთება...</p>
              </div>
            </div>
          }
        >
          <ShopPageClient />
        </Suspense>
      </main>
    </>
  );
}
