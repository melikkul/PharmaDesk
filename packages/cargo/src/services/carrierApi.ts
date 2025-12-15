import axios, { AxiosInstance } from 'axios';

// Use environment variable for API URL (client-side accessible)
// In Docker: NEXT_PUBLIC_API_URL=http://192.168.1.3:8081 or http://localhost:8081
// Falls back to relative URL for Next.js proxy if not set
const API_URL = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || '') 
    : '';

// Create axios instance
const api: AxiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('carrier_token') || sessionStorage.getItem('carrier_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear tokens on unauthorized
            localStorage.removeItem('carrier_token');
            localStorage.removeItem('carrier_user');
            sessionStorage.removeItem('carrier_token');
            sessionStorage.removeItem('carrier_user');

            // Redirect to login if not already there
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export interface CarrierLoginRequest {
    email: string;
    password: string;
}

export interface CarrierUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    companyName?: string;
    vehicleInfo?: string;
    status: string;
}

export interface CarrierLoginResponse {
    token: string;
    user: CarrierUser;
}

export interface CarrierRegisterRequest {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    companyName?: string;
    vehicleInfo?: string;
}

export interface ValidateTokenResponse {
    email: string;
}

// 🆕 QR Scan Response interface
export interface ScanResult {
    success: boolean;
    message: string;
    newStatus?: string;
    shipmentId?: number;
    orderNumber?: string;
    errorCode?: number;
}

// 🆕 Carrier Shipment interfaces
export interface CarrierShipment {
    id: number;
    orderNumber: string;
    pharmacyName: string;
    pharmacyAddress: string;
    pharmacyPhone?: string;
    pharmacyLat?: number;
    pharmacyLng?: number;
    medicationName?: string;
    quantity: number;
    status: 'pending' | 'shipped' | 'intransit' | 'delivered' | 'cancelled';
    statusText: string;
    isAssignedToMe: boolean;
    updatedAt: string;
}

export interface NextPharmacy {
    id: number;
    pharmacyName: string;
    pharmacyAddress: string;
    pharmacyPhone?: string;
    lat?: number;
    lng?: number;
    status: string;
}

export interface ShipmentsResponse {
    shipments: CarrierShipment[];
    nextPharmacy: NextPharmacy | null;
    totalCount: number;
    pendingCount: number;
    inTransitCount: number;
    deliveredCount: number;
}

// API Service functions
export const carrierApi = {
    login: async (credentials: CarrierLoginRequest): Promise<CarrierLoginResponse> => {
        const response = await api.post('/api/carrier/login', credentials);
        return response.data;
    },

    register: async (data: CarrierRegisterRequest): Promise<{ message: string }> => {
        const response = await api.post('/api/carrier/register', data);
        return response.data;
    },

    validateToken: async (token: string): Promise<ValidateTokenResponse> => {
        const response = await api.get(`/api/carrier/validate-token/${token}`);
        return response.data;
    },

    getCurrentUser: async (): Promise<CarrierUser> => {
        const response = await api.get('/api/carrier/me');
        return response.data;
    },

    // 🆕 Scan shipment QR code and update status
    scanShipment: async (qrToken: string): Promise<ScanResult> => {
        const response = await api.post('/api/shipments/scan', { token: qrToken });
        return response.data;
    },

    // 🆕 Shift Management
    getShiftStatus: async (): Promise<ShiftStatusResponse> => {
        const response = await api.get('/api/carrier/shift/status');
        return response.data;
    },

    startShift: async (lat?: number, lng?: number): Promise<StartShiftResponse> => {
        const response = await api.post('/api/carrier/shift/start', { latitude: lat, longitude: lng });
        return response.data;
    },

    endShift: async (lat?: number, lng?: number): Promise<EndShiftResponse> => {
        const response = await api.post('/api/carrier/shift/end', { latitude: lat, longitude: lng });
        return response.data;
    },

    updateShiftLocation: async (lat: number, lng: number): Promise<void> => {
        await api.post('/api/carrier/shift/location', { latitude: lat, longitude: lng });
    },

    // 🆕 Get carrier's assigned shipments with real-time status
    getMyShipments: async (): Promise<ShipmentsResponse> => {
        const response = await api.get('/api/carrier/shift/shipments');
        return response.data;
    },
};

// Shift DTOs
export interface ShiftStatusResponse {
    isOnShift: boolean;
    shiftId: number | null;
    startTime: string | null;
    durationMinutes: number;
    durationFormatted: string;
}

export interface StartShiftResponse {
    success: boolean;
    shiftId: number;
    startTime: string;
    message: string;
}

export interface EndShiftResponse {
    success: boolean;
    shiftId: number;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    message: string;
}

export default api;
