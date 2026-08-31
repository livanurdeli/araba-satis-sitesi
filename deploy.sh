#!/bin/bash
set -e

echo "🚀 [otopazar] Canlı Sunucu Dağıtımı Başlatılıyor..."

# 1. Eski container'ları durdur
echo "🛑 Eski container'lar kapatılıyor..."
docker compose -f docker-compose.prod.yml down --remove-orphans || true

# 2. Yeni imajları derle ve arka planda çalıştır
echo "🐳 Yeni sürüm derleniyor ve başlatılıyor..."
docker compose -f docker-compose.prod.yml up -d --build

# 3. Durumu kontrol et
echo "⏳ Servislerin ayağa kalkması bekleniyor..."
sleep 5
docker compose -f docker-compose.prod.yml ps

echo "✅ Dağıtım tamamlandı! Uygulama :8080 portunda aktif."
