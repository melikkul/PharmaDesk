// src/app/(dashboard)/tekliflerim/OfferForm.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import IMask from 'imask';
import { useIMask } from 'react-imask';
import { useSearchParams } from 'next/navigation';
import { 
  MedicationItem, 
  fullInventoryData,
  allDrugNames
} from '@/lib/dashboardData';
import SettingsCard from '@/components/settings/SettingsCard';
import formStyles from './OfferForm.module.css';
import { medicationService } from '@/services/medicationService';

// Tipler
type OfferType = 'standard' | 'campaign' | 'tender';

interface OfferFormProps {
  medication?: MedicationItem; // Düzenleme modu için
  onSave: (formData: any) => void;
  isSaving?: boolean;
}

type FormData = {
  productName: string;
  barcode: string;
  skt: string;
  price: string;
  stock: string;
  bonus: string;
  minSaleQuantity: string;
  
  // Campaign
  campaignStartDate: string;
  campaignEndDate: string;
  campaignBonusMultiplier: string;
  
  // Tender
  minimumOrderQuantity: string;
  biddingDeadline: string;
  acceptingCounterOffers: boolean;
};

const OfferForm: React.FC<OfferFormProps> = ({ medication, onSave, isSaving }) => {
  
  // === 1. STATE YÖNETİMİ ===
  
  const [offerType, setOfferType] = useState<OfferType>('standard');
  const isEditMode = !!medication;
  const searchParams = useSearchParams();
  
  const defaultValues = useMemo(() => ({
    productName: searchParams.get('isim') || '',
    barcode: searchParams.get('barkod') || '',
    stock: searchParams.get('stok') || '',
    bonus: searchParams.get('mf') || '0',
    price: (searchParams.get('maliyet') || '0').replace('.', ','), 
    expirationDate: searchParams.get('skt') || '',
  }), [searchParams]);

  const [formData, setFormData] = useState<FormData>({
    productName: medication?.productName || defaultValues?.productName || '',
    barcode: medication?.barcode || defaultValues?.barcode || '',
    skt: medication?.expirationDate || defaultValues?.expirationDate || '',
    price: medication?.price ? String(medication.price).replace('.', ',') : (defaultValues?.price || ''),
    stock: medication?.stock ? medication.stock.split(' + ')[0] : (defaultValues?.stock || ''),
    bonus: medication?.stock ? medication.stock.split(' + ')[1] : (defaultValues?.bonus || ''),
    minSaleQuantity: '1',
    
    campaignStartDate: '',
    campaignEndDate: '',
    campaignBonusMultiplier: '1',
    
    minimumOrderQuantity: '',
    biddingDeadline: '',
    acceptingCounterOffers: false,
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

  const { ref: sktRef, setValue: setMaskedSktValue } = useIMask<HTMLInputElement>({
    mask: 'MM / YYYY',
    blocks: {
      MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: true, placeholderChar: '_' },
      YYYY: { mask: IMask.MaskedRange, from: new Date().getFullYear(), to: new Date().getFullYear() + 20, maxLength: 4, placeholderChar: '_' },
    },
    lazy: true,
    overwrite: true,
  });

  // === 2. EFFECT'LER ===

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

  // === 3. EVENT HANDLER'LAR ===

  const handleInputChange = useCallback((field: keyof FormData, value: string | number | boolean | null) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (['price', 'campaignBonusMultiplier'].includes(field)) {
        let val = String(value).replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) val = `${parts[0]},${parts[1]}`;
        (newState as any)[field] = val;
      }
      if (['stock', 'bonus', 'minSaleQuantity', 'minimumOrderQuantity'].includes(field)) {
        (newState as any)[field] = String(value).replace(/[^0-9]/g, '');
      }
      return newState;
    });
  }, []);

  const handleProductSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setProductSearchTerm(value);
      setFormData(prev => ({ ...prev, productName: '' }));
      
      // Clear previous selection
      if (offerType === 'standard') {
          setSelectedInventoryItem(null);
          handleInputChange('barcode', '');
          handleInputChange('skt', '');
          setMaskedSktValue('');
          handleInputChange('price', '0,00');
          handleInputChange('stock', '0');
          handleInputChange('bonus', '0');
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

      // Set loading state immediately
      setIsSearching(true);

      // Start new 2-second debounce timer
      const timer = setTimeout(async () => {
          try {
              const medications: any = await medicationService.searchMedications(value, 10);
              
              if (offerType === 'standard') {
                  // For standard offers, also check inventory
                  setSuggestions(medications);
              } else {
                  // For campaign/tender, just show medication names
                  setSuggestions(medications);
              }
              
              setIsAutocompleteOpen(medications.length > 0);
          } catch (error) {
              console.error('Medication search error:', error);
              setSuggestions([]);
              setIsAutocompleteOpen(false);
          } finally {
              setIsSearching(false);
          }
      }, 1000); // 1-second debounce

      setSearchDebounceTimer(timer);
  };

  const handleSelectSuggestion = (suggestion: any) => {
      if (offerType === 'standard') {
          // API returns: {id, name, barcode, manufacturer, packageType}
          setProductSearchTerm(suggestion.name);
          setSelectedInventoryItem(null); // We don't have full inventory data from search
          
          setFormData(prev => ({
              ...prev,
              productName: suggestion.name,
              barcode: suggestion.barcode || '',
              skt: '', // Will be filled manually
              price: '0,00',
              stock: '0',
              bonus: '0',
          }));
          
      } else {
          // For campaign/tender, just set the name
          setProductSearchTerm(suggestion.name);
          setFormData(prev => ({ ...prev, productName: suggestion.name }));
      }
      
      setIsAutocompleteOpen(false);
      setSuggestions([]);
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    // Validation
    if (!formData.productName) {
        alert("Lütfen bir ilaç seçin."); return;
    }
    
    const price = parseFloat(formData.price.replace(',', '.')) || 0;
    if (price <= 0) {
        alert("Lütfen geçerli bir fiyat girin."); return;
    }

    const stock = parseInt(formData.stock, 10) || 0;
    if (stock <= 0) {
        alert("Lütfen geçerli bir stok adedi girin."); return;
    }

    // Get SKT from ref (for standard) or formData (for others)
    const sktValue = offerType === 'standard' && sktRef.current 
        ? sktRef.current.value 
        : formData.skt;

    // Type specific validation
    if (offerType === 'campaign') {
        if (!formData.campaignStartDate || !formData.campaignEndDate) {
            alert("Kampanya başlangıç ve bitiş tarihlerini giriniz."); return;
        }
    } else if (offerType === 'tender') {
        if (!formData.minimumOrderQuantity || !formData.biddingDeadline) {
            alert("İhale için minimum sipariş miktarı ve son teklif tarihini giriniz."); return;
        }
    }

    const dataToSave = {
        offerType,
        productName: formData.productName,
        barcode: formData.barcode,
        expirationDate: sktValue.replace(/ /g, ''),
        price,
        stock,
        bonus: parseInt(formData.bonus, 10) || 0,
        minSaleQuantity: parseInt(formData.minSaleQuantity, 10) || 1,
        
        // Campaign
        campaignStartDate: formData.campaignStartDate || null,
        campaignEndDate: formData.campaignEndDate || null,
        campaignBonusMultiplier: parseFloat(formData.campaignBonusMultiplier.replace(',', '.')) || 1,
        
        // Tender
        minimumOrderQuantity: parseInt(formData.minimumOrderQuantity, 10) || null,
        biddingDeadline: formData.biddingDeadline || null,
        acceptingCounterOffers: formData.acceptingCounterOffers,
        
        ...(isEditMode && { id: medication.id }),
    };

    console.log('Form Data to Save:', dataToSave); // Debug log
    onSave(dataToSave);
  }, [formData, offerType, isSaving, onSave, isEditMode, medication, sktRef]);

  // === 4. RENDER FONKSİYONLARI ===

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
          required
          disabled={isEditMode}
          autoComplete="off"
        />
        {renderAutocompleteList()}
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="barcode">Barkod</label>
        <input type="text" id="barcode" value={formData.barcode} readOnly style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }} />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="expirationDate">Son Kullanma Tarihi (AA / YYYY) *</label>
        <input 
          ref={sktRef} 
          type="text" 
          id="expirationDate" 
          required 
          placeholder="Örn: 12 / 2025"
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="price">Birim Fiyat (₺) *</label>
        <input
          type="text" id="price" value={formData.price}
          onChange={(e) => handleInputChange('price', e.target.value)}
          required placeholder="0,00"
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="stock">Stok Adedi *</label>
        <input
          type="text" id="stock" value={formData.stock}
          onChange={(e) => handleInputChange('stock', e.target.value)}
          required placeholder="0"
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="bonus">Mal Fazlası (MF)</label>
        <input
          type="text" id="bonus" value={formData.bonus}
          onChange={(e) => handleInputChange('bonus', e.target.value)}
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
          type="date" id="campaignStartDate" value={formData.campaignStartDate}
          onChange={(e) => handleInputChange('campaignStartDate', e.target.value)}
          required
        />
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="campaignEndDate">Kampanya Bitiş *</label>
        <input
          type="date" id="campaignEndDate" value={formData.campaignEndDate}
          onChange={(e) => handleInputChange('campaignEndDate', e.target.value)}
          required
        />
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="campaignBonusMultiplier">MF Çarpanı</label>
        <input
          type="text" id="campaignBonusMultiplier" value={formData.campaignBonusMultiplier}
          onChange={(e) => handleInputChange('campaignBonusMultiplier', e.target.value)}
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
          type="text" id="minimumOrderQuantity" value={formData.minimumOrderQuantity}
          onChange={(e) => handleInputChange('minimumOrderQuantity', e.target.value)}
          required placeholder="100"
        />
      </div>
      <div className={formStyles.formGroup}>
        <label htmlFor="biddingDeadline">Son Teklif Tarihi *</label>
        <input
          type="date" id="biddingDeadline" value={formData.biddingDeadline}
          onChange={(e) => handleInputChange('biddingDeadline', e.target.value)}
          required
        />
      </div>
      <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
        <div className={formStyles.checkboxWrapper}>
          <input type="checkbox" id="acceptingCounterOffers"
            checked={formData.acceptingCounterOffers}
            onChange={(e) => handleInputChange('acceptingCounterOffers', e.target.checked)} />
          <label htmlFor="acceptingCounterOffers">Karşı Teklifleri Kabul Et</label>
        </div>
      </div>
    </>
  );

  return (
    <form onSubmit={handleSubmit}>
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