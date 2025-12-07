
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

  getOfferById: async (token: string, id: string): Promise<Offer> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
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
      headers: {
        'Authorization': `Bearer ${token}`,
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
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
      headers: {
        'Authorization': `Bearer ${token}`,
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
      headers: {
        'Authorization': `Bearer ${token}`,
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to unclaim depot');
    }
  }
};
