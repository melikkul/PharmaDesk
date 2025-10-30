// data/dashboardData.ts

export interface SellerInfo {
  pharmacyUsername: string;
  pharmacyName: string;
}
export interface ShowroomMedication {
  id: number;
  name: string;
  manufacturer: string;
  imageUrl: string;
  price: number;
  expirationDate: string;
  initialStock: number;
  currentStock: number;
  bonus: number;
  sellers: SellerInfo[]; // Her ilacı satan eczanelerin listesi
}


export interface PharmacyProfileData {
  pharmacyName: string;
  pharmacistInCharge: string;
  balance: number;
  logoUrl: string | null;
  coverImageUrl: string | null;
  about: string;
  location: string;
  registrationDate: string;
  licenseNumber: string;
  phone: string;
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
  type: NotificationType;
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

export interface PriceData {
  day: string;
  price: number;
}

// YENİ EKLENDİ
export interface WarehouseOffer {
  id: number;
  warehouseName: string;
  price: number;
  stockInfo: string;
}

export type OfferStatus = 'active' | 'paused' | 'expired' | 'out_of_stock';

export interface MedicationItem {
  id: number;
  productName: string;
  barcode?: string; // Barkod alanı eklendi (opsiyonel)
  stock: string; // "Stok + MF" formatı korunuyor
  costPrice?: number; // Maliyet fiyatı (opsiyonel)
  price: number;
  expirationDate: string; // MM/YYYY formatı korunuyor
  status: OfferStatus; // Durum alanı eklendi
  dateAdded: string; // Eklenme tarihi (YYYY-MM-DD)
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

export type NotificationType = 'offer' | 'shipment' | 'balance' | 'message';

export const initialNotifications: Notification[] = [
    { id: 1, read: false, type: 'offer', title: 'Yeni Teklif', message: 'Dolorex için yeni bir teklif aldınız. Detaylar için tıklayın.' },
    { id: 2, read: true, type: 'shipment', title: 'Sipariş Kargolandı', message: '123-12312321 numaralı siparişiniz kargoya verildi. Kargo takip no: XYZ123' },
    { id: 3, read: false, type: 'balance', title: 'Bakiye Yüklendi', message: 'Hesabınıza 500.00 TL yüklendi. Yeni bakiye: 15,500.00 TL' }
];

export const initialMessages: Message[] = [
    { id: 1, sender: 'Ahmet Kaya', lastMessage: 'Merhaba, siparişim hakkında bilgi alabilir miyim?', avatar: null, read: false },
    { id: 2, sender: 'Ayşe Demir', lastMessage: 'Teşekkürler, iyi çalışmalar.', avatar: null, read: true },
    { id: 3, sender: 'Destek Ekibi', lastMessage: 'Yeni kampanya detayları için tıklayın.', avatar: null, read: false }
];

export const userMedicationsData: MedicationItem[] = [
    {
        id: 1,
        productName: 'Apranax Forte',
        stock: '50 + 5',
        price: 52.50,
        barcode: '8699514090202',
        expirationDate: '12/2026',
        status: 'active',
        dateAdded: '2024-05-01',
    },
    {
        id: 2,
        productName: 'Parol 500mg',
        stock: '200 + 20',
        price: 25.00,
        barcode: '8699525010018',
        expirationDate: '08/2027',
        status: 'active',
        dateAdded: '2024-05-10',
    },
    {
        id: 3,
        productName: 'Majezik 100mg',
        stock: '75 + 8',
        price: 48.75,
        barcode: '8699540091215',
        expirationDate: '11/2025',
        status: 'paused',
        dateAdded: '2024-04-15',
    },
    {
        id: 4,
        productName: 'Dolorex',
        stock: '100 + 12',
        price: 45.00,
        barcode: '8699514010019',
        expirationDate: '01/2028',
        status: 'active',
        dateAdded: '2024-03-20',
    },
    {
        id: 6,
        productName: 'Aspirin 100mg',
        stock: '300 + 50',
        price: 15.00,
        barcode: '8699546010017',
        expirationDate: '09/2027',
        status: 'out_of_stock',
        dateAdded: '2024-02-10',
    },
];

export const ilaclarShowroomData: ShowroomMedication[] = [
  { id: 1, name: 'Dolorex', manufacturer: 'Abdi İbrahim', imageUrl: 'https://i.hizliresim.com/j1umlb5.png', price: 48.23, expirationDate: '2026-12', initialStock: 60, currentStock: 60, bonus: 5, sellers: [{ pharmacyUsername: 'gunes-eczanesi', pharmacyName: 'Güneş Eczanesi' }] },
  { id: 2, name: 'Parol', manufacturer: 'Atabay', imageUrl: 'https://i.hizliresim.com/21s3irj.png', price: 25.50, expirationDate: '2027-08', initialStock: 100, currentStock: 80, bonus: 10, sellers: [{ pharmacyUsername: 'meltem-eczanesi', pharmacyName: 'Meltem Eczanesi' }] },
  { id: 3, name: 'Apranax Forte', manufacturer: 'Abdi İbrahim', imageUrl: 'https://i.hizliresim.com/gle5dcm.png', price: 52.75, expirationDate: '2025-11', initialStock: 50, currentStock: 10, bonus: 0, sellers: [{ pharmacyUsername: 'gunes-eczanesi', pharmacyName: 'Güneş Eczanesi' }, { pharmacyUsername: 'meltem-eczanesi', pharmacyName: 'Meltem Eczanesi' }] },
  { id: 9, name: 'Minoset Plus', manufacturer: 'Bayer', imageUrl: 'https://i.hizliresim.com/mm5sy8z.png', price: 22.40, expirationDate: '2027-05', initialStock: 40, currentStock: 0, bonus: 0, sellers: [] },
  { id: 5, name: 'Benical Cold', manufacturer: 'Bayer', imageUrl: 'https://i.hizliresim.com/jrqzrdq.png', price: 65.20, expirationDate: '2025-10', initialStock: 40, currentStock: 40, bonus: 4, sellers: [{ pharmacyUsername: 'meltem-eczanesi', pharmacyName: 'Meltem Eczanesi' }] },
  { id: 6, name: 'Aspirin 100mg', manufacturer: 'Bayer', imageUrl: 'https://i.hizliresim.com/tkz0vdm.png', price: 15.00, expirationDate: '2027-09', initialStock: 300, currentStock: 150, bonus: 50, sellers: [] },
];

export const otherPharmaciesData: PharmacyProfileData[] = [
    {
        pharmacyName: "Güneş Eczanesi",
        pharmacistInCharge: "Ahmet Çelik",
        balance: 0, // Başkasının bakiyesi görünmez
        logoUrl: null,
        coverImageUrl: '/cover-photo.jpg',
        about: "Kadıköy'ün en köklü eczanelerinden biriyiz.",
        location: "Caferağa Mah. Mühürdar Cad. No: 54/B, Kadıköy, İstanbul",
        registrationDate: "Mart 2024",
        licenseNumber: "54321/34",
        phone: "0216 123 45 67",
        username: "gunes-eczanesi"
    },
    {
        pharmacyName: "Meltem Eczanesi",
        pharmacistInCharge: "Fatma Aydın",
        balance: 0,
        logoUrl: null,
        coverImageUrl: '/cover-photo.jpg',
        about: "Sağlığınız bizim için değerli.",
        location: "Kızılay Mah. Gazi Mustafa Kemal Blv. No: 22/A, Çankaya, Ankara",
        registrationDate: "Kasım 2023",
        licenseNumber: "98765/06",
        phone: "0312 987 65 43",
        username: "meltem-eczanesi"
    }
];

export const priceHistoryData: PriceData[] = [
    { day: 'Pzt', price: 48.23 },
    { day: 'Sal', price: 47.99 },
    { day: 'Çar', price: 48.05 },
    { day: 'Per', price: 47.50 },
    { day: 'Cum', price: 47.80 },
    { day: 'Cmt', price: 48.10 },
    { day: 'Paz', price: 47.90 },
];

// GÜNCELLENDİ: Daha fazla veri eklendi
export const warehouseOffersData: WarehouseOffer[] = [
    { id: 1, warehouseName: 'Selçuk Ecza Deposu', price: 45.50, stockInfo: 'Stok Var' },
    { id: 2, warehouseName: 'Alliance Healthcare', price: 45.75, stockInfo: 'Stok Var' },
    { id: 3, warehouseName: 'Hedef Ecza Deposu', price: 46.00, stockInfo: 'Sınırlı Stok' },
    { id: 4, warehouseName: 'Galenos Ecza Deposu', price: 46.10, stockInfo: 'Stok Var' },
    { id: 5, warehouseName: 'Pharmetic', price: 46.25, stockInfo: 'Stok Var' },
    { id: 6, warehouseName: 'As Ecza Deposu', price: 46.40, stockInfo: 'Stok Var' },
    { id: 7, warehouseName: 'Eczacıbaşı', price: 46.50, stockInfo: 'Tükendi' },
    { id: 8, warehouseName: 'Novartis Depo', price: 46.75, stockInfo: 'Sınırlı Stok' },
];

// Miad Raporu için
export interface MiadReportItem extends MedicationItem {
  daysRemaining: number;
  totalValue: number;
  costValue: number; // Maliyet eklendi
}

export const miadReportData: MiadReportItem[] = [
  { ...userMedicationsData[2], daysRemaining: 85, totalValue: 3656.25, costValue: 3000 }, // Majezik
  { ...userMedicationsData[0], daysRemaining: 420, totalValue: 2625, costValue: 2000 }, // Apranax
  { ...userMedicationsData[1], daysRemaining: 1020, totalValue: 5000, costValue: 4000 }, // Parol
];

// Envanter Raporu için
export interface EnvanterReportItem extends MedicationItem {
  costPrice: number; // Maliyet fiyatı
  totalCostValue: number;
  totalSalesValue: number;
  category: string; // Kategori
}

export const envanterReportData: EnvanterReportItem[] = [
  { ...userMedicationsData[0], costPrice: 40.00, totalCostValue: 2000.00, totalSalesValue: 2625.00, category: 'Ağrı Kesici' },
  { ...userMedicationsData[1], costPrice: 20.00, totalCostValue: 4000.00, totalSalesValue: 5000.00, category: 'Ateş Düşürücü' },
  { ...userMedicationsData[2], costPrice: 40.00, totalCostValue: 3000.00, totalSalesValue: 3656.25, category: 'Ağrı Kesici' },
  { ...userMedicationsData[3], costPrice: 35.00, totalCostValue: 3500.00, totalSalesValue: 4500.00, category: 'Ağrı Kesici' },
  { ...userMedicationsData[4], costPrice: 10.00, totalCostValue: 3000.00, totalSalesValue: 4500.00, category: 'Vitamin' },
];

// Performans Raporu için
export interface PerformanceReportItem extends MedicationItem {
  views: number;
  salesCount: number;
  conversionRate: number; // (salesCount / views) * 100
}

export const performanceReportData: PerformanceReportItem[] = [
  { ...userMedicationsData[1], views: 1500, salesCount: 75, conversionRate: 5.0 }, // Parol
  { ...userMedicationsData[0], views: 800, salesCount: 50, conversionRate: 6.25 }, // Apranax
  { ...userMedicationsData[3], views: 1200, salesCount: 40, conversionRate: 3.33 }, // Dolorex
  { ...userMedicationsData[2], views: 300, salesCount: 5, conversionRate: 1.67 }, // Majezik
];

// Piyasa Talep Raporu için
export interface DemandReportItem {
  id: number;
  searchTerm: string;
  searchCount: number;
  inventoryStatus: 'Stokta Var' | 'Stokta Yok';
}

export const demandReportData: DemandReportItem[] = [
  { id: 1, searchTerm: 'Buscopan Plus', searchCount: 120, inventoryStatus: 'Stokta Yok' },
  { id: 2, searchTerm: 'Parol', searchCount: 95, inventoryStatus: 'Stokta Var' },
  { id: 3, searchTerm: 'Augmentin 1000mg', searchCount: 88, inventoryStatus: 'Stokta Yok' },
  { id: 4, searchTerm: 'Benexol B12', searchCount: 70, inventoryStatus: 'Stokta Yok' },
  { id: 5, searchTerm: 'Dolorex', searchCount: 50, inventoryStatus: 'Stokta Var' },
];

// Finansal Özet Grafiği için
export const financialSummaryData: PriceData[] = [
    { day: 'Ocak', price: 12000 },
    { day: 'Şubat', price: 15000 },
    { day: 'Mart', price: 13500 },
    { day: 'Nisan', price: 18000 },
    { day: 'Mayıs', price: 17000 },
    { day: 'Haziran', price: 21000 },
    { day: 'Temmuz', price: 19000 },
];

export type TransactionStatus = 'Tamamlandı' | 'İşlemde' | 'İptal Edildi';
export type TransactionType = 'Alış' | 'Satış' | 'Bakiye Yükleme' | 'İade';

export interface TransactionHistoryItem {
  id: string; // Sipariş/İşlem ID'si
  date: string; // YYYY-MM-DD formatı
  type: TransactionType;
  productName?: string; // Bakiye yüklemede bu boş olabilir
  counterparty?: string; // Satışta 'Alıcı: ...', Alışta 'Satıcı: ...'
  amount: number; // Pozitif (Satış, Bakiye), Negatif (Alış, İade)
  status: TransactionStatus;
}

// YENİ: Örnek İşlem Geçmişi Verisi
export const transactionHistoryData: TransactionHistoryItem[] = [
  {
    id: 'S-10589',
    date: '2025-10-28',
    type: 'Satış',
    productName: 'Parol 500mg',
    counterparty: 'Alıcı: Güneş Eczanesi',
    amount: 510.00,
    status: 'Tamamlandı'
  },
  {
    id: 'A-77412',
    date: '2025-10-27',
    type: 'Alış',
    productName: 'Dolorex',
    counterparty: 'Satıcı: Meltem Eczanesi',
    amount: -241.15,
    status: 'Tamamlandı'
  },
  {
    id: 'BKY-0012',
    date: '2025-10-26',
    type: 'Bakiye Yükleme',
    productName: undefined,
    counterparty: 'Banka Transferi',
    amount: 5000.00,
    status: 'Tamamlandı'
  },
  {
    id: 'S-10588',
    date: '2025-10-25',
    type: 'Satış',
    productName: 'Apranax Forte',
    counterparty: 'Alıcı: Meltem Eczanesi',
    amount: 263.75,
    status: 'İşlemde'
  },
  {
    id: 'S-10587',
    date: '2025-10-24',
    type: 'Satış',
    productName: 'Majezik 100mg',
    counterparty: 'Alıcı: Güneş Eczanesi',
    amount: 390.00,
    status: 'İptal Edildi'
  },
   {
    id: 'A-77411',
    date: '2025-10-23',
    type: 'Alış',
    productName: 'Benical Cold',
    counterparty: 'Satıcı: Güneş Eczanesi',
    amount: -652.00,
    status: 'Tamamlandı'
  },
   {
    id: 'IADE-001',
    date: '2025-10-22',
    type: 'İade',
    productName: 'Dolorex',
    counterparty: 'Satıcı: Meltem Eczanesi',
    amount: 241.15,
    status: 'Tamamlandı'
  },
];

export { pharmacyData, offersData, balanceHistoryData, transfersData, shipmentsData, initialNotifications, initialMessages, ilaclarShowroomData, otherPharmaciesData, priceHistoryData, warehouseOffersData };
export type { SellerInfo, ShowroomMedication, PharmacyProfileData, Offer, BalanceItem, TransferItem, ShipmentItem, Notification, Message, PriceData, WarehouseOffer };