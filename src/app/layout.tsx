import type { Metadata } from "next";
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
  description: "نظام إدارة الحلقات القرآنية",
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
