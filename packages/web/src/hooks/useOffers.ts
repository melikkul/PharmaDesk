import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offerService } from '../services/offerService';
import { Offer } from '../types';
import { useAuth } from '../store/AuthContext';

/**
 * Hook for fetching all offers
 * 
 * Features:
 * - Automatic caching with 1-minute stale time
 * - Background revalidation
 * - Manual refetch support
 * 
 * @returns {offers, loading, error, refetch}
 */
export const useOffers = () => {
  const query = useQuery({
    queryKey: ['offers'],
    queryFn: async () => {
      const random = Math.random();
      const data = await offerService.getOffers(random);
      return data;
    },
    // SignalR will handle real-time updates, no need for polling
    staleTime: 60000, // 60 saniye cache (SignalR invalidate edecek)
  });

  return {
    offers: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
};

/**
 * Hook for fetching a single offer by ID
 * 
 * Query is automatically disabled when id is undefined
 * 
 * @param id - Offer ID
 * @returns {offer, loading, error}
 */
export const useOffer = (id: string | number) => {
  const { token } = useAuth();
  
  const query = useQuery({
    queryKey: ['offers', id],
    queryFn: async () => {
      if (!token) throw new Error('No token found');
      const data = await offerService.getOfferById(token, id.toString());
      return data;
    },
    enabled: !!id && !!token, // Only run query when id and token exist
  });

  return {
    offer: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};

/**
 * Hook for fetching offers by medication ID
 * 
 * @param medicationId - Medication ID
 * @returns {offers, loading, error}
 */
export const useMedicationOffers = (medicationId: string | number) => {
  const query = useQuery({
    queryKey: ['offers', 'medication', medicationId],
    queryFn: async () => {
      const data = await offerService.getOffersByMedication(medicationId.toString());
      return data;
    },
    enabled: !!medicationId, // Only run query when medicationId exists
    // SignalR will handle real-time updates, no polling needed
    staleTime: 60000, // 60 saniye cache (SignalR invalidate edecek)
  });

  // Sort offers by price (cheapest first)
  const sortedOffers = [...(query.data ?? [])].sort((a, b) => a.price - b.price);

  return {
    offers: sortedOffers,
    loading: query.isLoading,
    error: query.error?.message ?? null,
  };
};

/**
 * Hook for creating a new offer
 * 
 * Automatically invalidates the offers list on success
 * 
 * @returns {mutate, isPending, error}
 */
export const useCreateOffer = () => {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const mutation = useMutation({
    mutationFn: async (offerData: any) => {
      if (!token) throw new Error('No token found');
      await offerService.createOffer(token, offerData);
    },
    onSuccess: () => {
      // Invalidate and refetch offers list
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
};

/**
 * Hook for updating an offer's status
 * 
 * Automatically invalidates the specific offer and offers list on success
 * 
 * @returns {mutate, isPending, error}
 */
export const useUpdateOfferStatus = () => {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      if (!token) throw new Error('No token found');
      await offerService.updateOfferStatus(token, id, status);
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific offer
      queryClient.invalidateQueries({ queryKey: ['offers', variables.id] });
      // Invalidate the offers list
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
};

/**
 * Hook for deleting an offer
 * 
 * Automatically invalidates the offers list on success
 * 
 * @returns {mutate, isPending, error}
 */
export const useDeleteOffer = () => {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const mutation = useMutation({
    mutationFn: async (id: number) => {
      if (!token) throw new Error('No token found');
      await offerService.deleteOffer(token, id);
    },
    onSuccess: () => {
      // Invalidate and refetch offers list
      queryClient.invalidateQueries({ queryKey: ['offers'] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
  };
};
