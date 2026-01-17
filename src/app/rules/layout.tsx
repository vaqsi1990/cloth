import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "წესები და პოლიტიკა - Dressla.ge",
  description: "გაეცანით Dressla.ge-ის წესებს: პერსონალურ მონაცემთა დაცვის პოლიტიკა, ვადები და პირობები, დაბრუნების პოლიტიკა. ჩვენი პასუხისმგებლობა და თქვენი უფლებები.",
  openGraph: {
    title: "წესები და პოლიტიკა - Dressla.ge",
    description: "გაეცანით Dressla.ge-ის წესებს: პერსონალურ მონაცემთა დაცვის პოლიტიკა, ვადები და პირობები, დაბრუნების პოლიტიკა",
    images: ["/logo.jpg"],
  },
};

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
