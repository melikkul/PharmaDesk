#!/usr/bin/env python3
"""
Canlı Kurye Konum Simülasyonu
Bu script, kuryenin hareketini simüle eder ve SignalR bağlantısını test eder.

Kullanım:
1. Backend API çalışıyor olmalı (http://localhost:8081)
2. Kurye hesabı ile giriş yapılmış olmalı (shift başlatılmış)
3. `python simulate_live.py` ile çalıştırın

NOT: Bu script, kurye API'sını kullanarak konum günceller.
     SignalR testi için kuryenin aktif mesaisi olmalıdır.
"""

import requests
import time
import urllib3
import json
from datetime import datetime

urllib3.disable_warnings()

# ═══════════════════════════════════════════════════════════════
# AYARLAR
# ═══════════════════════════════════════════════════════════════
API_BASE_URL = "http://localhost:8081"
CARRIER_USERNAME = "kurye1"
CARRIER_PASSWORD = "kurye123"  # veya gerçek şifre

# Rota: Ankara merkezden küçük adımlarla hareket
# (Lat, Lng) çiftleri
ROUTE = [
    (39.9494, 32.8493),  # Başlangıç
    (39.9500, 32.8500),
    (39.9510, 32.8510),
    (39.9520, 32.8520),
    (39.9530, 32.8530),
    (39.9540, 32.8540),
    (39.9550, 32.8550),
    (39.9560, 32.8560),
]

UPDATE_INTERVAL = 2  # saniye


# ═══════════════════════════════════════════════════════════════
# KURYE GİRİŞİ
# ═══════════════════════════════════════════════════════════════
def carrier_login(username: str, password: str) -> str | None:
    """Kurye hesabıyla giriş yap ve JWT token al"""
    print(f"🔐 Kurye girişi yapılıyor: {username}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/carrier/login",
            json={"username": username, "password": password},
            verify=False
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("accessToken")
            print(f"✅ Giriş başarılı! Token alındı.")
            return token
        else:
            print(f"❌ Giriş başarısız: {response.status_code}")
            print(f"   Yanıt: {response.text[:200]}")
            return None
    except Exception as e:
        print(f"❌ Giriş hatası: {e}")
        return None


# ═══════════════════════════════════════════════════════════════
# KONUM GÜNCELLEME
# ═══════════════════════════════════════════════════════════════
def update_location(token: str, latitude: float, longitude: float) -> bool:
    """Kurye konumunu güncelle"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "latitude": latitude,
        "longitude": longitude
    }
    
    try:
        # Konum güncelleme endpoint'i: POST /api/carrier/shift/location
        response = requests.post(
            f"{API_BASE_URL}/api/carrier/shift/location",
            json=payload,
            headers=headers,
            verify=False
        )
        
        if response.status_code == 200:
            return True
        else:
            print(f"   ⚠️ Konum güncelleme: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Hata: {e}")
        return False


# ═══════════════════════════════════════════════════════════════
# ANA SİMÜLASYON DÖNGÜSÜ
# ═══════════════════════════════════════════════════════════════
def run_simulation():
    print("═" * 60)
    print("🚀 CANLI KURYE SİMÜLASYONU")
    print("═" * 60)
    print()
    
    # 1. Giriş yap
    token = carrier_login(CARRIER_USERNAME, CARRIER_PASSWORD)
    if not token:
        print("\n❌ Token alınamadı! Simülasyon durduruluyor.")
        print("   Çözüm: CARRIER_USERNAME ve CARRIER_PASSWORD değerlerini kontrol edin.")
        return
    
    print()
    print("📍 Konum simülasyonu başlıyor...")
    print(f"   Güncelleme aralığı: {UPDATE_INTERVAL} saniye")
    print(f"   Rota noktası sayısı: {len(ROUTE)}")
    print()
    print("   Durdurmak için Ctrl+C basın")
    print("-" * 60)
    
    try:
        cycle = 0
        while True:
            cycle += 1
            print(f"\n🔄 Döngü #{cycle}")
            
            for i, (lat, lng) in enumerate(ROUTE):
                timestamp = datetime.now().strftime("%H:%M:%S")
                
                success = update_location(token, lat, lng)
                status = "✅" if success else "❌"
                
                print(f"   {status} [{timestamp}] Konum {i+1}/{len(ROUTE)}: ({lat:.4f}, {lng:.4f})")
                
                time.sleep(UPDATE_INTERVAL)
                
    except KeyboardInterrupt:
        print("\n")
        print("═" * 60)
        print("⏹️  Simülasyon durduruldu.")
        print("═" * 60)


if __name__ == "__main__":
    run_simulation()
