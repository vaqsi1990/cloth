import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "რეგისტრაცია - Dressla.ge",
  description: "შექმენით ახალი ანგარიში Dressla.ge-ზე. დაიწყეთ მოდის ქირაობა და შეძენა, გააქირაოთ თქვენი ნივთები და მიიღეთ ექსკლუზიური შეთავაზებები.",
  openGraph: {
    title: "რეგისტრაცია - Dressla.ge",
    description: "შექმენით ახალი ანგარიში და დაიწყეთ მოდის ქირაობა",
    images: ["/logo.jpg"],
  },
};

export default function SignUpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

