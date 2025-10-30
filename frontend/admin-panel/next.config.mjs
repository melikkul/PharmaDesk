/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend API'ye proxy yap
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // "localhost:8081" yerine Docker servis adını kullan: "backend:8081"
        destination: "http://backend:8081/api/:path*", 
      },
    ];
  },
};

export default nextConfig;