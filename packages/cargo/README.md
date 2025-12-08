# PharmaDesk Cargo

Taşıyıcılar için QR kod okuma ve ilaç teslimat takip sistemi.

## Özellikler

- 🔐 Token tabanlı güvenli kayıt sistemi
- 📱 Mobile-responsive tasarım
- 📷 QR kod okuma arayüzü (backend entegrasyonu bekleniyor)
- 🎨 Modern glass morphism tasarım
- ⚡ Next.js 15 ve React 19

## Kurulum

```bash
cd packages/cargo
npm install
```

## Ortam Değişkenleri

`.env.local` dosyası oluşturun:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8081
```

## Geliştirme

```bash
npm run dev
```

Uygulama http://localhost:3002 adresinde çalışacaktır.

## Kullanım

1. **Kayıt**: Admin panelden alınan token linki ile kayıt olun
2. **Giriş**: Email ve şifre ile giriş yapın
3. **QR Okuma**: Dashboard'dan QR okuyucuya erişin (UI placeholder)

## Not

QR kod decode ve doğrulama mantığı, backend sipariş sistemi tamamlandığında eklenecektir.
