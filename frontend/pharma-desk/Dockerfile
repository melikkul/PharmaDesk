# --- Stage 1: Builder ---
# Projeyi build etmek (derlemek) için gerekli tüm bağımlılıkları kurar
FROM node:20-alpine AS builder
WORKDIR /app

# Önce bağımlılıkları kopyala ve kur (Docker katman önbelleklemesi için)
COPY package*.json ./
RUN npm ci

# Tüm kaynak kodunu kopyala
COPY . .

# .dockerignore dosyasının node_modules ve .next klasörlerini içerdiğinden emin olun
RUN npm run build

# --- Stage 2: Production Runner ---
# Sadece uygulamayı çalıştırmak için gerekli olanları içeren küçük bir imaj
FROM node:20-alpine
WORKDIR /app

# Sadece üretim bağımlılıklarını kur
COPY package*.json ./
RUN npm ci --omit=dev

# Builder aşamasından build edilmiş dosyaları kopyala
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# next.config.ts (veya .js) dosyasını kopyala
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

# Next.js için doğru üretim başlatma komutu
CMD ["npm", "start"]