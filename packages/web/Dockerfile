# --- Stage 1: Builder ---
# Projeyi build etmek (derlemek) için gerekli tüm bağımlılıkları kurar
FROM node:20-alpine AS builder
WORKDIR /app

# Önce bağımlılıkları kopyala ve kur (Docker katman önbelleklemesi için)
COPY package*.json ./
RUN npm ci

# Tüm kaynak kodunu kopyala
# DİKKAT: Orijinal dosyanızda burada "COPY ." ve altında tek başına "." vardı.
# Bu satır "COPY . ." olarak birleştirildi ve düzeltildi.
COPY . .

# .dockerignore dosyasının node_modules ve .next klasörlerini içerdiğinden emin olun
RUN npm run build

# --- Stage 2: Production Runner ---
# Sadece uygulamayı çalıştırmak için gerekli olanları içeren küçük bir imaj
# DİKKAT: Burada 'AS builder' GİBİ BİR TANIMLAMA OLMAMALI.
FROM node:20-alpine
WORKDIR /app

# Sadece üretim bağımlılıklarını kur
COPY package*.json ./

# ÖNCEKİ AĞ HATASINI ÇÖZMEK İÇİN OPTİMİZASYON:
# 'npm ci --omit=dev' komutu yerine, 'builder' aşamasından
# node_modules'ü kopyalayıp sadece üretim paketlerini bırakıyoruz.
COPY --from=builder /app/node_modules ./node_modules
RUN npm prune --production

# Builder aşamasından build edilmiş dosyaları kopyala
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# next.config.ts (veya .js) dosyasını kopyala
# DİKKAT: Dosya adınız .ts ise böyle bırakın, .mjs ise 'next.config.mjs' yapın.
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

# Next.js için doğru üretim başlatma komutu
CMD ["npm", "start"]