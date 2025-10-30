FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8081
# Optimizasyon: npm script yerine doğrudan node'u çalıştır
CMD ["node", "index.js"]