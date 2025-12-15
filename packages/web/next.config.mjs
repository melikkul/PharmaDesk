/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DEĞİŞİKLİK BURADA:
// Eğer ortam değişkeni gelmezse, varsayılan olarak 'http://backend:8081' (Docker adresi) kullanılsın.
// Lokal geliştirme (npm run dev) yaparken bu değişkeni .env.local dosyasında 'http://localhost:8081' olarak ezebilirsiniz.
const API_URL = process.env.API_BASE_URL || 'http://backend:8081';

const nextConfig = {
  // Monorepo workspace root - fixes lightningcss module resolution
  outputFileTracingRoot: path.join(__dirname, '../../'),
  
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/hubs/:path*", destination: `${API_URL}/hubs/:path*` },
      { source: "/images/:path*", destination: `${API_URL}/images/:path*` },
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