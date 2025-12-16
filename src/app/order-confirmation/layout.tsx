import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "შეკვეთის დადასტურება - Dressla.ge",
  description: "თქვენი შეკვეთა წარმატებით გაფორმდა Dressla.ge-ზე. გადახედეთ შეკვეთის დეტალებს, მიწოდების ინფორმაციას და შეკვეთილი ნივთებს.",
  openGraph: {
    title: "შეკვეთის დადასტურება - Dressla.ge",
    description: "თქვენი შეკვეთა წარმატებით გაფორმდა",
    images: ["/logo.jpg"],
  },
};

export default function OrderConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

