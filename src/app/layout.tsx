import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/providers/AuthProvider";
import QueryProvider from "@/components/providers/QueryProvider";

const cairo = Cairo({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: "مركز الشاطبي",
  description: "نظام إدارة متكامل لمراكز تحفيظ القرآن والمؤسسات التعليمية",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "مركز الشاطبي",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "مركز الشاطبي التعليمي",
    title: "مركز الشاطبي - نظام إدارة تعليمي",
    description: "نظام إدارة متكامل لمراكز تحفيظ القرآن",
  },
  twitter: {
    card: "summary",
    title: "مركز الشاطبي",
    description: "نظام إدارة الحلقات القرآنية",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

import BottomNavigation from "@/components/layout/BottomNavigation";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} ${cairo.className} antialiased bg-gray-50`}>
        <QueryProvider>
          <AuthProvider>
            <main className="min-h-screen pb-20 md:pb-0">
              {children}
            </main>
            <BottomNavigation />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
