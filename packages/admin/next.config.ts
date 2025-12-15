import type { NextConfig } from "next";

const API_URL = process.env.API_URL || 'http://pharma_desk_backend:8081';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy all API calls to the backend
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
      // Proxy SignalR hub connections
      {
        source: '/hubs/:path*',
        destination: `${API_URL}/hubs/:path*`,
      },
    ];
  },
  // Allow dev origins for mobile access
  allowedDevOrigins: [
    'http://localhost:3001',
    'http://192.168.1.3:3001',
  ],
};

export default nextConfig;
