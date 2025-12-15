import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/component/Header";
import Footer from "@/component/Footer";
import AuthProvider from "@/components/AuthProvider";
import ChatProvider from "@/components/ChatProvider";
import ToastProvider from "@/components/ToastProvider";
import ScrollRestorer from "@/components/ScrollRestorer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dressla.ge'),
  title: {
    default: "Dressla.ge - მოდის ქირაობა და შეძენა საქართველოში",
    template: "%s | Dressla.ge"
  },
  description: "Dressla.ge - ინოვაციური ონლაინ პლატფორმა მოდის ქირაობისა და შეძენისთვის საქართველოში. იქირაოთ ან გააქირაოთ კაბები, ტანსაცმელი და სხვა მოდური ნივთები. მდგრადი მოდა, ხარისხი და ხელმისაწვდომობა.",
  keywords: [
    "მოდის ქირაობა",
    "კაბების ქირაობა",
    "ტანსაცმლის ქირაობა",
    "მოდა საქართველოში",
    "დრესლა",
    "dressla.ge",
    "fashion rental",
    "clothing rental",
    "მოდური ნივთები",
    "ქორწილის კაბები",
    "წვეულების კაბები"
  ],
  authors: [{ name: "Dressla.ge" }],
  creator: "Dressla.ge",
  publisher: "Dressla.ge",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ka_GE",
    url: "/",
    siteName: "Dressla.ge",
    title: "Dressla.ge - მოდის ქირაობა და შეძენა საქართველოში",
    description: "ინოვაციური ონლაინ პლატფორმა მოდის ქირაობისა და შეძენისთვის საქართველოში",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Dressla.ge - მოდის ქირაობა და შეძენა",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dressla.ge - მოდის ქირაობა და შეძენა საქართველოში",
    description: "ინოვაციური ონლაინ პლატფორმა მოდის ქირაობისა და შეძენისთვის საქართველოში",
    images: ["/logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: '/logo.jpg', type: 'image/jpeg' },
      { url: '/logo.jpg', sizes: '16x16', type: 'image/jpeg' },
      { url: '/logo.jpg', sizes: '32x32', type: 'image/jpeg' },
      { url: '/logo.jpg', sizes: '48x48', type: 'image/jpeg' },
    ],
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ChatProvider>
            <ToastProvider />
            <Suspense fallback={null}>
              <Header />
            </Suspense>
            <Suspense fallback={null}>
              <ScrollRestorer />
            </Suspense>
            {children}
            <Footer />
          </ChatProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
