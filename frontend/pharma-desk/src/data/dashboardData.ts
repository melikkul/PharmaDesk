// data/dashboardData.ts

// Her bir veri tipi için interface'ler tanımlamak,
// kodun daha güvenli ve anlaşılır olmasını sağlar.

export interface UserData {
  pharmacyName: string;
  balance: number;
  userName: string;
  avatarUrl: string | null;
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

// --- GENİŞLETİLMİŞ VERİLER ---

export const userData: UserData = { 
    pharmacyName: "Yıldız Eczanesi", 
    balance: 15000.00, 
    userName: "Zeynep Yılmaz", 
    avatarUrl: null 
};

export const offersData: Offer[] = [ 
    { id: 1, productName: 'Apranax', stock: '50 + 5', price: 52.50 }, 
    { id: 2, productName: 'Parol', stock: '200 + 20', price: 25.00 }, 
    { id: 3, productName: 'Majezik', stock: '75 + 8', price: 48.75 },
    { id: 4, productName: 'Dolorex', stock: '100 + 12', price: 45.00 },
    { id: 5, productName: 'Benical', stock: '40 + 0', price: 65.20 },
    { id: 6, productName: 'Aspirin', stock: '300 + 50', price: 15.00 },
    { id: 7, productName: 'Nurofen', stock: '120 + 10', price: 38.90 },
];

export const balanceHistoryData: BalanceItem[] = [ 
    { id: 1, date: '20/10/2025', description: 'İlaç Satış', amount: 150.75, type: 'positive' },
    { id: 2, date: '19/10/2025', description: 'Kargo Ücreti', amount: -22.50, type: 'negative' }, 
    { id: 3, date: '19/10/2025', description: 'İlaç Sipariş', amount: -450.00, type: 'negative' }, 
    { id: 4, date: '18/10/2025', description: 'İlaç Satış', amount: 88.40, type: 'positive' },
    { id: 5, date: '17/10/2025', description: 'Para Transferi', amount: 5000.00, type: 'positive' },
    { id: 6, date: '16/10/2025', description: 'İlaç Satış', amount: 210.20, type: 'positive' },
    { id: 7, date: '15/10/2025', description: 'İade', amount: -75.00, type: 'negative' },
];

export const transfersData: TransferItem[] = [ 
    { id: 1, orderNumber: '202-58963214', productName: 'Apranax', amount: 525.00 }, 
    { id: 2, orderNumber: '202-14785236', productName: 'Parol', amount: 250.00 },
    { id: 3, orderNumber: '201-98765432', productName: 'Majezik', amount: 487.50 },
    { id: 4, orderNumber: '201-12345678', productName: 'Dolorex', amount: 450.00 },
    { id: 5, orderNumber: '200-78945612', productName: 'Benical', amount: 652.00 },
    { id: 6, orderNumber: '200-45678901', productName: 'Aspirin', amount: 150.00 },
];

export const shipmentsData: ShipmentItem[] = [ 
    { id: 1, orderNumber: '202-58963214', productName: 'Apranax', trackingNumber: '8521479632' }, 
    { id: 2, orderNumber: '202-14785236', productName: 'Parol', trackingNumber: '7412589632' },
    { id: 3, orderNumber: '201-98765432', productName: 'Majezik', trackingNumber: '9632587412' },
    { id: 4, orderNumber: '201-12345678', productName: 'Dolorex', trackingNumber: '5862734531' },
    { id: 5, orderNumber: '200-78945612', productName: 'Benical', trackingNumber: '1239874568' },
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