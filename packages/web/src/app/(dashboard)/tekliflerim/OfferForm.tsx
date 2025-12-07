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
import { medicationService, BaremInfo, BaremResponse } from '@/services/medicationService';
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
  
  // Alliance Healthcare Barem State (Real API Data)
  const [apiBarems, setApiBarems] = useState<BaremInfo[]>([]);
  const [isFetchingBarem, setIsFetchingBarem] = useState(false);
  const [selectedMedicationId, setSelectedMedicationId] = useState<number | null>(null);
  const [baremApiError, setBaremApiError] = useState<string | null>(null);

  // Convert API barem data to tier format for display
  const availableTiers = useMemo(() => {
    if (apiBarems.length === 0) {
      // Fallback to mock data if no API barems
      if (!productSearchTerm) return [];
      const searchFirstWord = productSearchTerm.split(' ')[0].toLowerCase();
      return stockOfferTiers.filter((t: StockOfferTier) => {
        const tierFirstWord = t.medicationName.split(' ')[0].toLowerCase();
        return tierFirstWord === searchFirstWord || 
               t.medicationName.toLowerCase().includes(searchFirstWord) ||
               searchFirstWord.includes(tierFirstWord);
      });
    }
    
    // Convert API barems to tier format
    return apiBarems.map((barem, index) => ({
      id: `alliance-${index}`,
      medicationName: productSearchTerm,
      minQuantity: barem.minimumAdet,
      mf: barem.malFazlasi || barem.bonusQuantity > 0 ? String(barem.bonusQuantity) : '0',
      unitPrice: barem.birimFiyat,
      vade: barem.vade,
      iskontoKurum: barem.iskontoKurum,
      iskontoTicari: barem.iskontoTicari,
      isFromAlliance: true // Flag to identify Alliance data
    }));
  }, [apiBarems, productSearchTerm]);

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
  // Fetch barem data in EDIT MODE when medication is provided
  useEffect(() => {
    const fetchBaremForEditMode = async () => {
      if (isEditMode && medication && apiBarems.length === 0 && !isFetchingBarem) {
        // Use medicationId if available (from offer), otherwise fall back to id
        const medId = (medication as any).medicationId || medication.id;
        if (!medId) return;
        
        setIsFetchingBarem(true);
        setBaremApiError(null);
        
        try {
          // Fetch barem using the correct medication ID
          const baremResponse = await medicationService.getMedicationBarem(medId);
          
          if (baremResponse && baremResponse.barems && baremResponse.barems.length > 0) {
            setApiBarems(baremResponse.barems);
            console.log('✅ Edit mode: Barem data fetched for medication:', medId, 'tiers:', baremResponse.barems.length);
          } else if (baremResponse?.baremError) {
            setBaremApiError(baremResponse.baremError);
          }
        } catch (error) {
          console.error('❌ Edit mode: Failed to fetch barem:', error);
          setBaremApiError('Barem bilgisi çekilemedi');
        } finally {
          setIsFetchingBarem(false);
        }
      }
    };
    
    fetchBaremForEditMode();
  }, [isEditMode, medication]);

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

  const handleSelectSuggestion = async (suggestion: any) => {
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
          setSelectedMedicationId(suggestion.id);
          
          // Fetch barem data from Alliance Healthcare API
          if (suggestion.id) {
            setIsFetchingBarem(true);
            setApiBarems([]);
            setBaremApiError(null);
            setSelectedTier(null);
            
            try {
              const baremResponse = await medicationService.getMedicationBarem(suggestion.id);
              
              if (baremResponse && baremResponse.barems && baremResponse.barems.length > 0) {
                setApiBarems(baremResponse.barems);
                
                // Auto-fill price from first barem if available
                const firstBarem = baremResponse.barems[0];
                if (firstBarem.birimFiyat > 0) {
                  setValue('price', firstBarem.birimFiyat.toFixed(2).replace('.', ','));
                }
                
                console.log('✅ Barem data fetched:', baremResponse.barems.length, 'tiers');
              } else if (baremResponse?.baremError) {
                setBaremApiError(baremResponse.baremError);
                console.warn('⚠️ Barem API error:', baremResponse.baremError);
              }
            } catch (error) {
              console.error('❌ Failed to fetch barem:', error);
              setBaremApiError('Barem bilgisi çekilemedi');
            } finally {
              setIsFetchingBarem(false);
            }
          }
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
        // warehouseBaremId should be int - alliance tiers use string IDs so we skip them
        warehouseBaremId: selectedTier && typeof selectedTier.id === 'number' ? selectedTier.id : null,
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
      {/* Section: İlaç Bilgileri */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          💊 İlaç Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* İlaç Adı - Geniş */}
          <div className={`${formStyles.formGroup} ${formStyles.autocompleteWrapper} md:col-span-2`}>
            <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">İlaç Adı *</label>
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
                  placeholder="İlaç adı yazarak arayın..."
                  disabled={isEditMode}
                  autoComplete="off"
                  className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              )}
            />
            {errors.productName && (
              <span className="text-xs text-red-500 mt-1">{errors.productName.message as string}</span>
            )}
            {renderAutocompleteList()}
          </div>

          {/* Barkod */}
          <div className={formStyles.formGroup}>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">Barkod</label>
            <input 
              type="text" 
              id="barcode" 
              {...register('barcode')}
              readOnly 
              className="w-full h-11 px-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Barem Tablosu */}
      <div className="mb-6">
        {/* LOADING STATE */}
        {isFetchingBarem && (
          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-600 font-medium">Barem bilgisi yükleniyor...</span>
          </div>
        )}
        
        {/* BAREM API ERROR */}
        {baremApiError && !isFetchingBarem && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
            ⚠️ {baremApiError} - Manuel değer girişi yapabilirsiniz.
          </div>
        )}
        
        {/* TIER SELECTION UI */}
        {!isFetchingBarem && apiBarems.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              📋 Satış Koşulları * <span className="text-red-500 text-xs font-normal">(Barem seçimi zorunludur)</span>
            </label>
            <div className={`overflow-hidden rounded-lg border ${baremError && !selectedTier ? 'border-red-500 border-2' : 'border-gray-200'}`}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Min. Adet</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MF (Mal Fazlası)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Birim Fiyat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {availableTiers.map((tier: any) => (
                    <tr 
                      key={tier.id} 
                      onClick={() => {
                        setSelectedTier(tier);
                        setBaremError(false);
                        setValue('minSaleQuantity', tier.minQuantity.toString());
                        setValue('bonus', tier.mf);
                        if (tier.unitPrice) {
                          setValue('price', tier.unitPrice.toFixed(2).replace('.', ','));
                        }
                        const currentPriceStr = getValues('price');
                        const currentPrice = currentPriceStr ? parseFloat(currentPriceStr.replace(',', '.')) : 0;
                        if (currentPrice > 0 && currentPrice <= tier.unitPrice) {
                          clearErrors('price');
                        }
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedTier?.id === tier.id 
                          ? 'bg-blue-50 border-l-4 border-l-blue-500' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{tier.minQuantity} adet</td>
                      <td className="px-4 py-3 text-gray-600">{tier.mf || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600">{tier.unitPrice?.toFixed(2) || '0.00'} ₺</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {baremError && !selectedTier && (
              <p className="mt-2 text-xs text-red-500">⚠️ Lütfen yukarıdan bir barem seçiniz.</p>
            )}
            {selectedTier && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                <span className="text-sm text-blue-700">
                  ✓ Seçilen: <strong>{selectedTier.minQuantity} adet</strong> | 
                  MF: <strong>{selectedTier.mf || '-'}</strong> | 
                  Fiyat: <strong>{selectedTier.unitPrice?.toFixed(2)} ₺</strong>
                </span>
                <button 
                  type="button" 
                  onClick={() => {
                    setSelectedTier(null);
                    setValue('minSaleQuantity', '0');
                    setValue('bonus', '');
                    setValue('price', '');
                  }}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline"
                >
                  Temizle
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section: Teklif Detayları */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          💰 Teklif Detayları
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Birim Fiyat */}
          <div className={formStyles.formGroup}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Birim Fiyat (₺) *</label>
            <div className="relative">
              <input
                {...register('price', { 
                  validate: (value) => {
                    if (selectedTier && value) {
                      const num = parseFloat(value.replace(',', '.'));
                      if (!isNaN(num) && num > selectedTier.unitPrice) {
                        return `Maksimum ${selectedTier.unitPrice.toFixed(2)} ₺`;
                      }
                    }
                    return true;
                  }
                })}
                type="text"
                placeholder="0,00"
                className={`w-full h-11 px-4 pr-8 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.price || (selectedTier && watch('price') && parseFloat((watch('price') || '0').replace(',', '.')) > selectedTier.unitPrice)
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-300'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
            </div>
            {errors.price && (
              <span className="text-xs text-red-500 mt-1 block">{errors.price.message as string}</span>
            )}
            {/* Prominent price warning */}
            {selectedTier && watch('price') && parseFloat((watch('price') || '0').replace(',', '.')) > selectedTier.unitPrice && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <span>
                  Fiyat <strong>{watch('price')} ₺</strong>, baremin maksimum fiyatından 
                  <strong> ({selectedTier.unitPrice.toFixed(2)} ₺)</strong> yüksek!
                </span>
              </div>
            )}
          </div>

          {/* Stok Miktarı */}
          <div className={formStyles.formGroup}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stok Miktarı *</label>
            <div className="relative">
              <input
                {...register('stock')}
                type="number"
                placeholder="0"
                min="1"
                className={`w-full h-11 px-4 pr-12 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.stock ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">adet</span>
            </div>
            {errors.stock && (
              <span className="text-xs text-red-500 mt-1">{errors.stock.message as string}</span>
            )}
          </div>

          {/* Son Kullanma Tarihi */}
          <div className={formStyles.formGroup}>
            <label htmlFor="expirationDate" className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Son Kullanma Tarihi *
              {isExpiryWarning && (
                <span className="text-amber-600 text-xs">⚠️ Yakın!</span>
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
              className={`w-full h-11 px-4 border rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isExpiryWarning ? 'border-amber-500 bg-amber-50' : 'border-gray-300'
              }`}
            />
            {errors.skt && (
              <span className="text-xs text-red-500 mt-1">{errors.skt.message as string}</span>
            )}
          </div>
        </div>
      </div>

      {/* Section: Eczaneye Özel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="pharmacySpecific"
            checked={isPharmacySpecific}
            onChange={(e) => {
              setIsPharmacySpecific(e.target.checked);
              if (!e.target.checked) setSelectedPharmacyId('');
            }}
            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="pharmacySpecific" className="text-sm font-medium text-gray-900">
            🎯 Eczaneye Özel Teklif
          </label>
        </div>
        
        {isPharmacySpecific && (
          <div className="mt-4 pl-8 animate-fade-in">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Eczane</label>
            <select
              value={selectedPharmacyId}
              onChange={(e) => setSelectedPharmacyId(e.target.value)}
              className="w-full md:w-1/2 h-11 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Eczane seçiniz...</option>
              {otherPharmaciesData.map(p => (
                <option key={p.id} value={p.id}>
                  {p.pharmacyName} ({p.group})
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">Bu teklifi sadece seçilen eczane görebilecektir.</p>
          </div>
        )}
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