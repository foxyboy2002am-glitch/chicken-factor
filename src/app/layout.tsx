import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chicken Factor",
  description: "Chicken Factor online ordering and restaurant management",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
