# Açık Artırmalı Araba Satış Sitesi — Proje Planı

**Stack:** React (frontend) + Go (backend)


---

## 1. Kapsam

### Backend (Go)
- JWT tabanlı kayıt/giriş sistemi
- Araç ilanı CRUD (ekleme, listeleme, detay, silme/güncelleme)
- Açık artırma mantığı: başlangıç fiyatı, bitiş zamanı, güncel en yüksek teklif
- Teklif verme endpoint'i (eş zamanlılık kontrolü — aynı anda gelen tekliflerde veri tutarlılığı)
- Açık artırma süresi dolunca otomatik kazanan belirleme (zamanlanmış görev)

### Frontend (React)
- İlan listesi + filtreleme (marka, model, fiyat aralığı, durum: aktif/bitmiş)
- İlan detay sayfası + teklif geçmişi
- Teklif verme formu (anlık doğrulama: teklif mevcut en yüksekten büyük mü)
- Kullanıcı paneli: kendi ilanlarım / verdiğim teklifler

### Kapsam Dışı (isteğe bağlı, zaman kalırsa)
- Gerçek zamanlı güncelleme (WebSocket ile canlı teklif akışı)
- Ödeme entegrasyonu
- E-posta/bildirim sistemi
- Resim yükleme (S3 benzeri depolama)

---

## 2. Veritabanı Şeması (taslak)

```
users
├── id (PK)
├── email (unique)
├── password_hash
├── name
├── role (buyer / seller / admin)
└── created_at

listings (araç ilanları)
├── id (PK)
├── seller_id (FK → users.id)
├── title
├── brand
├── model
├── year
├── description
├── starting_price
├── current_price
├── status (pending / active / ended / sold)
├── start_time
├── end_time
└── created_at

bids (teklifler)
├── id (PK)
├── listing_id (FK → listings.id)
├── bidder_id (FK → users.id)
├── amount
└── created_at

-- Not: current_price alanı her yeni teklifte güncellenir,
-- ama gerçek kaynak (source of truth) her zaman bids tablosundaki
-- en yüksek amount olmalı. current_price sadece hızlı okuma için.
```

**Eş zamanlılık notu:** İki kullanıcı aynı anda teklif verirse, veritabanı seviyesinde transaction + `SELECT ... FOR UPDATE` (ya da Go tarafında mutex/lock) kullanarak "en yüksek teklif" kontrolünü race condition'a karşı korumalısın. Bu, projenin en kritik teknik noktası — mentörüne gösterebileceğin bir detay.

---

## 3. API Endpoint Taslağı

```
POST   /api/auth/register
POST   /api/auth/login

GET    /api/listings              (filtreleme: ?brand=&minPrice=&maxPrice=&status=)
GET    /api/listings/:id
POST   /api/listings              (auth gerekli, seller)
PUT    /api/listings/:id          (sadece sahibi)
DELETE /api/listings/:id          (sadece sahibi)

GET    /api/listings/:id/bids     (teklif geçmişi)
POST   /api/listings/:id/bids     (auth gerekli, teklif ver)

GET    /api/users/me/listings     (kendi ilanlarım)
GET    /api/users/me/bids         (verdiğim teklifler)
```

---


### Hafta 1 — Temel Altyapı
- [x] Go proje iskeleti (klasör yapısı: `handlers/`, `models/`, `repository/`, `middleware/`)
- [x] PostgreSQL/MySQL bağlantısı, migration dosyaları
- [x] Veritabanı şemasını oluştur (users, listings, bids, messages)
- [x] JWT auth: register/login endpoint'leri
- [x] Auth middleware (token doğrulama)

### Hafta 2 — Backend İş Mantığı
- [x] Listing CRUD endpoint'leri
- [x] Bid (teklif) endpoint'i + eş zamanlılık kontrolü (SELECT FOR UPDATE)
- [x] Validasyon: teklif mevcut fiyattan yüksek mi, ilan hâlâ aktif mi, satıcı teklif veremez
- [x] Basit zamanlayıcı (goroutine + ticker) ile süresi dolan ilanları `ended` yap
- [x] Postman/Thunder Client ile tüm endpoint'leri test et

### Hafta 3 — Frontend
- [x] React proje kurulumu, routing (React Router)
- [x] İlan listesi sayfası + filtreleme UI
- [x] İlan detay sayfası + teklif geçmişi listesi
- [x] Teklif verme formu + hata mesajları
- [x] Login/register sayfaları, auth state yönetimi (Context API)
- [x] Kullanıcı paneli

### Hafta 4 — Bitirme
- [x] Backend-frontend entegrasyon testleri (uçtan uca senaryo)
- [x] Kazanan belirleme mantığının doğru çalıştığını test et
- [x] Hata/edge-case temizliği (boş liste, süresi dolmuş ilana teklif verme engeli, vb.)
- [x] Kod temizliği, README yazımı
- [x] Sunum/demo hazırlığı

---

## 5. Claude Free ile Çalışma Stratejisi

- Kod tamamını yazdırmak yerine önce kendin dene, **spesifik hata mesajını veya takıldığın satırı** getir.
- Birden fazla küçük soruyu tek mesajda birleştir (mesaj hakkını verimli kullan).
- Mimari/mantık kararlarını (örneğin eş zamanlılık kontrolü nasıl yapılmalı) önceden bu tür planlama sohbetlerinde netleştir, kod yazarken tekrar sorma.
- Sohbet limiti dolarsa yeni sohbet açtığında, üstteki plan dosyasını referans olarak paylaşabilirsin — böylece baştan anlatmak zorunda kalmazsın.

---

## 6. Riskler / Dikkat Edilecekler

- **Eş zamanlılık:** Aynı anda gelen tekliflerde veri bozulmaması en kritik nokta — bunu erken test et.
- **Zaman dilimi (timezone):** `start_time`/`end_time` için UTC kullan, frontend'de kullanıcının yerel saatine çevir.
- **Kapsamı büyütme:** 4 hafta kısa; WebSocket, ödeme, resim yükleme gibi ek özellikleri "zaman kalırsa" listesine al, MVP'yi önce bitir.
