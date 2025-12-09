import { Product } from "@/types/product";

interface StructuredDataProps {
  type: "Organization" | "Product" | "WebSite";
  data?: Product | any;
}

export default function StructuredData({ type, data }: StructuredDataProps) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.dressla.ge";

  const getStructuredData = () => {
    switch (type) {
      case "Organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Dressla.ge",
          url: baseUrl,
          logo: `${baseUrl}/logo.jpg`,
          description:
            "ინოვაციური ონლაინ პლატფორმა მოდის ქირაობისა და შეძენისთვის საქართველოში",
          address: {
            "@type": "PostalAddress",
            streetAddress: "ლეო დავითაშვილის ქუჩა 120",
            addressLocality: "თბილისი",
            addressCountry: "GE",
            postalCode: "0190",
          },
          contactPoint: {
            "@type": "ContactPoint",
            telephone: "+995-599-55-53-95",
            contactType: "customer service",
            email: "dressla.online@gmail.com",
          },
          sameAs: [],
        };

      case "WebSite":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Dressla.ge",
          url: baseUrl,
          description:
            "ინოვაციური ონლაინ პლატფორმა მოდის ქირაობისა და შეძენისთვის საქართველოში",
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${baseUrl}/shop?search={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        };

      case "Product":
        if (!data) return null;

        const product = data as Product;
        const imageUrl = product.images?.[0]?.url || `${baseUrl}/logo.jpg`;
        const minPrice = product.variants?.length
          ? Math.min(
              ...product.variants
                .map((v) => v.price || 0)
                .filter((p) => p > 0)
            )
          : null;
        const offers = [];

        if (minPrice && minPrice > 0) {
          offers.push({
            "@type": "Offer",
            price: minPrice,
            priceCurrency: "GEL",
            availability: "https://schema.org/InStock",
            url: `${baseUrl}/product/${product.id}`,
            priceValidUntil: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
          });
        }

        if (product.isRentable && product.pricePerDay) {
          offers.push({
            "@type": "Offer",
            price: product.pricePerDay,
            priceCurrency: "GEL",
            availability: "https://schema.org/InStock",
            url: `${baseUrl}/product/${product.id}`,
            priceValidUntil: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000
            ).toISOString(),
            additionalProperty: {
              "@type": "PropertyValue",
              name: "Rental",
              value: "true",
            },
          });
        }

        return {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || product.name,
          image: product.images?.map((img) => img.url) || [imageUrl],
          brand: product.brand
            ? {
                "@type": "Brand",
                name: product.brand,
              }
            : undefined,
          category: product.category?.name,
          color: product.color,
          offers: offers.length > 0 ? offers : undefined,
          aggregateRating: product.rating
            ? {
                "@type": "AggregateRating",
                ratingValue: product.rating,
                reviewCount: 0,
              }
            : undefined,
          sku: product.sku || product.id.toString(),
        };

      default:
        return null;
    }
  };

  const structuredData = getStructuredData();

  if (!structuredData) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

