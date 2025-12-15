import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const productId = parseInt(resolvedParams.id);

    if (isNaN(productId)) {
      return {
        title: "პროდუქტი",
        description: "პროდუქტის დეტალები Dressla.ge-ზე",
      };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        purpose: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
        },
        variants: {
          select: {
            price: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!product) {
      return {
        title: "პროდუქტი",
        description: "პროდუქტის დეტალები Dressla.ge-ზე",
      };
    }

    const imageUrl = product.images?.[0]?.url || "/logo.jpg";
    const description = product.description
      ? `${product.description.substring(0, 160)}...`
      : `${product.name} - ${product.category?.name || "მოდური ნივთი"} Dressla.ge-ზე. ${product.isRentable ? "ქირაობა და შეძენა." : "შეძენა."}`;

    return {
      title: product.name,
      description: description,
      keywords: [
        product.name,
        product.category?.name || "",
        product.purpose?.name || "",
        product.brand || "",
        product.color || "",
        "მოდის ქირაობა",
        "Dressla.ge",
      ].filter(Boolean),
      openGraph: {
        title: product.name,
        description: description,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: product.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: product.name,
        description: description,
        images: [imageUrl],
      },
      alternates: {
        canonical: `https://dressla.ge/product/${productId}`,
      },
    };
  } catch (error) {
    console.error("Error generating product metadata:", error);
    // Return default metadata so page can still load
    return {
      title: "პროდუქტი",
      description: "პროდუქტის დეტალები Dressla.ge-ზე",
    };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

