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
} from '@/lib/dashboardData';
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
type OfferType = 'standard' | 'campaign' | 'tender';

interface OfferFormProps {
  medication?: MedicationItem;
  onSave: (formData: any) => void;
  isSaving?: boolean;
}

// === ZOD VALIDATION SCHEMA ===
const baseSchema = z.object({
  productName: z.string()
    .min(2, 'İlaç adı en az 2 karakter olmalıdır')
    .nonempty('İlaç adı zorunludur'),
  barcode: z.string().optional(),
  skt: z.string()
    .regex(/^\d{2}\s?\/\s?\d{4}$/, 'Geçerli bir tarih formatı giriniz (MM / YYYY)')
    .nonempty('Son kullanma tarihi zorunludur'),
  price: z.string()
    .refine((val) => {
      const num = parseFloat(val.replace(',', '.'));
      return !isNaN(num) && num > 0;
    }, {
      message: 'Fiyat 0\'dan büyük olmalıdır',
    }),
  stock: z.string()
    .refine((val) => {
      const num = parseInt(val, 10);
      return !isNaN(num) && num > 0;
    }, {
      message: 'Stok 0\'dan büyük olmalıdır',
    }),
  
  // New Fields
  depotPrice: z.string().optional(),
  malFazlasi: z.string()
    .regex(/^(\d+\+\d+)?$/, 'Format "X+Y" olmalıdır (örn: 10+2)')
    .optional(),
  discountPercentage: z.string().optional(),
  maxSaleQuantity: z.string().optional(),
  description: z.string().optional(),

  // Legacy/Other Fields
  bonus: z.string().optional(), // Keeping for backward compat if needed, but MF replaces it visually
  minSaleQuantity: z.string().optional(),
  
  // Optional fields for all types
  campaignStartDate: z.string().optional(),
  campaignEndDate: z.string().optional(),
  campaignBonusMultiplier: z.string().optional(),
  minimumOrderQuantity: z.string().optional(),
  biddingDeadline: z.string().optional(),
  acceptingCounterOffers: z.boolean().optional(),
});

type OfferFormData = z.infer<typeof baseSchema>;

const OfferForm: React.FC<OfferFormProps> = ({ medication, onSave, isSaving }) => {
  
  // === STATE MANAGEMENT ===
  const [offerType, setOfferType] = useState<OfferType>('standard');
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
  const { register, handleSubmit, formState: { errors }, setValue, watch, control, reset } = useForm<OfferFormData>({
    resolver: zodResolver(baseSchema),
    defaultValues: {
      productName: medication?.productName || defaultValues?.productName || '',
      barcode: medication?.barcode || defaultValues?.barcode || '',
      skt: medication?.expirationDate || defaultValues?.expirationDate || '',
      price: medication?.price ? String(medication.price).replace('.', ',') : (defaultValues?.price || ''),
      stock: medication?.stock ? medication.stock.split(' + ')[0] : (defaultValues?.stock || ''),
      bonus: medication?.stock ? medication.stock.split(' + ')[1] : (defaultValues?.bonus || ''),
      
      // New fields defaults
      depotPrice: '',
      malFazlasi: '',
      discountPercentage: '',
      maxSaleQuantity: '',
      description: '',

      minSaleQuantity: '',
      campaignStartDate: '',
      campaignEndDate: '',
      campaignBonusMultiplier: '',
      minimumOrderQuantity: '',
      biddingDeadline: '',
      acceptingCounterOffers: false,
    },
  });

  // Watch fields for calculations
  const watchedDepotPrice = watch('depotPrice');
  const watchedMF = watch('malFazlasi');
  const watchedDiscount = watch('discountPercentage');
  const watchedPrice = watch('price');
  const watchedSkt = watch('skt');

  // Calculated States
  const [netPrice, setNetPrice] = useState<number | null>(null);
  const [effectiveDiscount, setEffectiveDiscount] = useState<number | null>(null);
  const [isExpiryWarning, setIsExpiryWarning] = useState(false);

  // Autocomplete State
  const [productSearchTerm, setProductSearchTerm] = useState(
    medication?.productName || defaultValues?.productName || ''
  );
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<MedicationItem | null>(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // IMask for SKT field
  const { ref: sktRef, setValue: setMaskedSktValue } = useIMask<HTMLInputElement>({
    mask: 'MM / YYYY',
    blocks: {
      MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: true, placeholderChar: '_' },
      YYYY: { mask: IMask.MaskedRange, from: new Date().getFullYear(), to: new Date().getFullYear() + 20, maxLength: 4, placeholderChar: '_' },
    },
    lazy: true,
    overwrite: true,
  });

  // === CALCULATIONS ===
  useEffect(() => {
    // Calculate Net Price
    let calculatedNetPrice = 0;
    const dPrice = parseFloat((watchedDepotPrice || '').replace(',', '.'));
    const price = parseFloat((watchedPrice || '').replace(',', '.'));
    const basePrice = dPrice > 0 ? dPrice : price;

    if (basePrice > 0) {
      if (watchedMF && watchedMF.includes('+')) {
        const [paid, free] = watchedMF.split('+').map(Number);
        if (paid > 0 && free >= 0) {
          calculatedNetPrice = (basePrice * paid) / (paid + free);
        }
      } else if (watchedDiscount) {
        const disc = parseFloat(watchedDiscount.replace(',', '.'));
        if (!isNaN(disc)) {
          calculatedNetPrice = basePrice * (1 - (disc / 100));
        }
      } else {
        calculatedNetPrice = basePrice;
      }
    }

    setNetPrice(calculatedNetPrice > 0 ? calculatedNetPrice : null);

    // Calculate Effective Discount
    if (basePrice > 0 && calculatedNetPrice > 0 && calculatedNetPrice < basePrice) {
      const discount = ((basePrice - calculatedNetPrice) / basePrice) * 100;
      setEffectiveDiscount(discount);
    } else {
      setEffectiveDiscount(null);
    }

  }, [watchedDepotPrice, watchedMF, watchedDiscount, watchedPrice]);

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
        setOfferType('standard');
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
      const value = e.target.value;
      setProductSearchTerm(value);
      setValue('productName', '');
      
      // Clear previous selection
      if (offerType === 'standard') {
          setSelectedInventoryItem(null);
          setValue('barcode', '');
          setValue('skt', '');
          setMaskedSktValue('');
          setValue('price', '');
          setValue('stock', '');
          setValue('bonus', '');
          setValue('depotPrice', '');
          setValue('malFazlasi', '');
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
      if (offerType === 'standard') {
          setProductSearchTerm(suggestion.name);
          setSelectedInventoryItem(null);
          
          setValue('productName', suggestion.name);
          setValue('barcode', suggestion.barcode || '');
          setValue('skt', '');
          setValue('price', '');
          setValue('stock', '');
          setValue('bonus', '');
      } else {
          setProductSearchTerm(suggestion.name);
          setValue('productName', suggestion.name);
      }
      
      setIsAutocompleteOpen(false);
      setSuggestions([]);
  };

  const onSubmit = (data: any) => {
    if (isSaving) return;

    const sktValue = offerType === 'standard' && sktRef.current 
        ? sktRef.current.value 
        : data.skt;

    const dataToSave = {
        offerType,
        productName: data.productName,
        barcode: data.barcode || '',
        expirationDate: sktValue.replace(/ /g, ''),
        price: typeof data.price === 'number' ? data.price : parseFloat(data.price.replace(',', '.')),
        stock: typeof data.stock === 'number' ? data.stock : parseInt(data.stock, 10),
        bonus: parseInt(data.bonus || '0', 10),
        minSaleQuantity: parseInt(data.minSaleQuantity || '1', 10),
        
        // New Fields
        depotPrice: data.depotPrice ? parseFloat(data.depotPrice.replace(',', '.')) : 0,
        malFazlasi: data.malFazlasi,
        discountPercentage: data.discountPercentage ? parseFloat(data.discountPercentage.replace(',', '.')) : 0,
        maxSaleQuantity: data.maxSaleQuantity ? parseInt(data.maxSaleQuantity, 10) : null,
        description: data.description,

        // Campaign
        campaignStartDate: data.campaignStartDate || null,
        campaignEndDate: data.campaignEndDate || null,
        campaignBonusMultiplier: data.campaignBonusMultiplier 
          ? parseFloat(data.campaignBonusMultiplier.replace(',', '.')) 
          : 1,
        
        // Tender
        minimumOrderQuantity: data.minimumOrderQuantity || null,
        biddingDeadline: data.biddingDeadline || null,
        acceptingCounterOffers: data.acceptingCounterOffers || false,
        
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
        className={`${formStyles.tabButton} ${offerType === 'standard' ? formStyles.active : ''}`}
        onClick={() => setOfferType('standard')}
        disabled={isEditMode} >
        Standart Satış
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'campaign' ? formStyles.active : ''}`}
        onClick={() => setOfferType('campaign')}
        disabled={isEditMode} >
        Kampanyalı Satış
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'tender' ? formStyles.active : ''}`}
        onClick={() => setOfferType('tender')}
        disabled={isEditMode} >
        İhaleli Satış
      </button>
    </div>
  );

  const renderCalculationBadge = () => {
    if (!netPrice) return null;

    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 flex items-center justify-between text-emerald-800">
        <div className="flex items-center gap-2">
          {/* <CalculatorIcon className="w-5 h-5" /> */}
          <span className="font-semibold">💰 Hesaplanan Net Maliyet:</span>
          <span className="text-lg font-bold">{netPrice.toFixed(2)} ₺</span>
        </div>
        {effectiveDiscount && (
          <div className="flex items-center gap-1 bg-emerald-100 px-2 py-1 rounded text-sm font-medium">
            {/* <TagIcon className="w-4 h-4" /> */}
            <span>🏷️ %{effectiveDiscount.toFixed(1)} Avantaj</span>
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
          <input
            type="text"
            id="productName"
            value={productSearchTerm}
            onChange={handleProductSearchChange}
            onFocus={() => { if (productSearchTerm.length > 0) setIsAutocompleteOpen(true); }}
            onBlur={() => setTimeout(() => setIsAutocompleteOpen(false), 500)}
            placeholder="İlaç ara..."
            disabled={isEditMode}
            autoComplete="off"
            className="w-full"
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

      {/* Row 2: Financials (Depot Price, MF, Discount, Price) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
        <div className={formStyles.formGroup}>
          <label htmlFor="depotPrice">Depo Fiyatı (₺)</label>
          <input
            type="text" 
            id="depotPrice" 
            {...register('depotPrice')}
            placeholder="0,00"
          />
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="malFazlasi">Mal Fazlası (X+Y)</label>
          <input
            type="text" 
            id="malFazlasi" 
            {...register('malFazlasi')}
            placeholder="10+2"
          />
          {errors.malFazlasi && (
            <span className={formStyles.errorMessage}>{errors.malFazlasi.message as string}</span>
          )}
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="discountPercentage">İskonto (%)</label>
          <input
            type="text" 
            id="discountPercentage" 
            {...register('discountPercentage')}
            placeholder="0"
          />
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="price">Satış Fiyatı (₺) *</label>
          <input
            type="text" 
            id="price" 
            {...register('price')}
            placeholder="0,00"
            className={errors.price ? 'border-red-500' : ''}
          />
          {errors.price && (
            <span className={formStyles.errorMessage}>{errors.price.message as string}</span>
          )}
        </div>
      </div>

      {/* Calculation Badge */}
      {renderCalculationBadge()}

      {/* Row 3: Stock & Expiry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={formStyles.formGroup}>
          <label htmlFor="stock">Stok Adedi *</label>
          <input
            type="text" 
            id="stock" 
            {...register('stock')}
            placeholder="0"
          />
          {errors.stock && (
            <span className={formStyles.errorMessage}>{errors.stock.message as string}</span>
          )}
        </div>

        <div className={formStyles.formGroup}>
          <label htmlFor="maxSaleQuantity">Maks. Satış (Opsiyonel)</label>
          <input
            type="text" 
            id="maxSaleQuantity" 
            {...register('maxSaleQuantity')}
            placeholder="Sınırsız"
          />
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
            ref={sktRef} 
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

      <div className={formStyles.formGroup}>
        <label htmlFor="description">Açıklama (Opsiyonel)</label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Ürün hakkında ek bilgi (örn: Kutu hafif hasarlı)"
          rows={2}
          className="w-full border rounded p-2"
        />
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
    <form onSubmit={handleSubmit(onSubmit)}>
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
          {offerType === 'campaign' && renderCampaignFields()}
          {offerType === 'tender' && renderTenderFields()}
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;