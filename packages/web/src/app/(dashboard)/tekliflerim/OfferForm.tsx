// src/app/(dashboard)/tekliflerim/OfferForm.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useIMask } from 'react-imask';
import { useSearchParams } from 'next/navigation';
import { 
  MedicationItem, 
  WarehouseBarem, 
  warehouseBaremsData,
  fullInventoryData,   // YENİ: Kendi envanterimiz
  allDrugNames          // YENİ: Tüm ilaç listesi
} from '@/data/dashboardData';
import SettingsCard from '@/components/settings/SettingsCard';
import formStyles from './OfferForm.module.css';

// Tipler
type OfferType = 'stock' | 'group-buy' | 'group-request';

interface OfferFormProps {
  medication?: MedicationItem; // Düzenleme modu için
  onSave: (formData: any) => void;
  isSaving?: boolean;
}

type FormData = {
  productName: string;
  barcode: string;
  skt: string;
  stockPrice: string;
  stockQuantity: string;
  stockBonus: string;
  isPrivate: boolean;
  privatePharmacyGln: string;
  selectedBaremId: string | null;
  baremMultiplier: number;
  myQuantity: string; 
  isCustomBarem: boolean;
  customBaremQuantity: string;
  customBaremBonus: string;
  customBaremNetPrice: string;
  groupRequestQuantity: string; 
};

// İlaç arama simülasyonu
const searchDrugWarehouseData = (productName: string): { barems: WarehouseBarem[], basePrice: number } => {
  if (!productName) return { barems: [], basePrice: 0 };
  // Sadece tam eşleşmede baremleri getir (isteğe göre)
  const lowerName = productName.toLowerCase();
  const barems = warehouseBaremsData.filter(b => b.productName.toLowerCase() === lowerName);
  const basePrice = barems.length > 0 ? barems[0].basePrice : 0;
  return { barems, basePrice };
};


const OfferForm: React.FC<OfferFormProps> = ({ medication, onSave, isSaving }) => {
  
  // === 1. STATE YÖNETİMİ ===
  
  const [offerType, setOfferType] = useState<OfferType>('stock');
  const isEditMode = !!medication;
  const searchParams = useSearchParams();
  
  // URL'den gelen (Envanterim -> Teklif Ver)
  const defaultValues = useMemo(() => ({
    productName: searchParams.get('isim') || '',
    barcode: searchParams.get('barkod') || '',
    stock: searchParams.get('stok') || '',
    bonus: searchParams.get('mf') || '0',
    price: (searchParams.get('maliyet') || '0').replace('.', ','), 
    expirationDate: searchParams.get('skt') || '',
  }), [searchParams]);

  // Tüm form verilerini tutan ana state
  const [formData, setFormData] = useState<FormData>({
    productName: medication?.productName || defaultValues?.productName || '',
    barcode: medication?.barcode || defaultValues?.barcode || '',
    skt: medication?.expirationDate || defaultValues?.expirationDate || '',
    stockPrice: (medication?.price ? String(medication.price).replace('.', ',') : defaultValues?.price) || '',
    stockQuantity: (medication?.stock.split(' + ')[0] || defaultValues?.stock) || '',
    stockBonus: (medication?.stock.split(' + ')[1] || defaultValues?.bonus) || '0',
    isPrivate: false,
    privatePharmacyGln: '',
    selectedBaremId: null,
    baremMultiplier: 1,
    myQuantity: '',
    isCustomBarem: false,
    customBaremQuantity: '',
    customBaremBonus: '',
    customBaremNetPrice: '',
    groupRequestQuantity: '', 
  });

  // --- YENİ AUTOCOMPLETE STATE'LERİ ---
  // Input'a yazılan ham metin
  const [productSearchTerm, setProductSearchTerm] = useState(
    medication?.productName || defaultValues?.productName || ''
  );
  // Öneri listesi (string[] veya MedicationItem[])
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  // Stok modunda seçilen envanter öğesi (Doğrulama için)
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<MedicationItem | null>(null);
  // Bir ilaç seçildi mi? (Barem yüklemeyi tetiklemek için)
  const [isProductLocked, setIsProductLocked] = useState(false);
  // --- YENİ STATE'LER SONU ---

  const [baremOptions, setBaremOptions] = useState<WarehouseBarem[]>([]);
  const [basePrice, setBasePrice] = useState<number>(0);

  const { ref: sktRef, setValue: setMaskedSktValue } = useIMask<HTMLInputElement>({
    mask: 'MM / YYYY', blocks: {
      MM: { mask: IMask.MaskedRange, from: 1, to: 12, maxLength: 2, autofix: true, placeholderChar: '_' },
      YYYY: { mask: IMask.MaskedRange, from: new Date().getFullYear(), to: new Date().getFullYear() + 20, maxLength: 4, placeholderChar: '_' },
    }, lazy: true, overwrite: true,
    onAccept: (value) => handleInputChange('skt', value as string),
  });

  // === 2. EFFECT'LER ===

  // Düzenleme veya Envanter'den gelme modunda state'leri ayarla
  useEffect(() => {
    let initialItem: MedicationItem | null | undefined = null;

    if (isEditMode) {
        initialItem = medication;
    } else if (defaultValues.productName) {
        // Envanterden gelme durumunda, tam öğeyi envanter listesinden bul
        initialItem = fullInventoryData.find(i => i.barcode === defaultValues.barcode);
    }

    if (initialItem) {
        setOfferType('stock');
        setProductSearchTerm(initialItem.productName);
        setSelectedInventoryItem(initialItem);
        setIsProductLocked(true); // Ürünü kilitle
        
        // SKT maskesini ayarla
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


  // YENİ: Barem listesini SADECE ürün kilitlendiğinde (seçildiğinde) yükle
  useEffect(() => {
    if ((offerType === 'group-buy' || offerType === 'group-request') && isProductLocked && formData.productName) {
        // İstek: Sadece tam isim yazıldığında baremler açılsın -> (isProductLocked)
        const { barems, basePrice } = searchDrugWarehouseData(formData.productName);
        setBaremOptions(barems);
        setBasePrice(basePrice);
        setFormData(prev => ({ ...prev, selectedBaremId: null }));
    } else if (!isProductLocked) {
        setBaremOptions([]); // Kullanıcı yeni bir şey yazıyorsa baremleri temizle
    }
  }, [formData.productName, offerType, isProductLocked]); // Kilitli state'e ve geçerli productName'e bağlı


  // === 3. HESAPLAMALAR (useMemo) ===

  const selectedBarem = useMemo(() => {
    if (formData.isCustomBarem) {
      const qty = parseInt(formData.customBaremQuantity, 10) || 0;
      const bonus = parseInt(formData.customBaremBonus, 10) || 0;
      const netPrice = parseFloat(formData.customBaremNetPrice.replace(',', '.')) || 0;
      return {
        id: 'custom', warehouseName: 'Özel Barem', productName: formData.productName,
        basePrice: basePrice, quantity: qty, bonus: bonus, netPrice: netPrice,
        profitPercentage: basePrice > 0 ? ((basePrice - netPrice) / basePrice) * 100 : 0,
      };
    }
    return baremOptions.find(b => b.id === formData.selectedBaremId) || null;
  }, [formData.isCustomBarem, formData.customBaremQuantity, formData.customBaremBonus, formData.customBaremNetPrice, formData.selectedBaremId, baremOptions, basePrice, formData.productName]);

  const groupBuyTotals = useMemo(() => {
    if (offerType !== 'group-buy' || !selectedBarem) {
      return { totalQuantity: 0, totalBonus: 0, totalPool: 0, totalCost: 0, myQuantity: 0, remainingQuantity: 0 };
    }
    const multiplier = formData.baremMultiplier > 0 ? formData.baremMultiplier : 1;
    const totalQuantity = selectedBarem.quantity * multiplier; 
    const totalBonus = selectedBarem.bonus * multiplier; 
    const totalPool = totalQuantity + totalBonus; 
    const myQuantity = Math.max(0, parseInt(formData.myQuantity, 10) || 0); 
    const validMyQuantity = Math.min(myQuantity, totalPool);
    const remainingQuantity = totalPool - validMyQuantity; 
    const totalCost = totalQuantity * selectedBarem.netPrice;
    return { totalQuantity, totalBonus, totalPool, totalCost, myQuantity: validMyQuantity, remainingQuantity };
  }, [offerType, selectedBarem, formData.baremMultiplier, formData.myQuantity]);


  // === 4. EVENT HANDLER'LAR (useCallback) ===

  // Genel form input değişikliği
  const handleInputChange = useCallback((field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => {
      const newState = { ...prev, [field]: value };
      if (field === 'stockPrice' || field === 'customBaremNetPrice') {
        let val = String(value).replace(/[^0-9,]/g, '');
        const parts = val.split(',');
        if (parts.length > 2) val = `${parts[0]},${parts[1]}`;
        newState[field] = val;
      }
      if (field === 'stockQuantity' || field === 'stockBonus' || field === 'privatePharmacyGln' || 
          field === 'myQuantity' || field === 'customBaremQuantity' || field === 'customBaremBonus' ||
          field === 'groupRequestQuantity' ) {
        newState[field] = String(value).replace(/[^0-9]/g, '');
      }
      if (field === 'baremMultiplier') {
        const num = parseInt(String(value), 10);
        newState[field] = num > 0 ? num : 1;
      }
      if (field === 'isCustomBarem' && value === true) {
        newState.selectedBaremId = null;
      }
      return newState;
    });
  }, []);

  // YENİ: İlaç Adı input'u değiştikçe
  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setProductSearchTerm(value);
      
      // Doğrulamayı ve seçimi temizle
      setIsProductLocked(false);
      setFormData(prev => ({ ...prev, productName: '' })); // Geçerli adı temizle
      
      if (offerType === 'stock') {
          setSelectedInventoryItem(null);
          // 'Stoktan' modundaysa, otomatik dolan alanları temizle
          handleInputChange('barcode', '');
          handleInputChange('skt', '');
          setMaskedSktValue(''); // Maskeyi de temizle
          handleInputChange('stockPrice', '0,00');
          handleInputChange('stockQuantity', '0');
          handleInputChange('stockBonus', '0');
      }

      if (value.length < 1) { // Arama yapmayacak kadar kısaysa
          setIsAutocompleteOpen(false);
          setSuggestions([]);
          return;
      }

      let newSuggestions: any[] = [];
      if (offerType === 'stock') {
          // R1: Sadece kendi envanterinde ara
          newSuggestions = fullInventoryData.filter(item => 
              item.productName.toLowerCase().includes(value.toLowerCase()) ||
              item.barcode?.includes(value)
          );
      } else { 
          // R2: Tüm ilaç listesinde ara
          newSuggestions = allDrugNames.filter(name => 
              name.toLowerCase().includes(value.toLowerCase())
          );
      }
      setSuggestions(newSuggestions);
      setIsAutocompleteOpen(true);
  };

  // YENİ: Öneri listesinden bir ilaç seçildiğinde
  const handleSelectSuggestion = (suggestion: any) => {
      if (offerType === 'stock') {
          const item = suggestion as MedicationItem;
          setProductSearchTerm(item.productName);
          setSelectedInventoryItem(item); // Doğrulama için seçili öğeyi sakla
          
          const [stock, bonus] = item.stock.split(' + ');
          // Fiyatı, maliyet fiyatı olarak ayarla
          const cost = String(item.costPrice || '0').replace('.', ',');

          // Form verilerini otomatik doldur
          setFormData(prev => ({
              ...prev,
              productName: item.productName, // Geçerli adı ayarla
              barcode: item.barcode || '',
              skt: item.expirationDate,
              stockPrice: cost,
              stockQuantity: stock || '0',
              stockBonus: bonus || '0',
          }));
          
          // SKT Maskesini ayarla
          const skt = item.expirationDate;
          if (skt) {
              const parts = skt.split('/');
              if (parts.length === 2) {
                  const year = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
                  const month = parts[0].padStart(2, '0');
                  setMaskedSktValue(`${month} / ${year}`);
              }
          }

      } else { // 'group-buy' or 'group-request'
          const name = suggestion as string;
          setProductSearchTerm(name);
          setFormData(prev => ({
              ...prev,
              productName: name // Geçerli adı ayarla
          }));
      }
      
      setIsProductLocked(true); // Ürün seçildi, baremler yüklenebilir/doğrulama yapılabilir
      setIsAutocompleteOpen(false);
      setSuggestions([]);
  };


  const handleSelectBarem = useCallback((baremId: string) => {
    handleInputChange('selectedBaremId', baremId);
    handleInputChange('isCustomBarem', false); 
  }, [handleInputChange]);

  // Form gönderme
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    let dataToSave: any = { offerType };
    
    // --- Tip 1: Stoktan Teklif (GÜNCELLENDİ) ---
    if (offerType === 'stock') {
        
      // R1 DOĞRULAMASI: Envanterden bir öğe seçilmiş olmalı
      if (!selectedInventoryItem || formData.productName !== selectedInventoryItem.productName) {
          alert("Stoktan teklif vermek için lütfen envanterinizden geçerli bir ilaç seçin.");
          return;
      }
      
      // R1 MİKTAR DOĞRULAMASI
      const submittedQty = parseInt(formData.stockQuantity, 10) || 0;
      const inventoryQty = parseInt(selectedInventoryItem.stock.split(' + ')[0], 10) || 0;
      if (submittedQty > inventoryQty) {
          alert(`Stok adedi (${submittedQty}), envanterinizdeki miktarı (${inventoryQty}) aşamaz.`);
          return;
      }
      
      const submittedBonus = parseInt(formData.stockBonus, 10) || 0;
      const inventoryBonus = parseInt(selectedInventoryItem.stock.split(' + ')[1] || '0', 10) || 0;
      if (submittedBonus > inventoryBonus) {
          alert(`Mal fazlası (${submittedBonus}), envanterinizdeki miktarı (${inventoryBonus}) aşamaz.`);
          return;
      }

      const priceAsNumber = parseFloat(formData.stockPrice.replace(',', '.')) || 0;
      if (priceAsNumber <= 0) {
        alert("Lütfen geçerli bir Birim Fiyatı girin."); return;
      }
      if (!formData.skt || formData.skt.includes('_')) {
        alert("Lütfen geçerli bir Son Kullanma Tarihi girin."); return;
      }

      dataToSave = {
        ...dataToSave,
        productName: formData.productName,
        barcode: formData.barcode,
        expirationDate: formData.skt.replace(/ /g, ''),
        price: priceAsNumber,
        stock: submittedQty, // Kullanıcının girdiği adet
        bonus: submittedBonus, // Kullanıcının girdiği MF
        isPrivate: formData.isPrivate,
        privatePharmacyGln: formData.isPrivate ? formData.privatePharmacyGln : null,
        ...(isEditMode && { id: medication.id }), 
      };
    }

    // --- Tip 2: Ortak Alım (GÜNCELLENDİ) ---
    else if (offerType === 'group-buy') {
      // R2 DOĞRULAMASI: Listeden bir ilaç seçilmiş olmalı
      if (!isProductLocked || !formData.productName) {
          alert("Lütfen listeden geçerli bir ilaç seçin."); return;
      }
      if (!selectedBarem) {
        alert("Lütfen bir depo baremi seçin veya özel barem girin."); return;
      }
      if (selectedBarem.netPrice > selectedBarem.basePrice && selectedBarem.basePrice > 0) {
        alert(`Birim Net Fiyat (${selectedBarem.netPrice} ₺), ilacın tekil depo fiyatından (${selectedBarem.basePrice} ₺) yüksek olamaz.`);
        return;
      }
      if (groupBuyTotals.myQuantity <= 0) {
        alert("Lütfen alacağınız adedi girin."); return;
      }
      if (groupBuyTotals.remainingQuantity < 0) {
        alert("Alacağınız adet, toplam adetten fazla olamaz."); return;
      }

      dataToSave = {
        ...dataToSave,
        productName: formData.productName,
        barem: selectedBarem, 
        multiplier: formData.baremMultiplier,
        totalQuantity: groupBuyTotals.totalQuantity,
        totalBonus: groupBuyTotals.totalBonus,
        totalPool: groupBuyTotals.totalPool,
        totalCost: groupBuyTotals.totalCost,
        myQuantity: groupBuyTotals.myQuantity,
        remainingQuantity: groupBuyTotals.remainingQuantity,
      };
    }

    // --- Tip 3: Talep Aç (GÜNCELLENDİ) ---
    else if (offerType === 'group-request') {
      // R2 DOĞRULAMASI: Listeden bir ilaç seçilmiş olmalı
      if (!isProductLocked || !formData.productName) {
          alert("Lütfen listeden geçerli bir ilaç seçin."); return;
      }
      
      const neededQty = parseInt(formData.groupRequestQuantity, 10) || 0;
      if (formData.selectedBaremId && neededQty <= 0) {
          alert("Lütfen bu barem için kaç adete ihtiyacınız olduğunu girin.");
          return;
      }

      dataToSave = {
        ...dataToSave,
        productName: formData.productName,
        selectedBaremId: formData.selectedBaremId,
        neededQuantity: formData.selectedBaremId ? neededQty : null, 
        note: "Başkası bu ilaçtan alırsa ben de katılmak istiyorum.",
      };
    }

    onSave(dataToSave);

  }, [formData, offerType, isSaving, onSave, isEditMode, medication, selectedBarem, groupBuyTotals, 
      selectedInventoryItem, isProductLocked]); // YENİ bağımlılıklar


  // === 5. RENDER FONKSİYONLARI ===

  // YENİ: Otomatik tamamlama listesini render et
  const renderAutocompleteDropdown = () => {
      if (!isAutocompleteOpen || suggestions.length === 0) return null;

      return (
          <div className={formStyles.autocompleteList}>
              {suggestions.map((suggestion, index) => {
                  if (offerType === 'stock') {
                      const item = suggestion as MedicationItem;
                      return (
                          <div 
                              key={item.id} 
                              className={formStyles.autocompleteItem}
                              // onBlur'dan önce çalışması için onMouseDown
                              onMouseDown={() => handleSelectSuggestion(item)} 
                          >
                              {item.productName}
                              <small>Stok: {item.stock} | SKT: {item.expirationDate} | Maliyet: {item.costPrice?.toFixed(2)} ₺</small>
                          </div>
                      );
                  } else {
                      const name = suggestion as string;
                      return (
                          <div 
                              key={index} 
                              className={formStyles.autocompleteItem}
                              onMouseDown={() => handleSelectSuggestion(name)}
                          >
                              {name}
                          </div>
                      );
                  }
              })}
          </div>
      );
  };


  const renderTabs = () => (
    <div className={formStyles.tabContainer}>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'stock' ? formStyles.active : ''}`}
        onClick={() => setOfferType('stock')}
        disabled={isEditMode || !!defaultValues.productName} >
        Stoktan Teklif Ver
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'group-buy' ? formStyles.active : ''}`}
        onClick={() => setOfferType('group-buy')}
        disabled={isEditMode || !!defaultValues.productName} >
        Ortak Alım Başlat
      </button>
      <button type="button" 
        className={`${formStyles.tabButton} ${offerType === 'group-request' ? formStyles.active : ''}`}
        onClick={() => setOfferType('group-request')}
        disabled={isEditMode || !!defaultValues.productName} >
        Talep Aç (Katılımcı Ol)
      </button>
    </div>
  );

  // Tip 1: Stoktan Teklif Formu (GÜNCELLENDİ)
  const renderStockForm = () => (
    <>
      {/* YENİ: İlaç Adı alanı artık wrapper içinde */}
      <div className={`${formStyles.formGroup} ${formStyles.autocompleteWrapper}`}>
        <label htmlFor="productName">İlaç Adı *</label>
        <input
          type="text"
          id="productName"
          value={productSearchTerm} // Ham arama metnini göster
          onChange={handleProductSearchChange} // Arama fonksiyonunu tetikle
          onFocus={() => { if (productSearchTerm.length > 0 && !isProductLocked) setIsAutocompleteOpen(true); }}
          onBlur={() => setTimeout(() => setIsAutocompleteOpen(false), 200)} // Tıklamaya izin ver
          placeholder="Envanterinizden bir ilaç arayın (Barkod veya Ad)"
          required
          disabled={isEditMode || !!defaultValues.productName} // Düzenleme modunda kilitli
          autoComplete="off"
        />
        {/* Autocomplete listesini burada render et */}
        {renderAutocompleteDropdown()}
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="barcode">Barkod</label>
        <input
          type="text"
          id="barcode"
          value={formData.barcode}
          placeholder="İlaç seçince dolar"
          disabled={true} // Kilitli: Otomatik dolar
          readOnly
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="expirationDate">Son Kullanma Tarihi (AA / YYYY) *</label>
        <input
          ref={sktRef}
          type="text"
          id="expirationDate"
          placeholder="İlaç seçince dolar"
          required
          disabled={true} // Kilitli: Otomatik dolar
          readOnly
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="stockPrice">Birim Satış Fiyatı (₺) *</label>
        <input
          type="text"
          id="stockPrice"
          value={formData.stockPrice}
          onChange={(e) => handleInputChange('stockPrice', e.target.value)}
          inputMode="decimal"
          required
          placeholder="0,00"
          // Kilit AÇIK: Kullanıcı fiyatı değiştirebilir
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="stockQuantity">Satılacak Stok (Adet) *</label>
        <input
          type="text"
          id="stockQuantity"
          value={formData.stockQuantity}
          onChange={(e) => handleInputChange('stockQuantity', e.target.value)}
          inputMode="numeric"
          min="0"
          required
          placeholder="Örn: 10"
          // Kilit AÇIK: Kullanıcı miktarı değiştirebilir
        />
      </div>

      <div className={formStyles.formGroup}>
        <label htmlFor="stockBonus">Satılacak Mal Fazlası (MF)</label>
        <input
          type="text"
          id="stockBonus"
          value={formData.stockBonus}
          onChange={(e) => handleInputChange('stockBonus', e.target.value)}
          inputMode="numeric"
          min="0"
          required
          placeholder="Örn: 1"
          // Kilit AÇIK: Kullanıcı miktarı değiştirebilir
        />
      </div>
      
      {/* ... Kalan 'Stoktan' formu ... (isPrivate vs.) */}
      <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
        <div className={formStyles.checkboxWrapper}>
          <input type="checkbox" id="isPrivate"
            checked={formData.isPrivate}
            onChange={(e) => handleInputChange('isPrivate', e.target.checked)} />
          <label htmlFor="isPrivate">Eczaneye Özel</label>
        </div>
        <p className={formStyles.subtleText}>
          İşaretlerseniz, bu teklif sadece aşağıda GLN'sini girdiğiniz eczane tarafından görülebilir ve satın alınabilir.
        </p>
      </div>
      {formData.isPrivate && (
        <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
          <label htmlFor="privatePharmacyGln">Özel Teklif Yapılacak Eczane GLN *</label>
          <input
            type="text" id="privatePharmacyGln"
            value={formData.privatePharmacyGln}
            onChange={(e) => handleInputChange('privatePharmacyGln', e.target.value)}
            inputMode="numeric"
            placeholder="Hedef eczanenin GLN numarasını girin"
            required={formData.isPrivate} />
        </div>
      )}
    </>
  );

  const renderBaremTable = () => (
    <div className={formStyles.baremTableWrapper}>
      <table className={formStyles.baremTable}>
        <thead>
          <tr>
            <th>Depo</th>
            <th className={formStyles.textRight}>Adet</th>
            <th className={formStyles.textRight}>MF</th>
            <th className={formStyles.textRight}>Net Fiyat</th>
            <th className={formStyles.textRight}>Kârlılık</th>
          </tr>
        </thead>
        <tbody>
          {/* GÜNCELLEME: Baremlerin yüklenmesi için 'isProductLocked' kontrolü */}
          {!isProductLocked || !formData.productName ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>
                Lütfen listeden tam bir ilaç adı seçin.
              </td>
            </tr>
          ) : baremOptions.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>
                Bu ilaç için depo baremi bulunamadı.
              </td>
            </tr>
          ) : (
            baremOptions.map(barem => (
              <tr 
                key={barem.id} 
                onClick={() => handleSelectBarem(barem.id)}
                className={formData.selectedBaremId === barem.id ? formStyles.selected : ''}
              >
                <td className={formStyles.fontBold}>{barem.warehouseName}</td>
                <td className={formStyles.textRight}>{barem.quantity}</td>
                <td className={formStyles.textRight}>{barem.bonus}</td>
                <td className={`${formStyles.textRight} ${formStyles.fontBold}`}>
                  {barem.netPrice.toFixed(2)} ₺
                </td>
                <td className={`${formStyles.textRight} ${formStyles.profit}`}>
                  {barem.profitPercentage.toFixed(2)}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Tip 2: Ortak Alım Formu (GÜNCELLENDİ)
  const renderGroupBuyForm = () => (
    <>
      <div className={`${formStyles.formGroup} ${formStyles.autocompleteWrapper}`}>
        <label htmlFor="productName">İlaç Adı *</label>
        <input
          type="text"
          id="productName"
          value={productSearchTerm}
          onChange={handleProductSearchChange}
          onFocus={() => { if (productSearchTerm.length > 0 && !isProductLocked) setIsAutocompleteOpen(true); }}
          onBlur={() => setTimeout(() => setIsAutocompleteOpen(false), 200)}
          placeholder="Depodan alınacak ilacın adını arayın (Örn: Dolorex)"
          required
          autoComplete="off"
        />
        {renderAutocompleteDropdown()}
      </div>

      {renderBaremTable()}

      <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
        <div className={formStyles.checkboxWrapper}>
          <input type="checkbox" id="isCustomBarem"
            checked={formData.isCustomBarem}
            onChange={(e) => {
              handleInputChange('isCustomBarem', e.target.checked);
              if (e.target.checked) handleInputChange('selectedBaremId', null); 
            }}
          />
          <label htmlFor="isCustomBarem">Özel Barem Girmek İstiyorum</label>
        </div>
      </div>
      
      {formData.isCustomBarem && (
        <div className={formStyles.infoBox}>
          <h4>Özel Barem Bilgileri</h4>
          <div className={formStyles.formGrid}>
            <div className={formStyles.formGroup}>
              <label htmlFor="customBaremQuantity">Toplam Adet *</label>
              <input
                type="text" id="customBaremQuantity"
                value={formData.customBaremQuantity}
                onChange={(e) => handleInputChange('customBaremQuantity', e.target.value)}
                inputMode="numeric" required />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="customBaremBonus">Toplam MF *</label>
              <input
                type="text" id="customBaremBonus"
                value={formData.customBaremBonus}
                onChange={(e) => handleInputChange('customBaremBonus', e.target.value)}
                inputMode="numeric" required />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="customBaremNetPrice">Birim Net Fiyat (₺) *</label>
              <input
                type="text" id="customBaremNetPrice"
                value={formData.customBaremNetPrice}
                onChange={(e) => handleInputChange('customBaremNetPrice', e.target.value)}
                inputMode="decimal" required placeholder="0,00" />
            </div>
             <div className={formStyles.formGroup}>
                <label>Tekil Depo Fiyatı (Limit)</label>
                <input type="text" value={`${basePrice.toFixed(2)} ₺`} disabled />
              </div>
          </div>
        </div>
      )}

      {selectedBarem && (
        <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
          <div className={formStyles.formGrid}>
            <div className={formStyles.formGroup}>
              <label htmlFor="baremMultiplier">Barem Katı</label>
              <input
                type="number" id="baremMultiplier"
                value={formData.baremMultiplier}
                onChange={(e) => handleInputChange('baremMultiplier', e.target.value)}
                inputMode="numeric" min="1" required
                disabled={formData.isCustomBarem} />
            </div>
            <div className={formStyles.formGroup}>
              <label htmlFor="myQuantity">Benim Alacağım Adet (Havuz: {groupBuyTotals.totalPool} Adet) *</label>
              <input
                type="text" id="myQuantity"
                value={formData.myQuantity}
                onChange={(e) => handleInputChange('myQuantity', e.target.value)}
                inputMode="numeric" required placeholder="Örn: 30" />
            </div>
          </div>
          
          <div className={formStyles.priceSummary}>
             <div className={formStyles.priceItem}>
                <label>Toplam Alınacak (Adet + MF)</label>
                <span>{groupBuyTotals.totalQuantity} + {groupBuyTotals.totalBonus}</span>
             </div>
              <div className={formStyles.priceItem}>
                <label>Kalan Talep (Adet)</label>
                <span className={formStyles.remaining}>{groupBuyTotals.remainingQuantity}</span>
             </div>
             <div className={formStyles.priceItem}>
                <label>Toplam Sipariş Tutarı (Ana Adet)</label>
                <span className={formStyles.total}>{groupBuyTotals.totalCost.toFixed(2).replace('.', ',')} ₺</span>
             </div>
          </div>
        </div>
      )}
    </>
  );

  // Tip 3: Talep Aç Formu (GÜNCELLENDİ)
  const renderGroupRequestForm = () => (
    <>
      <div className={formStyles.infoBox}>
        <h4>Bu ilan türü nedir?</h4>
        <p>
          "Başkası bu ilaçtan ortak alım başlatırsa ben de katılmak istiyorum." anlamına gelir. 
          Siz bir alımı başlatmazsınız, sadece potansiyel alımlara adınızı yazdırırsınız.
        </p>
      </div>
      
      <div className={`${formStyles.formGroup} ${formStyles.autocompleteWrapper}`}>
        <label htmlFor="productName">Talep Edilen İlaç Adı *</label>
        <input
          type="text"
          id="productName"
          value={productSearchTerm}
          onChange={handleProductSearchChange}
          onFocus={() => { if (productSearchTerm.length > 0 && !isProductLocked) setIsAutocompleteOpen(true); }}
          onBlur={() => setTimeout(() => setIsAutocompleteOpen(false), 200)}
          placeholder="İlgilendiğiniz ilacın adını arayın (Örn: Dolorex)"
          required
          autoComplete="off"
        />
        {renderAutocompleteDropdown()}
      </div>

      <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`}>
        <label>İlgilendiğiniz Baremler (Opsiyonel)</label>
        <p className={formStyles.subtleText}>
          Aşağıdan bir barem seçerseniz, sadece bu bareme uygun bir ortak alım açıldığında haberdar olursunuz.
        </p>
      </div>
      
      {renderBaremTable()}

      {formData.selectedBaremId && (
        <div className={`${formStyles.formGroup} ${formStyles.fullWidth}`} style={{marginTop: '15px'}}>
          <label htmlFor="groupRequestQuantity">Bu Bareme Katılmak İçin İhtiyacım Olan Adet *</label>
          <input
            type="text" id="groupRequestQuantity"
            value={formData.groupRequestQuantity}
            onChange={(e) => handleInputChange('groupRequestQuantity', e.target.value)}
            inputMode="numeric"
            required={!!formData.selectedBaremId} 
            placeholder="Örn: 20" />
          <p className={formStyles.subtleText}>
            Bu baremle bir alım açılırsa, bu adette talebiniz olduğu bildirilecektir.
          </p>
        </div>
      )}
    </>
  );

  const getTitle = () => {
    if (isEditMode) return "Stoktan Teklifi Düzenle";
    if (defaultValues.productName) return `Envanterden Teklif Oluştur`;
    return "Yeni İlan Oluştur";
  };
  
  const getButtonText = () => {
    if (isSaving) return "Kaydediliyor...";
    if (isEditMode) return "Değişiklikleri Kaydet";
    if (offerType === 'stock') return "Stoktan Teklif Ver";
    if (offerType === 'group-buy') return "Ortak Alım Başlat";
    if (offerType === 'group-request') return "Talep Aç";
    return "Oluştur";
  };

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title={getTitle()}
        description="İlanınızın türünü seçin ve gerekli bilgileri doldurun."
        footer={
          <button type="submit" className={`${formStyles.btn} ${formStyles.btnPrimary}`} disabled={isSaving}>
            {getButtonText()}
          </button>
        }
      >
        {!isEditMode && !defaultValues.productName && renderTabs()}

        {/* Form Alanı (Grid'i burada başlatmak yerine içeride başlattım) */}
        <div>
          {offerType === 'stock' && <div className={formStyles.formGrid}>{renderStockForm()}</div>}
          {offerType === 'group-buy' && <div className={formStyles.formGrid}>{renderGroupBuyForm()}</div>}
          {offerType === 'group-request' && <div className={formStyles.formGrid}>{renderGroupRequestForm()}</div>}
        </div>
      </SettingsCard>
    </form>
  );
};

export default OfferForm;