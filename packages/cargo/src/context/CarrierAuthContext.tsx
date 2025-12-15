'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { carrierApi, CarrierUser, CarrierLoginRequest } from '@/services/carrierApi';

interface CarrierAuthContextType {
    user: CarrierUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const CarrierAuthContext = createContext<CarrierAuthContextType | undefined>(undefined);

export const CarrierAuthProvider = ({ children }: { children: ReactNode }) => {
    const router = useRouter();
    const [user, setUser] = useState<CarrierUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('carrier_token') || sessionStorage.getItem('carrier_token');
            const storedUser = localStorage.getItem('carrier_user') || sessionStorage.getItem('carrier_user');

            if (storedToken && storedUser) {
                const userData: CarrierUser = JSON.parse(storedUser);
                setToken(storedToken);
                setUser(userData);
            }
        } catch (error) {
            console.error('Failed to initialize auth state from storage', error);
            localStorage.removeItem('carrier_token');
            localStorage.removeItem('carrier_user');
            sessionStorage.removeItem('carrier_token');
            sessionStorage.removeItem('carrier_user');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
        try {
            const credentials: CarrierLoginRequest = { email, password };
            const response = await carrierApi.login(credentials);
            const { token, user } = response;

            if (token && user) {
                if (rememberMe) {
                    localStorage.setItem('carrier_token', token);
                    localStorage.setItem('carrier_user', JSON.stringify(user));
                    sessionStorage.removeItem('carrier_token');
                    sessionStorage.removeItem('carrier_user');
                } else {
                    sessionStorage.setItem('carrier_token', token);
                    sessionStorage.setItem('carrier_user', JSON.stringify(user));
                    localStorage.removeItem('carrier_token');
                    localStorage.removeItem('carrier_user');
                }

                setToken(token);
                setUser(user);
                router.push('/dashboard');
            } else {
                throw new Error('Login failed: No token or user data received.');
            }
        } catch (error) {
            console.error('Login failed', error);
            throw error;
        }
    }, [router]);

    const logout = useCallback(async () => {
        try {
            // Attempt to check and end active shift before logging out
            // We do this silently and best-effort
            const shiftStatus = await carrierApi.getShiftStatus().catch(() => null);
            if (shiftStatus?.isOnShift) {
                await carrierApi.endShift().catch(err => console.error('Auto-end shift failed:', err));
            }
        } catch (error) {
            console.error('Logout cleanup error:', error);
        } finally {
            // Always clear local state and redirect
            setUser(null);
            setToken(null);
            localStorage.removeItem('carrier_token');
            localStorage.removeItem('carrier_user');
            sessionStorage.removeItem('carrier_token');
            sessionStorage.removeItem('carrier_user');
            router.push('/login');
        }
    }, [router]);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!token,
        login,
        logout
    };

    return <CarrierAuthContext.Provider value={value}>{children}</CarrierAuthContext.Provider>;
};

export const useCarrierAuth = () => {
    const context = useContext(CarrierAuthContext);
    if (context === undefined) {
        throw new Error('useCarrierAuth must be used within a CarrierAuthProvider');
    }
    return context;
};
