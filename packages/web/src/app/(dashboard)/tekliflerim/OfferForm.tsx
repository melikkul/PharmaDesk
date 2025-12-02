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
  allDrugNames
} from '@/lib/dashboardData';
import SettingsCard from '@/components/settings/SettingsCard';
import formStyles from './OfferForm.module.css';
import { medicationService } from '@/services/medicationService';

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
  bonus: z.string().optional(),
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
      minSaleQuantity: '',
      campaignStartDate: '',
      campaignEndDate: '',
      campaignBonusMultiplier: '',
      minimumOrderQuantity: '',
      biddingDeadline: '',
      acceptingCounterOffers: false,
    },
  });

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
      }

      // Clear previous debounce timer
      if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
      }

      if (value.length < 2) {
          setIsAutocompleteOpen(false);
          setSuggestions([]);
          setIsSearching(false);
          return;
      }

      setIsSearching(true);

      // Start new 1-second debounce timer
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

    // Get SKT from ref (for standard) or data (for others)
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

  const renderCommonFields = () => (
    <>
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

      <div className={formStyles.formGroup}>
        <label htmlFor="expirationDate">Son Kullanma Tarihi (AA / YYYY) *</label>
        <input 
          ref={sktRef} 
          type="text" 
          id="expirationDate" 
          placeholder="Örn: 12 / 2025"
        />
        {errors.skt && (
          <span className={formStyles.errorMessage}>{errors.skt.message as string}</span>
        )}
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="price">Birim Fiyat (₺) *</label>
        <input
          type="text" 
          id="price" 
          {...register('price')}
          placeholder="0,00"
        />
        {errors.price && (
          <span className={formStyles.errorMessage}>{errors.price.message as string}</span>
        )}
      </div>

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
        <label htmlFor="bonus">Mal Fazlası (MF)</label>
        <input
          type="text" 
          id="bonus" 
          {...register('bonus')}
          placeholder="0"
        />
      </div>
    </>
  );

  const renderCampaignFields = () => (
    <>
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
        <small className={formStyles.subtleText}>Örn: 2 yazarsanız, MF 2 katına çıkar.</small>
      </div>
    </>
  );

  const renderTenderFields = () => (
    <>
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
    </>
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

        <div className={formStyles.formGrid}>
          {renderCommonFields()}
          {offerType === 'campaign' && renderCampaignFields()}
          {offerType === 'tender' && renderTenderFields()}
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;