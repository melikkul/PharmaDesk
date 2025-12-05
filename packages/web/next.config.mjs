/** @type {import('next').NextConfig} */

// DEĞİŞİKLİK BURADA:
// Eğer ortam değişkeni gelmezse, varsayılan olarak 'http://backend:8081' (Docker adresi) kullanılsın.
// Lokal geliştirme (npm run dev) yaparken bu değişkeni .env.local dosyasında 'http://localhost:8081' olarak ezebilirsiniz.
const API_URL = process.env.API_BASE_URL || 'http://backend:8081';

console.log("API Hedef Adresi:", API_URL); // Loglarda hangi adrese gittiğini görmek için

const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/hubs/:path*", destination: `${API_URL}/hubs/:path*` },
      { source: "/health", destination: `${API_URL}/health` }
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/anasayfa',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;