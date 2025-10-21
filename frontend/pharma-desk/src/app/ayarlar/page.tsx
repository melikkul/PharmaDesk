// app/ayarlar/page.tsx
import React from 'react';
import SettingsLayout from '../../components/settings/SettingsLayout';
import SettingsCard from '../../components/settings/SettingsCard';

const AyarlarPage = () => {
  return (
    <SettingsLayout>
      <h1 className="settings-page-title">Genel Ayarlar</h1>
      <SettingsCard
        title="Bildirim Tercihleri"
        description="Hangi durumlarda bildirim almak istediğinizi seçin."
      >
        <div className="toggle-list">
          <div className="toggle-item">
            <span>Yeni teklifler için e-posta gönder</span>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="toggle-item">
            <span>Kargo durum güncellemeleri için e-posta gönder</span>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="toggle-item">
            <span>Sistem ve kampanya duyuruları</span>
            <label className="switch">
              <input type="checkbox" />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </SettingsCard>
      
      <SettingsCard
        title="Hesap İşlemleri"
        description="Bu işlem geri alınamaz. Lütfen dikkatli olun."
      >
         <button className="btn btn-danger">Hesabı Kalıcı Olarak Sil</button>
      </SettingsCard>
    </SettingsLayout>
  );
};

export default AyarlarPage;