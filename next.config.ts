import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

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
                urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                handler: "NetworkFirst",
                options: {
                    cacheName: "supabase-api-cache",
                    expiration: {
                        maxEntries: 200,
                        maxAgeSeconds: 60 * 60 * 24,
                    },
                    networkTimeoutSeconds: 8,
                    cacheableResponse: {
                        statuses: [0, 200],
                    },
                },
            },
        ],
    },
});

const nextConfig: NextConfig = {
    // يوقف خطأ Turbopack/Webpack عند البناء
    turbopack: {},
};

export default pwaConfig(nextConfig);
