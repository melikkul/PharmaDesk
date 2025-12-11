
// User & Auth
export type UserRole = 'Admin' | 'Pharmacy' | 'User';

export interface User {
  id: number;
  email: string;
  fullName: string;
  pharmacyId: number;
  role: UserRole;
  isFirstLogin: boolean;
  hasShippingService?: boolean; // Admin tarafından tanımlanan kargo hizmeti
  city?: string;       // 🆕 Şehir
  district?: string;   // 🆕 İlçe  
  address?: string;    // 🆕 Açık adres
}

export interface LoginResponse {
  token: string;
  user: User;
  isFirstLogin: boolean;
  error?: string;
}

export interface PharmacyProfile {
  id: number;
  pharmacyName: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  taxOffice: string;
  taxNumber: string;
  glnNumber: string;
  licenseNumber: string;
  latitude: number;
  longitude: number;
  rating: number;
  totalDeals: number;
  completionRate: number;
  joinDate: string;
  isVerified: boolean;
  about?: string; // Added field
}

export interface PharmacySettings {
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    orderUpdates: boolean;
    newOffers: boolean;
    marketing: boolean;
  };
  privacy: {
    showPhone: boolean;
    showAddress: boolean;
    showEmail: boolean;
    allowMessages: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: 'tr' | 'en';
    density: 'compact' | 'comfortable';
  };
}

// Medication & Inventory
export interface Medication {
  id: number;
  name: string;
  barcode: string;
  manufacturer: string;
  description: string;
  imageUrl?: string;
  atcCode?: string;
}

export interface InventoryItem {
  id: number;
  medicationId: number;
  stock: number; // This might be redundant if quantity is used, or alias
  quantity: number;
  bonusQuantity: number;
  costPrice: number;
  salePrice?: number;
  expiryDate: string;
  batchNumber: string;
  shelfLocation?: string;
  isAlarmSet: boolean;
  minStockLevel?: number;
  medication?: Medication;
}

// Offers
export interface Offer {
  id: number;
  medicationId: number;
  pharmacyId: number;
  quantity: number;
  unitPrice: number;
  bonusQuantity: number;
  minOrderQuantity: number;
  expirationDate: string;
  status: string;
  medication?: {
    id: number;
    name: string;
    imageUrl?: string;
    manufacturer?: string;
  };
  pharmacy?: {
    id: number;
    pharmacyName: string;
    username?: string;
  };
  // Frontend specific fields
  productName?: string;
  barcode?: string;
  price: number; // Price is usually required for display
  stock: string; // "100 + 10" format or string representation
  type?: 'standard' | 'campaign' | 'tender';
  pharmacyName?: string;
  pharmacyUsername?: string;
  description?: string;
  manufacturer?: string;
  imageUrl?: string;
  imageCount?: number; // Number of images for multi-image gallery
  campaignEndDate?: string;
  campaignBonusMultiplier?: number;
  minimumOrderQuantity?: number;
  biddingDeadline?: string;
  buyers?: BuyerInfo[]; // 🆕 Sipariş veren alıcılar
}

export interface BuyerInfo {
  pharmacyId: number;
  pharmacyName: string;
  quantity: number;
  orderDate?: string;
}

// Orders
export interface OrderItem {
  id: number;
  medicationId: number;
  quantity: number;
  unitPrice: number;
  bonusQuantity: number;
  profitAmount?: number; // 🆕 Kar miktarı
  medication: {
    id: number;
    name: string;
    atcCode: string;
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  buyerPharmacyId: number;
  sellerPharmacyId: number;
  totalAmount: number;
  orderDate: string;
  status: string;
  paymentStatus: string;
  buyerPharmacy?: {
    id: number;
    pharmacyName: string;
  };
  sellerPharmacy?: {
    id: number;
    pharmacyName: string;
  };
  orderItems: OrderItem[];
}

// Cart
export interface CartItem {
  id: number;
  medicationId: number;
  quantity: number;
  unitPrice: number;
  medication: {
    id: number;
    name: string;
    imageUrl?: string;
  };
}

export interface Cart {
  id: number;
  items: CartItem[];
  totalAmount: number;
}

// Notifications
export interface Notification {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
  relatedId?: string;
}

// Shipments
export interface Shipment {
  id: number;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string;
  orderId: number;
  // Frontend specific
  orderNumber?: string;
  productName?: string;
  quantity?: number;
  date?: string;
  transferType?: 'inbound' | 'outbound';
  counterparty?: string;
  shippingProvider?: string;
  trackingHistory?: any[];
}

// Dashboard
export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  activeOffers: number;
  lowStockItems: number;
  monthlyRevenue: number;
  pendingOrders: number;
  // Frontend specific
  totalInventory?: number;
  totalMedications?: number;
  activeOrders?: number;
}
