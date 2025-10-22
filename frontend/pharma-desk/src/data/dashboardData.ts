// data/dashboardData.ts

export interface MedicationItem {
  id: number;
  productName: string;
  stock: string;
  price: number;
  expirationDate: string;
}

export interface PharmacyProfileData {
  pharmacyName: string;
  pharmacistInCharge: string; // Sorumlu Eczacı
  balance: number;
  logoUrl: string | null; // Kişisel avatar yerine logo
  coverImageUrl: string | null;
  about: string; // 'bio' yerine 'about'
  location: string;
  registrationDate: string;
  licenseNumber: string; // Ruhsat Numarası
  phone: string; // Telefon
  username: string; // URL için benzersiz eczane kimliği
}
export interface Offer {
  id: number;
  productName: string;
  stock: string;
  price: number;
}
export interface BalanceItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'positive' | 'negative';
}
export interface TransferItem {
  id: number;
  orderNumber: string;
  productName: string;
  amount: number;
}
export interface ShipmentItem {
  id: number;
  orderNumber: string;
  productName: string;
  trackingNumber: string;
}
export interface Notification {
  id: number;
  read: boolean;
  type: string;
  title: string;
  message: string;
}
export interface Message {
  id: number;
  sender: string;
  lastMessage: string;
  avatar: string | null;
  read: boolean;
}


export const pharmacyData: PharmacyProfileData = {
    pharmacyName: "Yıldız Eczanesi",
    pharmacistInCharge: "Zeynep Yılmaz",
    balance: 15000.00,
    logoUrl: null, // Logo yoksa baş harf gösterilecek
    coverImageUrl: '/cover-photo.jpg',
    about: "Ankara'nın merkezinde 20 yıldır kesintisiz hizmet veren, hasta odaklı ve yenilikçi bir eczaneyiz. İlaç takas sistemi ile meslektaşlarımızla dayanışma içinde olmaktan mutluluk duyuyoruz.",
    location: "Örnek Mah. Atatürk Cad. No: 123/A, Çankaya, Ankara",
    registrationDate: "Ekim 2025",
    licenseNumber: "12345/06",
    phone: "0312 123 45 67",
    username: "yildiz-eczanesi" // URL için
};

export const offersData: Offer[] = [
    { id: 1, productName: 'Apranax', stock: '50 + 5', price: 52.50 },
    { id: 2, productName: 'Parol', stock: '200 + 20', price: 25.00 },
    { id: 3, productName: 'Majezik', stock: '75 + 8', price: 48.75 },
    { id: 4, productName: 'Dolorex', stock: '100 + 12', price: 45.00 },
];

export const balanceHistoryData: BalanceItem[] = [
    { id: 1, date: '20/10/2025', description: 'İlaç Satış', amount: 150.75, type: 'positive' },
    { id: 2, date: '19/10/2025', description: 'Kargo Ücreti', amount: -22.50, type: 'negative' },
    { id: 3, date: '19/10/2025', description: 'İlaç Sipariş', amount: -450.00, type: 'negative' },
    { id: 4, date: '18/10/2025', description: 'İlaç Satış', amount: 88.40, type: 'positive' },
    { id: 5, date: '17/10/2025', description: 'Para Transferi', amount: 5000.00, type: 'positive' },
];

export const transfersData: TransferItem[] = [
    { id: 1, orderNumber: '202-58963214', productName: 'Apranax', amount: 525.00 },
    { id: 2, orderNumber: '202-14785236', productName: 'Parol', amount: 250.00 },
    { id: 3, orderNumber: '201-98765432', productName: 'Majezik', amount: 487.50 },
    { id: 4, orderNumber: '201-12345678', productName: 'Dolorex', amount: 450.00 },
];

export const shipmentsData: ShipmentItem[] = [
    { id: 1, orderNumber: '202-58963214', productName: 'Apranax', trackingNumber: '8521479632' },
    { id: 2, orderNumber: '202-14785236', productName: 'Parol', trackingNumber: '7412589632' },
    { id: 3, orderNumber: '201-98765432', productName: 'Majezik', trackingNumber: '9632587412' },
    { id: 4, orderNumber: '201-12345678', productName: 'Dolorex', trackingNumber: '5862734531' },
];

export const initialNotifications: Notification[] = [
    { id: 1, read: false, type: 'offer', title: 'Yeni Teklif', message: 'Dolorex için yeni bir teklif aldınız.' },
    { id: 2, read: true, type: 'shipment', title: 'Sipariş Kargolandı', message: '123-12312321 numaralı siparişiniz kargoya verildi.' },
    { id: 3, read: false, type: 'balance', title: 'Bakiye Yüklendi', message: 'Hesabınıza 500.00 TL yüklendi.' }
];

export const initialMessages: Message[] = [
    { id: 1, sender: 'Ahmet Kaya', lastMessage: 'Merhaba, siparişim hakkında bilgi alabilir miyim?', avatar: null, read: false },
    { id: 2, sender: 'Ayşe Demir', lastMessage: 'Teşekkürler, iyi çalışmalar.', avatar: null, read: true },
    { id: 3, sender: 'Destek Ekibi', lastMessage: 'Yeni kampanya detayları için tıklayın.', avatar: null, read: false }
];

export const userMedicationsData: MedicationItem[] = [
    { id: 1, productName: 'Apranax Forte', stock: '50 + 5', price: 52.50, expirationDate: '12/2026' },
    { id: 2, productName: 'Parol 500mg', stock: '200 + 20', price: 25.00, expirationDate: '08/2027' },
    { id: 3, productName: 'Majezik 100mg', stock: '75 + 8', price: 48.75, expirationDate: '11/2025' },
    { id: 4, productName: 'Dolorex', stock: '100 + 12', price: 45.00, expirationDate: '01/2028' },
    { id: 5, productName: 'Benical Cold', stock: '40 + 0', price: 65.20, expirationDate: '05/2026' },
    { id: 6, productName: 'Aspirin 100mg', stock: '300 + 50', price: 15.00, expirationDate: '09/2027' },
];