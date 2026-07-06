import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import withBundleAnalyzer from '@next/bundle-analyzer';

const pwaConfig = withPWA({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    disable: process.env.NODE_ENV === "development",
    workboxOptions: {
        disableDevLogs: true,
        runtimeCaching: [
            {
                // تخزين صفحات التطبيق مؤقتاً (HTML) للتصفح بدون نت
                urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "next-static-cache",
                    expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                    },
                },
            },
            {
                // تخزين الخطوط والصور المؤقتة
                urlPattern: /\.(?:woff2?|ttf|otf|eot|ico|svg|png|jpg|jpeg|gif|webp)$/i,
                handler: "CacheFirst",
                options: {
                    cacheName: "static-assets-cache",
                    expiration: {
                        maxEntries: 60,
                        maxAgeSeconds: 60 * 60 * 24 * 30,
                    },
                },
            },
            {
                // استعلامات Supabase - مخزنة للاستخدام فوراً حتى مع بطء النت
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "supabase-api-cache",
                    expiration: {
                        maxEntries: 300,
                        maxAgeSeconds: 60 * 60 * 24 * 7,
                    },
                    networkTimeoutSeconds: 5,
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
            {
                // صفحات التنقل - تظهر المحفوظة فوراً ثم تُحدّث
                urlPattern: /\/[a-z0-9\-_\/]*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "navigation-cache",
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 60 * 60 * 24,
                    },
                    networkTimeoutSeconds: 4,
                },
            },
        ],
    },
});

const withBundleAnalyzerConfig = withBundleAnalyzer({
    enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
    turbopack: {},
};

export default withBundleAnalyzerConfig(pwaConfig(nextConfig));
