import type { NextConfig } from "next";

// API URL for proxy - Docker uses 'backend', local uses 'localhost'
const API_URL = process.env.API_BASE_URL || 'http://localhost:8081';

const nextConfig: NextConfig = {
    // Allow mobile devices on local network to access dev server
    allowedDevOrigins: [
        'http://192.168.1.3:3002',
        'http://192.168.1.*:3002',
        'http://localhost:3002',
    ],
    async rewrites() {
        return [
            { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
            { source: "/hubs/:path*", destination: `${API_URL}/hubs/:path*` },
        ];
    },
};

export default nextConfig;
