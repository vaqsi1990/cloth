import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const authorId = resolvedParams.id;

  try {
    const author = await prisma.user.findUnique({
      where: { id: authorId },
      include: {
        products: {
          where: {
            approvalStatus: "APPROVED",
          },
          select: {
            id: true,
          },
        },
      },
    });

    if (!author || author.blocked) {
      return {
        title: "ავტორი ვერ მოიძებნა",
      };
    }

    const productCount = author.products.length;
    const authorName = author.name || "უცნობი ავტორი";
    const description = `${authorName} - ${productCount} პროდუქტი Dressla.ge-ზე. გაეცანით ${authorName}-ის მოდურ კოლექციას.`;

    return {
      title: authorName,
      description: description,
      openGraph: {
        title: `${authorName} - Dressla.ge`,
        description: description,
        type: "profile",
        images: author.image
          ? [
              {
                url: author.image,
                width: 1200,
                height: 630,
                alt: authorName,
              },
            ]
          : ["/logo.jpg"],
      },
      twitter: {
        card: "summary",
        title: `${authorName} - Dressla.ge`,
        description: description,
        images: author.image ? [author.image] : ["/logo.jpg"],
      },
      alternates: {
        canonical: `/author/${authorId}`,
      },
    };
  } catch (error) {
    console.error("Error generating author metadata:", error);
    return {
      title: "ავტორი",
    };
  }
}

export default function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

