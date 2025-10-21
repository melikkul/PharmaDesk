// app/ayarlar/profil/page.tsx
import React from 'react';
import SettingsLayout from '../../../components/settings/SettingsLayout';
import SettingsCard from '../../../components/settings/SettingsCard';

const ProfilimPage = () => {
  return (
    <SettingsLayout>
      <h1 className="settings-page-title">Profilim</h1>
      <SettingsCard
        title="Kişisel Bilgiler"
        description="Temel profil bilgilerinizi buradan güncelleyebilirsiniz."
        footer={<button className="btn btn-primary">Değişiklikleri Kaydet</button>}
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="fullName">Ad Soyad</label>
            <input type="text" id="fullName" defaultValue="Zeynep Yılmaz" />
          </div>
          <div className="form-group">
            <label htmlFor="email">E-posta Adresi</label>
            <input type="email" id="email" defaultValue="zeynep.yilmaz@email.com" />
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Şifre Değiştir"
        description="Güvenliğiniz için belirli aralıklarla şifrenizi değiştirmeniz önerilir."
        footer={<button className="btn btn-primary">Şifreyi Güncelle</button>}
      >
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="currentPassword">Mevcut Şifre</label>
            <input type="password" id="currentPassword" />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">Yeni Şifre</label>
            <input type="password" id="newPassword" />
          </div>
           <div className="form-group">
            <label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</label>
            <input type="password" id="confirmPassword" />
          </div>
        </div>
      </SettingsCard>
    </SettingsLayout>
  );
};

export default ProfilimPage;