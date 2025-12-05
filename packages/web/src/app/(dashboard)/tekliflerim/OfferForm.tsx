// src/app/(dashboard)/tekliflerim/OfferForm.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import IMask from 'imask';
import { useIMask } from 'react-imask';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MedicationItem, 
  fullInventoryData,
  otherPharmaciesData,
} from '@/lib/dashboardData';
import { stockOfferTiers, StockOfferTier } from '@/lib/stockOfferMockData';
import SettingsCard from '@/components/settings/SettingsCard';
import formStyles from './OfferForm.module.css';
import { medicationService } from '@/services/medicationService';
// Icon imports temporarily disabled due to workspace module resolution issues
// import { 
//   Calculator as CalculatorIcon, 
//   AlertTriangle as ExclamationTriangleIcon, 
//   DollarSign as CurrencyDollarIcon,
//   Tag as TagIcon
// } from 'lucide-react';

// === TYPES ===
type OfferType = 'stockSale' | 'jointOrder' | 'purchaseRequest';

interface OfferFormProps {
  medication?: MedicationItem;
  onSave: (formData: any) => void;
  isSaving?: boolean;
  initialBaremId?: string; // For pre-selecting barem in edit mode
  initialMalFazlasi?: string; // For displaying previous barem selection
}

// === ZOD VALIDATION SCHEMA ===
const baseSchema = z.object({
  productName: z.string()
    .min(2, 'İlaç adı en az 2 karakter olmalıdır'),
  barcode: z.string().optional(),
  skt: z.string().optional(), // IMask handles this field - validated in onSubmit
  price: z.string().optional(), // Validated in onSubmit with barem price limit
  stock: z.string().optional(), // Validated in onSubmit
  
  // Barem alanları (otomatik doluyor)
  minSaleQuantity: z.string().optional(),
  bonus: z.string().optional(),
  
  // Diğer tip alanları
  campaignStartDate: z.string().optional(),
  campaignEndDate: z.string().optional(),
  campaignBonusMultiplier: z.string().optional(),
  minimumOrderQuantity: z.string().optional(),
  biddingDeadline: z.string().optional(),
  acceptingCounterOffers: z.boolean().optional(),
});

type OfferFormData = z.infer<typeof baseSchema>;

const OfferForm: React.FC<OfferFormProps> = ({ medication, onSave, isSaving, initialBaremId, initialMalFazlasi }) => {
  
  // === STATE MANAGEMENT ===
  const [offerType, setOfferType] = useState<OfferType>('stockSale');
  const isEditMode = !!medication;
  const searchParams = useSearchParams();
  
  const defaultValues = useMemo(() => ({
    productName: searchParams.get('isim') || '',
    barcode: searchParams.get('barkod') || '',
    stock: searchParams.get('stok') || '',
    bonus: searchParams.get('mf') || '',
    price: (searchParams.get('maliyet') || '').replace('.', ','), 
    expirationDate: searchParams.get('skt') || '',
  }), [searchParams]);

  // React Hook Form with Zod validation
  const { register, handleSubmit, formState: { errors }, setValue, watch, control, reset, getValues, clearErrors } = useForm<OfferFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      productName: medication?.productName || defaultValues?.productName || '',
      barcode: medication?.barcode || defaultValues?.barcode || '',
      skt: medication?.expirationDate || defaultValues?.expirationDate || '',
      price: medication?.price ? String(medication.price).replace('.', ',') : (defaultValues?.price || ''),
      stock: medication?.stock ? medication.stock.split(' + ')[0] : (defaultValues?.stock || ''),
      bonus: medication?.stock ? medication.stock.split(' + ')[1] : (defaultValues?.bonus || ''),
      minSaleQuantity: '',
      campaignStartDate: '',
      campaignEndDate: '',
      campaignBonusMultiplier: '',
      minimumOrderQuantity: '',
      biddingDeadline: '',
      acceptingCounterOffers: false,
    },
  });

  // Watch fields
  const watchedPrice = watch('price');
  const watchedSkt = watch('skt');

  // Calculated States
  const [netPrice, setNetPrice] = useState<number | null>(null);
  const [profitMargin, setProfitMargin] = useState<number | null>(null);
  const [effectiveDiscount, setEffectiveDiscount] = useState<number | null>(null);
  const [isExpiryWarning, setIsExpiryWarning] = useState(false);
  const [selectedTier, setSelectedTier] = useState<StockOfferTier | null>(null);
  const [baremError, setBaremError] = useState(false); // Only show error after submit attempt
  const [isPharmacySpecific, setIsPharmacySpecific] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>('');
  
  // Autocomplete State
  const [productSearchTerm, setProductSearchTerm] = useState(
    defaultValues?.productName || (medication ? medication.productName : '')
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<MedicationItem | null>(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Filter tiers based on selected product - more flexible matching
  const availableTiers = useMemo(() => {
    if (!productSearchTerm) return [];
    // Extract first word for matching (e.g., "PAROL" from "PAROL 500 MG 20 TABLET")
    const searchFirstWord = productSearchTerm.split(' ')[0].toLowerCase();
    return stockOfferTiers.filter((t: StockOfferTier) => {
      const tierFirstWord = t.medicationName.split(' ')[0].toLowerCase();
      return tierFirstWord === searchFirstWord || 
             t.medicationName.toLowerCase().includes(searchFirstWord) ||
             searchFirstWord.includes(tierFirstWord);
    });
  }, [productSearchTerm]);

  // Pre-select barem in edit mode based on initialBaremId or initialMalFazlasi
  useEffect(() => {
    if (isEditMode && availableTiers.length > 0 && !selectedTier) {
      // Try to find tier by ID first
      if (initialBaremId) {
        const tier = availableTiers.find(t => t.id === initialBaremId);
        if (tier) {
          setSelectedTier(tier);
          setValue('minSaleQuantity', tier.minQuantity.toString());
          setValue('bonus', tier.mf);
          return;
        }
      }
      // Fallback: try to match by MalFazlasi format (e.g., "20+2")
      if (initialMalFazlasi) {
        const [minQty, mf] = initialMalFazlasi.split('+').map(s => s.trim());
        const tier = availableTiers.find(t => 
          t.minQuantity.toString() === minQty && 
          (t.mf === mf || t.mf.includes(mf))
        );
        if (tier) {
          setSelectedTier(tier);
          setValue('minSaleQuantity', tier.minQuantity.toString());
          setValue('bonus', tier.mf);
        }
      }
    }
  }, [isEditMode, availableTiers, initialBaremId, initialMalFazlasi, selectedTier, setValue]);

  // IMask for SKT field
  const { ref: sktRef, setValue: setMaskedSktValue } = useIMask<HTMLInputElement>({
    mask: 'MM / YYYY',
    blocks: {
      MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: true, placeholderChar: '_' },
      YYYY: { mask: IMask.MaskedRange, from: new Date().getFullYear(), to: new Date().getFullYear() + 20, maxLength: 4, placeholderChar: '_' },
    },
    lazy: true,
    overwrite: true,
  }, {
    onAccept: (value: string) => {
      setValue('skt', value, { shouldValidate: true });
    }
  });



  // Calculation states kept for barem selection display
  // (netPrice, profitMargin, effectiveDiscount are no longer actively calculated)


  useEffect(() => {
    // Check Expiry Warning (< 6 months)
    if (watchedSkt && watchedSkt.length === 9) {
      const [monthStr, yearStr] = watchedSkt.split(' / ');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);
      
      if (!isNaN(month) && !isNaN(year)) {
        const expiryDate = new Date(year, month - 1);
        const today = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(today.getMonth() + 6);

        setIsExpiryWarning(expiryDate < sixMonthsLater);
      }
    } else {
      setIsExpiryWarning(false);
    }
  }, [watchedSkt]);

  // === EFFECTS ===
  useEffect(() => {
    let initialItem: MedicationItem | null | undefined = null;

    if (isEditMode) {
        initialItem = medication;
    } else if (defaultValues.productName) {
        initialItem = fullInventoryData.find(i => i.barcode === defaultValues.barcode);
    }

    if (initialItem) {
        setOfferType('stockSale');
        setProductSearchTerm(initialItem.productName);
        setSelectedInventoryItem(initialItem);
        
        const skt = initialItem.expirationDate;
        if (skt) {
            const parts = skt.split('/');
            if (parts.length === 2) {
                const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
                const month = parts[0].padStart(2, '0');
                setMaskedSktValue(`${month} / ${year}`);
            }
        }
    }
  }, [isEditMode, medication, defaultValues, setMaskedSktValue]);

  // === EVENT HANDLERS ===
  const handleProductSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toUpperCase();
      setProductSearchTerm(value);
      
      // Clear previous selection if typing new search
      if (offerType === 'stockSale') {
          setSelectedInventoryItem(null);
          setValue('barcode', '');
          setValue('skt', '');
          setMaskedSktValue('');
          setValue('price', '');
          setValue('stock', '');
          setValue('bonus', '');
      }

      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

      if (value.length < 2) {
          setIsAutocompleteOpen(false);
          setSuggestions([]);
          setIsSearching(false);
          return;
      }

      setIsSearching(true);

      const timer = setTimeout(async () => {
          try {
              const medications: any = await medicationService.searchMedications(value, 10);
              setSuggestions(medications);
              setIsAutocompleteOpen(medications.length > 0);
          } catch (error) {
              console.error('Medication search error:', error);
              setSuggestions([]);
              setIsAutocompleteOpen(false);
          } finally {
              setIsSearching(false);
          }
      }, 1000);

      setSearchDebounceTimer(timer);
  };

  const handleSelectSuggestion = (suggestion: any) => {
      if (offerType === 'stockSale') {
          // Set form values first
          setValue('productName', suggestion.name, { shouldValidate: true });
          setValue('barcode', suggestion.barcode || '');
          setValue('skt', '');
          setValue('price', '');
          setValue('stock', '');
          setValue('bonus', '');
          
          // Update state after form values are set
          setProductSearchTerm(suggestion.name);
          setSelectedInventoryItem(null);
      } else {
          setValue('productName', suggestion.name, { shouldValidate: true });
          setProductSearchTerm(suggestion.name);
      }
      
      setIsAutocompleteOpen(false);
      setSuggestions([]);
  };

  const onSubmit = (data: any) => {
    if (isSaving) return;

    // Get SKT value from IMask input
    const sktValue = offerType === 'stockSale' && sktRef.current 
        ? sktRef.current.value 
        : data.skt;

    // ✅ Manual validation for required fields
    const priceStr = data.price || '';
    const priceValue = parseFloat(priceStr.replace(',', '.'));
    const stockValue = parseInt(data.stock || '0', 10);
    
    if (!priceStr || isNaN(priceValue) || priceValue <= 0) {
      alert('Lütfen geçerli bir fiyat giriniz (0\'dan büyük olmalı).');
      return;
    }
    
    if (!data.stock || isNaN(stockValue) || stockValue <= 0) {
      alert('Lütfen geçerli bir stok miktarı giriniz (0\'dan büyük olmalı).');
      return;
    }
    
    if (!sktValue || !/^\d{2}\s*\/\s*\d{4}$/.test(sktValue)) {
      alert('Lütfen geçerli bir son kullanma tarihi giriniz (MM / YYYY formatında).');
      return;
    }

    // Barem zorunlu kontrolü - eğer baremler mevcutsa biri seçilmeli
    if (availableTiers.length > 0 && !selectedTier) {
      setBaremError(true);
      alert('Lütfen bir barem seçiniz. Barem seçimi zorunludur.');
      return;
    }
    setBaremError(false); // Clear error if barem is selected

    // Fiyat limit kontrolü - seçilen baremin birim fiyatından fazla olmamalı
    if (selectedTier && priceValue > selectedTier.unitPrice) {
      alert(`Birim fiyat, seçilen baremin maksimum fiyatından (${selectedTier.unitPrice.toFixed(2)} TL) fazla olamaz.`);
      return;
    }

    // Get maxPriceLimit from selected tier if available
    const tierPriceLimit = selectedTier ? selectedTier.unitPrice : 0;
    
    // Parse values
    const stockVal = typeof data.stock === 'number' ? data.stock : parseInt(data.stock || '0', 10);
    const bonusVal = parseInt(data.bonus || '0', 10);
    const minSaleQty = selectedTier ? selectedTier.minQuantity : parseInt(data.minSaleQuantity || '0', 10);
    
    // Get MF from selected tier (format: "minQuantity+mf")
    const mfValue = selectedTier 
      ? `${selectedTier.minQuantity}+${selectedTier.mf.includes('+') ? selectedTier.mf.split('+')[1] : selectedTier.mf}` 
      : (bonusVal > 0 ? `${minSaleQty || stockVal}+${bonusVal}` : null);

    const dataToSave = {
        offerType,
        productName: data.productName,
        barcode: data.barcode || '',
        expirationDate: sktValue ? sktValue.replace(/ /g, '') : '',
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price?.replace(',', '.') || '0'),
        stock: stockVal,
        bonus: bonusVal,
        minSaleQuantity: minSaleQty > 0 ? minSaleQty : stockVal,
        bonusQuantity: bonusVal,
        
        // Generate malFazlasi format from selected tier: "minQuantity+mf" (e.g., "20+2")
        malFazlasi: mfValue,

        // Private offer fields
        isPrivate: isPharmacySpecific,
        targetPharmacyIds: isPharmacySpecific && selectedPharmacyId ? selectedPharmacyId : null,
        warehouseBaremId: selectedTier ? selectedTier.id : null,
        maxPriceLimit: tierPriceLimit,

        // Campaign
        campaignStartDate: data.campaignStartDate || null,
        campaignEndDate: data.campaignEndDate || null,
        campaignBonusMultiplier: data.campaignBonusMultiplier 
          ? parseFloat(data.campaignBonusMultiplier.replace(',', '.')) 
          : 1,
        
        // Tender fields
        minimumOrderQuantity: data.minimumOrderQuantity || null,
        biddingDeadline: data.biddingDeadline || null,
        acceptingCounterOffers: data.acceptingCounterOffers || false,
        
        // Pharmacy Specific (legacy)
        targetPharmacyId: isPharmacySpecific ? selectedPharmacyId : null,
        ...(isEditMode && { id: medication.id }),
    };

    console.log('Form Data to Save:', dataToSave);
    onSave(dataToSave);
  };

  // === RENDER FUNCTIONS ===
  const renderAutocompleteList = () => {
      if (!isAutocompleteOpen) return null;

      if (isSearching) {
          return (
              <div className={formStyles.autocompleteList}>
                  <div className={formStyles.autocompleteItem} style={{ cursor: 'default' }}>
                      Aranıyor...
                  </div>
              </div>
          );
      }

      if (suggestions.length === 0) {
          return (
              <div className={formStyles.autocompleteList}>
                  <div className={formStyles.autocompleteItem} style={{ cursor: 'default' }}>
                      Sonuç bulunamadı
                  </div>
              </div>
          );
      }

      return (
          <div className={formStyles.autocompleteList}>
              {suggestions.map((suggestion, index) => (
                  <div 
                      key={suggestion.id || index} 
                      className={formStyles.autocompleteItem}
                      onMouseDown={() => handleSelectSuggestion(suggestion)} 
                  >
                      {suggestion.name}
                      <small>
                          {suggestion.barcode && `Barkod: ${suggestion.barcode}`}
                          {suggestion.manufacturer && ` | ${suggestion.manufacturer}`}
                      </small>
                  </div>
              ))}
          </div>
      );
  };

  const renderTabs = () => (
    <div className={formStyles.tabContainer}>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'stockSale' ? formStyles.active : ''}`}
        onClick={() => setOfferType('stockSale')}
        disabled={isEditMode} >
        Stok Satışı
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'jointOrder' ? formStyles.active : ''}`}
        onClick={() => setOfferType('jointOrder')}
        disabled={isEditMode} >
        Ortak Sipariş
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'purchaseRequest' ? formStyles.active : ''}`}
        onClick={() => setOfferType('purchaseRequest')}
        disabled={isEditMode} >
        Alım Talebi
      </button>
    </div>
  );

  const renderCalculationBadge = () => {
    if (!netPrice && !selectedTier) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          📊 Fiyat Analizi
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* 1. Barem Fiyatı (Base) */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="block text-xs text-gray-500 mb-1">Barem Birim Fiyatı</span>
            <span className="block text-lg font-bold text-gray-700">
              {selectedTier ? selectedTier.unitPrice.toFixed(2) : '-'} ₺
            </span>
          </div>

          {/* 2. Net Maliyet (Cost) */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <span className="block text-xs text-blue-600 mb-1">Net Maliyet (MF Dahil)</span>
            <span className="block text-lg font-bold text-blue-700">
              {netPrice ? netPrice.toFixed(2) : '-'} ₺
            </span>
          </div>

          {/* 3. Satış Fiyatı (Sales Price) */}
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
            <span className="block text-xs text-purple-600 mb-1">Sizin Satış Fiyatınız</span>
            <span className="block text-lg font-bold text-purple-700">
              {watchedPrice ? watchedPrice : '-'} ₺
            </span>
          </div>

          {/* 4. Kar Oranı (Margin) */}
          <div className={`p-3 rounded-lg border ${profitMargin && profitMargin > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
            <span className={`block text-xs mb-1 ${profitMargin && profitMargin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              Tahmini Kar Oranı
            </span>
            <span className={`block text-lg font-bold ${profitMargin && profitMargin > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {profitMargin !== null ? `%${profitMargin.toFixed(2)}` : '-'}
            </span>
          </div>

        </div>
        {selectedTier && (
           <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
             ℹ️ Net maliyet, seçilen baremin MF koşulu ({selectedTier.minQuantity}+{selectedTier.mf.includes('+') ? selectedTier.mf.split('+')[1] : selectedTier.mf}) baz alınarak hesaplanmıştır.
           </div>
        )}
      </div>
    );
  };

  const renderCommonFields = () => (
    <>
      {/* Row 1: Product Search & Barcode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${formStyles.formGroup} ${formStyles.autocompleteWrapper}`}>
          <label htmlFor="productName">İlaç Adı *</label>
          <Controller
            control={control}
            name="productName"
            render={({ field: { onChange, onBlur, value, ref } }) => (
              <input
                type="text"
                id="productName"
                ref={ref}
                value={value || ''}
                onChange={(e) => {
                  const upper = e.target.value.toUpperCase();
                  onChange(upper);
                  handleProductSearchChange(e);
                }}
                onFocus={() => { if (productSearchTerm.length > 0) setIsAutocompleteOpen(true); }}
                onBlur={() => {
                  onBlur();
                  if (suggestions.length > 0) {
                    handleSelectSuggestion(suggestions[0]);
                  }
                  setTimeout(() => setIsAutocompleteOpen(false), 500);
                }}
                placeholder="İlaç ara..."
                disabled={isEditMode}
                autoComplete="off"
                className="w-full"
              />
            )}
          />
          {errors.productName && (
            <span className={formStyles.errorMessage}>{errors.productName.message as string}</span>
          )}
          {renderAutocompleteList()}
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="barcode">Barkod</label>
          <input 
            type="text" 
            id="barcode" 
            {...register('barcode')}
            readOnly 
            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} 
          />
        </div>
      </div>

      {/* Row 2: Tier Selection */}
      <div className="grid grid-cols-1 gap-4 mt-2">
        {/* TIER SELECTION UI */}
        {availableTiers.length > 0 && (
          <div className="mt-4 mb-4 col-span-3">
            <label className={formStyles.label}>
              Stoktan Teklif Baremleri * <span className="text-red-500 text-xs">(Barem seçimi zorunludur)</span>
            </label>
            <div className={`overflow-x-auto border rounded-lg ${baremError && !selectedTier ? 'border-red-500 border-2' : ''}`}>
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Min. Adet</th>
                    <th className="px-4 py-2">MF</th>
                    <th className="px-4 py-2">Birim Fiyat (Vergi Hariç)</th>
                  </tr>
                </thead>
                <tbody>
                  {availableTiers.map((tier: StockOfferTier) => (
                    <tr 
                      key={tier.id} 
                      onClick={() => {
                        setSelectedTier(tier);
                        setBaremError(false); // Clear error when tier selected
                        setValue('minSaleQuantity', tier.minQuantity.toString());
                        setValue('bonus', tier.mf); // Set bonus for MF display
                        // Clear price error if any
                        const currentPriceStr = getValues('price');
                        const currentPrice = currentPriceStr ? parseFloat(currentPriceStr.replace(',', '.')) : 0;
                        if (currentPrice > 0 && currentPrice <= tier.unitPrice) {
                          clearErrors('price');
                        }
                      }}
                      className={`cursor-pointer border-b hover:bg-blue-50 ${selectedTier?.id === tier.id ? 'bg-blue-100 border-blue-300' : 'bg-white'}`}
                    >
                      <td className="px-4 py-2 font-medium">{tier.minQuantity}</td>
                      <td className="px-4 py-2">{tier.mf}</td>
                      <td className="px-4 py-2 font-bold text-emerald-600">{tier.unitPrice.toFixed(2)} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {baremError && !selectedTier && (
              <p className="mt-2 text-xs text-red-500">⚠️ Lütfen yukarıdan bir barem seçiniz.</p>
            )}
            {selectedTier && (
              <div className="mt-2 text-xs text-blue-600 flex justify-between items-center">
                <span>Seçilen Barem: <strong>{selectedTier.minQuantity}+{selectedTier.mf}</strong> | Fiyat Limiti: <strong>{selectedTier.unitPrice.toFixed(2)} TL</strong></span>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedTier(null);
                    setValue('minSaleQuantity', '0');
                    setValue('bonus', '');
                  }}
                  className="text-red-500 hover:underline"
                >
                  Seçimi Temizle
                </button>
              </div>
            )}
          </div>
        )}

        <div className={formStyles.row}>
          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Birim Fiyat (TL) *</label>
            <input
              {...register('price', { 
                validate: (value) => {
                  if (selectedTier && value) {
                    const num = parseFloat(value.replace(',', '.'));
                    if (!isNaN(num) && num > selectedTier.unitPrice) {
                      return `Maksimum fiyat ${selectedTier.unitPrice.toFixed(2)} TL olabilir.`;
                    }
                  }
                  return true;
                }
              })}
              type="text"
              placeholder="0,00"
              className={`${formStyles.input} ${errors.price ? formStyles.inputError : ''}`}
              style={
                selectedTier && watch('price') && 
                parseFloat((watch('price') || '0').replace(',', '.')) > selectedTier.unitPrice
                  ? { borderColor: '#ef4444', borderWidth: '2px', backgroundColor: '#fef2f2' }
                  : {}
              }
            />
            {errors.price && (
              <span className={formStyles.errorMessage}>{errors.price.message as string}</span>
            )}
            {/* Prominent inline warning when price exceeds barem limit */}
            {selectedTier && watch('price') && 
             parseFloat((watch('price') || '0').replace(',', '.')) > selectedTier.unitPrice && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '2px solid #ef4444',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span>
                  Girdiğiniz fiyat ({watch('price')} TL), seçilen baremin maksimum fiyatından 
                  <strong> ({selectedTier.unitPrice.toFixed(2)} TL)</strong> fazla! 
                  Lütfen fiyatı düşürün.
                </span>
              </div>
            )}
          </div>

          <div className={formStyles.formGroup}>
            <label className={formStyles.label}>Stok Miktarı *</label>
            <input
              {...register('stock')}
              type="number"
              placeholder="0"
              className={`${formStyles.input} ${errors.stock ? formStyles.inputError : ''}`}
            />
            {errors.stock && (
              <span className={formStyles.errorMessage}>{errors.stock.message as string}</span>
            )}
          </div>
        </div>

        {/* PHARMACY SPECIFIC TOGGLE */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="pharmacySpecific"
              checked={isPharmacySpecific}
              onChange={(e) => {
                setIsPharmacySpecific(e.target.checked);
                if (!e.target.checked) setSelectedPharmacyId('');
              }}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="pharmacySpecific" className="ml-2 text-sm font-medium text-gray-900">
              Eczaneye Özel Teklif
            </label>
          </div>
          
          {isPharmacySpecific && (
            <div className="animate-fade-in">
              <label className={formStyles.label}>Hedef Eczane Seçin</label>
              <select
                value={selectedPharmacyId}
                onChange={(e) => setSelectedPharmacyId(e.target.value)}
                className={formStyles.select}
              >
                <option value="">Eczane Seçiniz...</option>
                {otherPharmaciesData.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.pharmacyName} ({p.group})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Bu teklifi sadece seçilen eczane görebilecektir.</p>
            </div>
          )}
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="expirationDate" className="flex items-center gap-2">
            Son Kullanma Tarihi *
            {isExpiryWarning && (
              <span className="text-amber-600 text-xs flex items-center gap-1">
                {/* <ExclamationTriangleIcon className="w-3 h-3" /> */}
                ⚠️ Yakın Tarih!
              </span>
            )}
          </label>
          <input 
            {...(() => {
              const { ref: formRef, ...rest } = register('skt');
              return {
                ...rest,
                ref: (e: HTMLInputElement | null) => {
                  formRef(e);
                  if (sktRef.current !== e) {
                    // @ts-ignore
                    sktRef.current = e;
                  }
                }
              };
            })()}
            type="text" 
            id="expirationDate" 
            placeholder="AA / YYYY"
            className={isExpiryWarning ? 'border-amber-500 bg-amber-50' : ''}
          />
          {errors.skt && (
            <span className={formStyles.errorMessage}>{errors.skt.message as string}</span>
          )}
        </div>
      </div>
    </>
  );

  const renderCampaignFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t pt-4">
      <div className={formStyles.formGroup}>
        <label htmlFor="campaignStartDate">Kampanya Başlangıç *</label>
        <input
          type="date" 
          id="campaignStartDate" 
          {...register('campaignStartDate')}
        />
        {errors.campaignStartDate && (
          <span className={formStyles.errorMessage}>{errors.campaignStartDate.message as string}</span>
        )}
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="campaignEndDate">Kampanya Bitiş *</label>
        <input
          type="date" 
          id="campaignEndDate" 
          {...register('campaignEndDate')}
        />
        {errors.campaignEndDate && (
          <span className={formStyles.errorMessage}>{errors.campaignEndDate.message as string}</span>
        )}
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="campaignBonusMultiplier">MF Çarpanı</label>
        <input
          type="text" 
          id="campaignBonusMultiplier" 
          {...register('campaignBonusMultiplier')}
          placeholder="1.0"
        />
      </div>
    </div>
  );

  const renderTenderFields = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t pt-4">
      <div className={formStyles.formGroup}>
        <label htmlFor="minimumOrderQuantity">Minimum Sipariş Miktarı *</label>
        <input
          type="text" 
          id="minimumOrderQuantity" 
          {...register('minimumOrderQuantity')}
          placeholder="100"
        />
        {errors.minimumOrderQuantity && (
          <span className={formStyles.errorMessage}>{errors.minimumOrderQuantity.message as string}</span>
        )}
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="biddingDeadline">Son Teklif Tarihi *</label>
        <input
          type="date" 
          id="biddingDeadline" 
          {...register('biddingDeadline')}
        />
        {errors.biddingDeadline && (
          <span className={formStyles.errorMessage}>{errors.biddingDeadline.message as string}</span>
        )}
      </div>
      <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
        <div className={formStyles.checkboxWrapper}>
          <input 
            type="checkbox" 
            id="acceptingCounterOffers"
            {...register('acceptingCounterOffers')}
          />
          <label htmlFor="acceptingCounterOffers">Karşı Teklifleri Kabul Et</label>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit, (errors) => console.error("FORM ERRORS:", errors))}>
      <SettingsCard
        title={isEditMode ? "Teklifi Düzenle" : "Yeni Teklif Oluştur"}
        description="Teklif türünü seçin ve detayları doldurun."
        footer={
          <button type="submit" className={`${formStyles.btn} ${formStyles.btnPrimary}`} disabled={isSaving}>
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        }
      >
        {!isEditMode && renderTabs()}

        <div className="flex flex-col gap-4">
          {renderCommonFields()}
          {offerType === 'jointOrder' && renderCampaignFields()}
          {offerType === 'purchaseRequest' && renderTenderFields()}
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;