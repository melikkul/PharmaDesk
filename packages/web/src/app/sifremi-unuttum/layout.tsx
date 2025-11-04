import Image from 'next/image';
import Logo from '../login/logo'; // Mevcut login logonuzu kullanıyoruz
import '../auth-layout.css'; // Mevcut auth stillerinizi kullanıyoruz
import loginImage from '../../../public/Login.png'; // Mevcut görseli kullanıyoruz
import logoYesil from '../../../public/logoYesil.png';

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="authContainer">
      <div className="logoSection">
        <Logo src={logoYesil} />
        <div className="imageContainer">
          <Image src={loginImage} alt="Şifremi Unuttum" fill style={{ objectFit: 'contain' }} />
        </div>
      </div>
      <div className="formSection">
        {children}
      </div>
    </div>
  );
}