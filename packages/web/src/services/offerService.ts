
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

import { Offer } from '../types';

export const offerService = {
  getOffers: async (random: number = 0): Promise<Offer[]> => {
    const response = await fetch(`${API_BASE_URL}/api/offers?_=${random}`);
    if (!response.ok) {
      throw new Error('Failed to fetch offers');
    }
    return response.json();
  },

  getOfferById: async (id: string): Promise<Offer> => {
    const response = await fetch(`${API_BASE_URL}/api/offers/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch offer');
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
    const response = await fetch(`${API_BASE_URL}/api/offers/my-offers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch my offers');
    }
    return response.json();
  },

  createOffer: async (token: string, offerData: any): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/api/offers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(offerData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create offer');
    }
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
      method: 'PUT',
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
  }
};
