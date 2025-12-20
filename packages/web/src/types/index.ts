
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
  /** Short-lived access token (15 minutes) */
  accessToken: string;
  /** Long-lived refresh token (stored as HttpOnly cookie by backend) */
  refreshToken?: string;
  /** Access token expiry in seconds (default 900) */
  expiresIn: number;
  /** @deprecated Use accessToken instead */
  token?: string;
  user: User;
  isFirstLogin: boolean;
  error?: string;
  /** For registration - indicates pending admin approval */
  pendingApproval?: boolean;
  message?: string;
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
  
  // 🆕 JSONB arrays from backend
  alternatives?: string[]; // Alternative medication barcodes/ATCs
  allImagePaths?: string[]; // All image paths for carousel
  imageCount?: number; // Number of images
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
  type?: 'standard' | 'campaign' | 'tender' | 'stockSale' | 'jointOrder' | 'purchaseRequest';
  pharmacyName?: string;
  pharmacyUsername?: string;
  description?: string;
  manufacturer?: string;
  imageUrl?: string;
  imageUrls?: string[]; // 🆕 All image paths for carousel
  imageCount?: number; // Number of images for multi-image gallery
  campaignEndDate?: string;
  campaignBonusMultiplier?: number;
  minimumOrderQuantity?: number;
  biddingDeadline?: string;
  buyers?: BuyerInfo[]; // 🆕 Sipariş veren alıcılar
  
  // 🆕 Private offer fields - refactored to number[] array
  isPrivate?: boolean;
  targetPharmacyIds?: number[]; // Changed from string to number[]
  
  // 🆕 Financial fields
  depotPrice?: number;
  malFazlasi?: string; // Barem format e.g., "20+2"
  discountPercentage?: number;
  netPrice?: number;
  maxSaleQuantity?: number;
  warehouseBaremId?: number;
  maxPriceLimit?: number;
  
  // 🆕 Stock tracking
  soldQuantity?: number;
  remainingStock?: number;
  
  // 🆕 Depot claim fields
  depotClaimerUserId?: number;
  depotClaimedAt?: string;
  
  // 🆕 Finalization tracking (for Provision/Capture Pattern)
  isFinalized?: boolean;
  isPaymentProcessed?: boolean;
  
  // 🆕 Participants list (JointOrder/PurchaseRequest)
  participants?: Array<{
    pharmacyId: number;
    pharmacyName: string;
    quantity: number;
    isSupplier: boolean;
    addedAt?: string;
  }>;
  totalRequestedQuantity?: number;
}

// 🆕 Shipment Label for QR code printing
export interface ShipmentLabel {
  shipmentId: number;
  orderNumber: string;
  buyerPharmacyName: string;
  buyerPharmacyId: number;
  quantity: number;
  qrToken: string;
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

// 🆕 Transaction types
export type TransactionType = 
  | 'Sale' 
  | 'Purchase' 
  | 'Deposit' 
  | 'Withdrawal' 
  | 'Refund'
  | 'OfferCreated'
  | 'OfferUpdated'
  | 'OfferDeleted'
  | 'OrderCreated'
  | 'OrderCompleted';

export type TransactionStatus = 'Pending' | 'Completed' | 'Failed' | 'Cancelled';

export interface Transaction {
  id: number;
  pharmacyProfileId: number;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  status: TransactionStatus;
  counterparty?: string;
  counterpartyPharmacyId?: number;
  
  // 🆕 FK references for data integrity (replaces RelatedReferenceId string)
  orderId?: number;
  offerId?: number;
}

// 🆕 CreateOfferRequest interface for form submission
export interface CreateOfferRequest {
  type: 'stockSale' | 'jointOrder' | 'purchaseRequest';
  productName?: string;
  barcode?: string;
  medicationId?: number;
  price: number;
  stock: number;
  bonusQuantity?: number;
  minSaleQuantity?: number;
  expirationDate?: string;
  
  // Financial fields
  depotPrice?: number;
  malFazlasi?: string;
  discountPercentage?: number;
  maxSaleQuantity?: number;
  description?: string;
  
  // Private offer fields - refactored to number[] array
  isPrivate?: boolean;
  targetPharmacyIds?: number[]; // Changed from string to number[]
  warehouseBaremId?: number;
  maxPriceLimit?: number;
  
  // Campaign fields
  campaignStartDate?: string;
  campaignEndDate?: string;
  campaignBonusMultiplier?: number;
  
  // Tender fields
  minimumOrderQuantity?: number;
  biddingDeadline?: string;
  acceptingCounterOffers?: boolean;
}
