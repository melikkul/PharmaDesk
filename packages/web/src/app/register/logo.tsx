import Image from "next/image";
import logoImage from "../../../public/logoYesil.png";
import "./logo.css";

export default function Logo() {
  return(
    <div className="loginAll"><Image className="logo" src={logoImage} alt="Pharma Desk Logo" /></div>
    
  );
}