import type { Metadata } from "next";
import "./globals.css";
import "./storefront-polish.css";

export const metadata: Metadata = {
  title: "Chicken Factor | تشيكن فاكتور",
  description: "منيو وعروض تشيكن فاكتور - اطلب وجبتك المفضلة.",
  icons: {
    icon: "/profile_chicken_factor.webp",
    shortcut: "/profile_chicken_factor.webp",
    apple: "/profile_chicken_factor.webp",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
