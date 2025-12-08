import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

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
};

export default api;
