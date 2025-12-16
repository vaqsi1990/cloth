import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "შესვლა - Dressla.ge",
  description: "შედით თქვენს ანგარიშში Dressla.ge-ზე. მიიღეთ წვდომა თქვენს შეკვეთებს, პროდუქტებს და პროფილის მართვას.",
  openGraph: {
    title: "შესვლა - Dressla.ge",
    description: "შედით თქვენს ანგარიშში და განაგრძეთ შოპინგი",
    images: ["/logo.jpg"],
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

