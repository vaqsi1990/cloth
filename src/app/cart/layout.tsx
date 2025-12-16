import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "კალათა - Dressla.ge",
  description: "გადახედეთ თქვენი კალათა Dressla.ge-ზე. დაამატეთ, წაშალეთ ან შეცვალეთ ნივთების რაოდენობა. სწრაფი და მოსახერხებელი შოპინგი.",
  openGraph: {
    title: "კალათა - Dressla.ge",
    description: "გადახედეთ თქვენი კალათა და განაგრძეთ შეძენა",
    images: ["/logo.jpg"],
  },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

