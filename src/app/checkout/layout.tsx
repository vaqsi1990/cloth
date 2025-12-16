import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "შეკვეთის გაფორმება - Dressla.ge",
  description: "შეავსეთ მიწოდების ინფორმაცია და გააფორმეთ შეკვეთა Dressla.ge-ზე. უსაფრთხო გადახდა ბანკის ბარათით ან Google Pay-ით.",
  openGraph: {
    title: "შეკვეთის გაფორმება - Dressla.ge",
    description: "შეავსეთ მიწოდების ინფორმაცია და გააფორმეთ შეკვეთა",
    images: ["/logo.jpg"],
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

