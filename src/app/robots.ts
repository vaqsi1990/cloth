import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.dressla.ge';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/account/',
          '/auth/',
          '/checkout/',
          '/cart/',
          '/order-confirmation/',
          '/payment-fail/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/account/',
          '/auth/',
          '/checkout/',
          '/cart/',
          '/order-confirmation/',
          '/payment-fail/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

