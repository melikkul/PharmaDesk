# Dosya: frontend/admin-panel/Dockerfile

# --- Stage 1: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# .dockerignore dosyasının node_modules ve .next klasörlerini içerdiğinden emin olun
RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-alpine
WORKDIR /app

# Sadece üretim bağımlılıklarını kur
COPY package*.json ./
RUN npm ci --omit=dev

# Builder aşamasından build edilmiş dosyaları kopyala
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/package.json ./

EXPOSE 3000

# Next.js için doğru üretim başlatma komutu
CMD ["npm", "start"]