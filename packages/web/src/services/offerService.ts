
const API_BASE_URL = ''; // Use relative URL for Next.js proxy

import { Offer } from '../types';

export const offerService = {
  getOffers: async (random: number = 0): Promise<Offer[]> => {
    const response = await fetch(`${API_BASE_URL}/api/offers?_=${random}`);
    if (!response.ok) {
      throw new Error('Failed to fetch offers');
    }
    return response.json();
  },

  getOfferById: async (token: string, id: string): Promise<Offer | null> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      // 404 is expected for non-existent or non-owned offers - return null silently
      if (response.status === 404 || response.status === 403) {
        return null;
      }
      // For other errors, still throw
      const error: any = new Error(`Failed to fetch offer: ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  },

  getOffersByMedication: async (medicationId: string): Promise<Offer[]> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/medication/${medicationId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch medication offers');
    }
    return response.json();
  },

  getMyOffers: async (token: string): Promise<Offer[]> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/my-offers?_=${Date.now()}`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch my offers');
    }
    return response.json();
  },

  createOffer: async (token: string, offerData: any): Promise<{success: boolean; suggestion?: any}> => {
    const response = await fetch(`${API_BASE_URL}/api/offers`, {
      method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify(offerData),
    });

    // 🆕 Handle 409 Conflict for smart matching suggestion
    if (response.status === 409) {
      const suggestionData = await response.json();
      if (suggestionData.hasSuggestion) {
        return { success: false, suggestion: suggestionData };
      }
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create offer');
    }

    return { success: true };
  },

  updateOffer: async (token: string, id: string, offerData: any): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify(offerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update offer');
    }
  },

  updateOfferStatus: async (token: string, id: number, status: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}/status`, {
      method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
        },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error('Failed to update offer status');
    }
  },

  deleteOffer: async (token: string, id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete offer');
    }
  },

  // 🆕 Depo sorumluluğunu üstlen
  claimDepot: async (token: string, offerId: number): Promise<{ claimerUserId: number; claimedAt: string }> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/claim-depot`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to claim depot');
    }

    return response.json();
  },

  // 🆕 Depo sorumluluğundan ayrıl
  unclaimDepot: async (token: string, offerId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/claim-depot`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to unclaim depot');
    }
  },

  // 🆕 Teklifi sonlandır
  finalizeOffer: async (token: string, offerId: number): Promise<{ message: string; offer: any }> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/finalize`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to finalize offer');
    }

    return response.json();
  },

  // 🆕 Teklifi geri al
  withdrawOffer: async (token: string, offerId: number): Promise<{ message: string; offer: any }> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/withdraw`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to withdraw offer');
    }

    return response.json();
  },

  // 🆕 Bakiyeleri işle (Process Balance / Capture)
  processBalance: async (token: string, offerId: number): Promise<{ message: string; capturedAmount: number; transactionCount: number }> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/process-balance`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process balance');
    }

    return response.json();
  },

  // 🆕 Kargo etiketlerini getir (QR kodlar için)
  getShipmentLabels: async (token: string, offerId: number): Promise<any[]> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/shipment-labels`, {
      credentials: 'include',
      headers: {
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get shipment labels');
    }

    return response.json();
  },

  // 🆕 Alım Talebini Ortak Siparişe dönüştür
  convertToJointOrder: async (
    token: string, 
    offerId: number, 
    supplierQuantity: number
  ): Promise<{ message: string; offer: any }> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${offerId}/convert-to-joint`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token && token !== 'cookie-managed' ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ supplierQuantity }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Dönüştürme başarısız');
    }

    return response.json();
  }
};
