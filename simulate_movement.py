#!/usr/bin/env python3
"""
Kurye Konum Simülasyon Scripti
Bu script, kuryenin gerçek zamanlı konum güncellemelerini simüle eder.
Backend'e HTTP POST ile sahte koordinatlar gönderir.
"""

import requests
import time
import json
import sys

# ═══════════════════════════════════════════════════════════════
# AYARLAR
# ═══════════════════════════════════════════════════════════════
API_BASE_URL = "http://localhost:8081"
CARRIER_ID = 1

# CarrierShift API endpoint (konum güncelleme)
LOCATION_ENDPOINT = f"{API_BASE_URL}/api/carrier/shift/location"

# Kadıköy - Bostancı civarında sahte rota (İstanbul)
ROUTE = [
    {"lat": 40.9650, "lng": 29.0800},
    {"lat": 40.9655, "lng": 29.0810},
    {"lat": 40.9660, "lng": 29.0820},
    {"lat": 40.9665, "lng": 29.0830},
    {"lat": 40.9670, "lng": 29.0840},
    {"lat": 40.9675, "lng": 29.0850},
    {"lat": 40.9680, "lng": 29.0860},
    {"lat": 40.9675, "lng": 29.0850},  # Geri dön
    {"lat": 40.9670, "lng": 29.0840},
    {"lat": 40.9665, "lng": 29.0830},
    {"lat": 40.9660, "lng": 29.0820},
    {"lat": 40.9655, "lng": 29.0810},
]

UPDATE_INTERVAL_SECONDS = 2

def get_carrier_token():
    """Test için kurye token'ı al"""
    print("🔐 Kurye girişi yapılıyor...")
    try:
        response = requests.post(
            f"{API_BASE_URL}/api/carrier/login",
            json={
                "username": "kurye1",  # Mevcut kurye kullanıcı adı
                "password": "melik123"   # Kurye şifresi
            }
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print(f"✅ Token alındı")
            return token
        else:
            print(f"❌ Giriş başarısız: {response.status_code}")
            print(f"   Yanıt: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Bağlantı hatası: {e}")
        return None

def update_location(token, latitude, longitude):
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
        response = requests.post(
            LOCATION_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=5
        )
        return response.status_code
    except Exception as e:
        print(f"❌ Konum güncelleme hatası: {e}")
        return 0

def main():
    print("=" * 60)
    print("🚀 KURYE KONUM SİMÜLATÖRÜ")
    print("=" * 60)
    
    # Token al
    token = get_carrier_token()
    if not token:
        print("\n⚠️  Token alınamadı. Manuel token girebilirsiniz:")
        print("   python simulate_movement.py <TOKEN>")
        if len(sys.argv) > 1:
            token = sys.argv[1]
            print(f"   → Manuel token kullanılıyor")
        else:
            return
    
    print(f"\n📍 Rota: {len(ROUTE)} nokta")
    print(f"⏱️  Güncelleme aralığı: {UPDATE_INTERVAL_SECONDS} saniye")
    print(f"🛣️  Başlangıç: {ROUTE[0]['lat']}, {ROUTE[0]['lng']}")
    print("\n" + "=" * 60)
    print("SİMÜLASYON BAŞLADI (Durdurmak için Ctrl+C)")
    print("=" * 60 + "\n")
    
    try:
        cycle = 0
        while True:
            cycle += 1
            print(f"📦 Döngü #{cycle}")
            
            for i, point in enumerate(ROUTE):
                status = update_location(token, point["lat"], point["lng"])
                marker = "✅" if status in [200, 204] else "⚠️"
                print(f"   {marker} [{i+1}/{len(ROUTE)}] "
                      f"Lat: {point['lat']:.4f}, Lng: {point['lng']:.4f} "
                      f"(HTTP: {status})")
                time.sleep(UPDATE_INTERVAL_SECONDS)
            
            print()
    
    except KeyboardInterrupt:
        print("\n\n🛑 Simülasyon durduruldu.")

if __name__ == "__main__":
    main()
