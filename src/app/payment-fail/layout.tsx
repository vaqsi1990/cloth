import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "გადახდა წარუმატებლად - Dressla.ge",
  description: "თქვენი გადახდა ვერ განხორციელდა. შეამოწმეთ ბარათის ინფორმაცია და სცადეთ კვლავ, ან დაგვიკავშირდით დახმარებისთვის.",
  openGraph: {
    title: "გადახდა წარუმატებლად - Dressla.ge",
    description: "თქვენი გადახდა ვერ განხორციელდა. სცადეთ კვლავ",
    images: ["/logo.jpg"],
  },
};

export default function PaymentFailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

