// Docker'da çalışırken bu değişken 'http://backend:8081' olarak set edilecek.
// Lokal'de (npm run dev) çalışırken tanımsız olacağı için 'http://localhost:8081' kullanılacak.
const API_URL = process.env.API_BASE_URL || 'http://localhost:8081';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // API yönlendirmeleri için rewrites
  async rewrites() {
    return [
      // API isteklerini dinamik URL'e yönlendir
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      // Health check isteğini dinamik URL'e yönlendir
      { source: "/health", destination: `${API_URL}/health` }
    ];
  },
  
  // Ana sayfayı /anasayfa'ya yönlendirmek için redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/anasayfa',
        permanent: true, // Kalıcı yönlendirme (SEO için önerilir)
      },
    ]
  },
};

export default nextConfig;