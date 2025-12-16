import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "პაროლის აღდგენა - Dressla.ge",
  description: "აღადგინეთ თქვენი პაროლი Dressla.ge-ზე. შეიყვანეთ თქვენი ელ. ფოსტა და მიიღეთ პაროლის აღდგენის ლინკი.",
  openGraph: {
    title: "პაროლის აღდგენა - Dressla.ge",
    description: "აღადგინეთ თქვენი პაროლი და დაბრუნდით თქვენს ანგარიშში",
    images: ["/logo.jpg"],
  },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

