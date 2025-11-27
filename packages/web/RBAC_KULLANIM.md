# RBAC Sistemi - Hızlı Referans

## 🎯 Ne Eklendi?

### 1. Middleware Koruması (`middleware.ts`)
Tüm rotaları korur, rol kontrolü yapar.

**Rota Kuralları:**
- 📖 **Public** (`/login`, `/register`) → Herkese açık
- 🔒 **Protected** (`/dashboard/**`) → Giriş yapmış herkes
- 👑 **Admin** (`/admin/**`) → Sadece Admin rolü

### 2. Protect Bileşeni (`components/auth/Protect.tsx`)
Sayfa içinde buton/içerik gizleme için kullanılır.

---

## 💻 Kullanım Örnekleri

### Tek Rol - Sadece Admin Görsün
```tsx
import { Protect } from '@/components/auth';

<Protect role="Admin">
  <button>Kullanıcı Sil</button>
</Protect>
```

### Birden Fazla Rol - Admin VEYA Pharmacy
```tsx
<Protect role={["Admin", "Pharmacy"]}>
  <button>Envanter Yönet</button>
</Protect>
```

### Ters Mod - Sadece Admin/Pharmacy'den GİZLE
```tsx
<Protect role="User" not>
  <div>Bu içerik sadece Admin ve Pharmacy görür</div>
</Protect>
```

### Hook Kullanımı
```tsx
import { useIsAdmin, useHasRole } from '@/components/auth';

function MyComponent() {
  const isAdmin = useIsAdmin();
  const canManage = useHasRole(['Admin', 'Pharmacy']);
  
  return (
    <button disabled={!canManage}>
      {isAdmin ? 'Admin İşlemi' : 'Normal İşlem'}
    </button>
  );
}
```

---

## 🧪 Test İçin Demo Sayfası

```
http://localhost:3000/rbac-demo
```

Bu sayfada tüm özellikleri test edebilirsiniz:
- ✅ Kullanıcı bilgisi gösterimi
- ✅ Her rol için ayrı bölümler
- ✅ Hook'ların çalışması
- ✅ Kod örnekleri

---

## 🔧 Yeni Rota Korumak

### Middleware'de Admin Rotası Eklemek
```typescript
// middleware.ts içinde
const adminRoutes = ['/admin', '/admin/users', '/admin/settings'];
```

### Protected Rota Eklemek
```typescript
// middleware.ts içinde
const protectedRoutes = ['/dashboard', '/profil', '/ayarlar', '/yeni-sayfa'];
```

---

## 📋 Roller

Sistemde 3 rol var (JWT token içinde):

| Rol | Açıklama |
|-----|----------|
| `Admin` | Sistem yöneticisi - Her şeye erişebilir |
| `Pharmacy` | Eczane kullanıcısı - Envanter, sipariş vs. |
| `User` | Normal kullanıcı - Sınırlı erişim |

---

## ⚡ Hızlı Başlangıç

### 1. Bir butonu sadece Admin'e göster:
```tsx
<Protect role="Admin">
  <button onClick={deleteUser}>🗑️ Sil</button>
</Protect>
```

### 2. Bir bölümü Pharmacy ve Admin'e göster:
```tsx
<Protect role={["Admin", "Pharmacy"]}>
  <InventorySection />
</Protect>
```

### 3. Hook ile kontrol:
```tsx
const isAdmin = useIsAdmin();

if (isAdmin) {
  // Admin işlemleri
}
```

---

## 🛠️ Dosya Yapısı

```
src/
├── middleware.ts              ← Route koruması (Edge Runtime)
├── lib/
│   └── jwt.ts                ← JWT parsing utilities
├── components/
│   └── auth/
│       ├── Protect.tsx       ← <Protect> bileşeni
│       └── index.ts          ← Export dosyası
├── types/
│   └── index.ts              ← UserRole type tanımı
└── app/
    └── (dashboard)/
        └── rbac-demo/
            └── page.tsx      ← Demo sayfası
```

---

## ✅ Test Edildi

- ✅ Middleware koruması çalışıyor
- ✅ Public rotalar erişilebilir
- ✅ Protected rotalar giriş gerektiriyor
- ✅ Admin rotaları sadece Admin'e açık
- ✅ Edge Runtime uyumlu (build hatası yok)
- ✅ Token expiration kontrolü çalışıyor

---

## 🎓 Önemli Notlar

1. **Middleware** = Server-side koruma (rota erişimi)
2. **Protect Component** = Client-side koruma (UI elemanları)
3. **İkisini birlikte kullan** = En güvenli yöntem
4. **Edge Compatible** = jose/jwt-decode kütüphanesi gerekmez

---

## 🚀 Sonraki Adımlar (Opsiyonel)

- [ ] `/admin/**` sayfaları oluştur
- [ ] Permission sistemi ekle (rol + permission)
- [ ] Audit log (admin erişim kayıtları)
- [ ] Rate limiting (admin endpoint'leri için)

---

**Sorular?** Walkthrough dosyasına bakın: [walkthrough.md](file:///home/melik/.gemini/antigravity/brain/dfb314be-ba71-4e37-8842-785900d9b878/walkthrough.md)
