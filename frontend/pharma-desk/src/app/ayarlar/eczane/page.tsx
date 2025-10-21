// app/ayarlar/eczane/page.tsx
import React from 'react';
import SettingsLayout from '../../../components/settings/SettingsLayout';
import SettingsCard from '../../../components/settings/SettingsCard';

const EczaneBilgileriPage = () => {
  return (
    <SettingsLayout>
      <h1 className="settings-page-title">Eczane Bilgileri</h1>
      <SettingsCard
        title="Genel Eczane Bilgileri"
        description="Sistemde görünecek olan resmi eczane bilgilerinizi yönetin."
        footer={<button className="btn btn-primary">Bilgileri Kaydet</button>}
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label htmlFor="pharmacyName">Eczane Adı</label>
            <input type="text" id="pharmacyName" defaultValue="Yıldız Eczanesi" />
          </div>
          <div className="form-group">
            <label htmlFor="licenseNo">Ruhsat Numarası</label>
            <input type="text" id="licenseNo" defaultValue="123456789" />
          </div>
           <div className="form-group">
            <label htmlFor="taxNo">Vergi Numarası</label>
            <input type="text" id="taxNo" defaultValue="9876543210" />
          </div>
           <div className="form-group full-width">
            <label htmlFor="address">Adres</label>
            <textarea id="address" rows={3} defaultValue="Örnek Mah. Atatürk Cad. No: 123/A"></textarea>
          </div>
           <div className="form-group">
            <label htmlFor="city">Şehir</label>
            <input type="text" id="city" defaultValue="Ankara" />
          </div>
           <div className="form-group">
            <label htmlFor="district">İlçe</label>
            <input type="text" id="district" defaultValue="Çankaya" />
          </div>
        </div>
      </SettingsCard>
    </SettingsLayout>
  );
};

export default EczaneBilgileriPage;