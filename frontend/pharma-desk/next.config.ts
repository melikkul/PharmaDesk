const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://backend:8081/api/:path*" },
      { source: "/health", destination: "http://backend:8081/health" }
    ];
  },
};
export default nextConfig;