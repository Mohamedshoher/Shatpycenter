import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
    dest: "public",
    cacheOnFrontEndNav: true,   // يخزن الصفحات عند التنقل
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,       // يُحدِّث تلقائياً عند عودة النت
    disable: process.env.NODE_ENV === "development", // لا PWA في وضع التطوير
    workboxOptions: {
        disableDevLogs: true,
        // خزّن ملفات JS/CSS/الصور لمدة شهر
        runtimeCaching: [
            {
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                handler: "NetworkFirst",      // الشبكة أولاً، الكاش عند فشل النت
                options: {
                    cacheName: "supabase-api-cache",
                    expiration: {
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24, // 24 ساعة
                    },
                    networkTimeoutSeconds: 8,  // بعد 8 ثواني يرجع من الكاش
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
        ],
    },
});

const nextConfig: NextConfig = {
    /* config options here */
};

export default pwaConfig(nextConfig);
