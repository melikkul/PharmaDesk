/** @type {import('next').NextConfig} */
const nextConfig = {
  // Backend API'ye proxy yap
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8081/api/:path*", // Backend'inizin çalıştığı yer
      },
    ];
  },
};

export default nextConfig;