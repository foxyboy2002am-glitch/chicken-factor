import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./storefront-polish.css";
import "./storefront-final.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: { default: "Chicken Factor | تشيكن فاكتور", template: "%s | Chicken Factor" },
  description: "منيو وعروض تشيكن فاكتور - فراخنا من إنتاج مزارعنا. اطلب وجبتك المفضلة أونلاين أو اتصل 15407.",
  applicationName: "Chicken Factor",
  openGraph: {
    type: "website",
    siteName: "Chicken Factor",
    title: "Chicken Factor | تشيكن فاكتور",
    description: "منيو وعروض تشيكن فاكتور - فراخنا من إنتاج مزارعنا.",
    locale: "ar_EG",
    images: [{ url: "/offers/mix-6-525.webp", alt: "عرض ميكس 6 من تشيكن فاكتور" }],
  },
  twitter: { card: "summary_large_image", title: "Chicken Factor | تشيكن فاكتور", images: ["/offers/mix-6-525.webp"] },
  icons: {
    icon: "/profile_chicken_factor.webp",
    shortcut: "/profile_chicken_factor.webp",
    apple: "/profile_chicken_factor.webp",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#b71922",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
