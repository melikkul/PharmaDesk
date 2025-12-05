
// =================================================================
// --- YENİ EKLENEN VERİLER: STOKTAN TEKLİF BAREMLERİ ---
// =================================================================

export interface StockOfferTier {
  id: string;
  medicationName: string;
  minQuantity: number;
  mf: string; // "10+1" formatında veya sadece "1" (bonus)
  unitPrice: number; // Vergi Hariç Birim Fiyat
}

export const stockOfferTiers: StockOfferTier[] = [
  // Dolorex
  { id: 'dolorex-t1', medicationName: 'Dolorex', minQuantity: 10, mf: '1', unitPrice: 59.13 },
  { id: 'dolorex-t2', medicationName: 'Dolorex', minQuantity: 20, mf: '3', unitPrice: 50.68 },
  { id: 'dolorex-t3', medicationName: 'Dolorex', minQuantity: 50, mf: '10', unitPrice: 46.46 },
  { id: 'dolorex-t4', medicationName: 'Dolorex', minQuantity: 100, mf: '25', unitPrice: 43.80 },

  // Parol
  { id: 'parol-t1', medicationName: 'Parol 500mg', minQuantity: 20, mf: '2', unitPrice: 24.50 },
  { id: 'parol-t2', medicationName: 'Parol 500mg', minQuantity: 50, mf: '7', unitPrice: 22.00 },
  
  // Apranax
  { id: 'apranax-t1', medicationName: 'Apranax Forte', minQuantity: 10, mf: '1', unitPrice: 51.00 },
  { id: 'apranax-t2', medicationName: 'Apranax Forte', minQuantity: 30, mf: '5', unitPrice: 48.50 },
];
