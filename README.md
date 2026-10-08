# otopazar — Çevrimiçi Araç Açık Artırma Platformu 

**otopazar**, gerçek zamanlı açık artırma mantığı, eşzamanlı işlem güvenliği (concurrency lock) ve modern bir kullanıcı deneyimi sunan tam donanımlı bir araç mezat platformudur.

---

## Özellikler

-  **Gerçek Zamanlı Açık Artırma & Geri Sayım:** Her araç ilanı için saniye saniye işleyen akıllı geri sayım sayacı.
-  **Eş Zamanlı İşlem Güvenliği (Race Condition Prevention):** PostgreSQL transaction ve `SELECT ... FOR UPDATE` satır kilitleme altyapısıyla aynı anda gelen tekliflerde çakışma ve tutarsızlık engellenir.
- **Çoklu Medya Fotoğraf Galerisi:** Cihazdan doğrudan dış, iç ve motor fotoğraflarını yükleme, vitrin (kapak) seçimi ve interaktif galeri slaytları.
-  **Otomatik Kazanan Belirleme:** Arka planda çalışan zamanlayıcı servis (Background Worker) süresi dolan ilanları kapatır ve en yüksek teklif vereni kazanan ilan eder.
-  **Kullanıcı Paneli:** İlanlarım ve Verdiğim Teklifler (Kazandı / Lider / Geçildi durum rozetleri ile).
-  **JWT & Rol Tabanlı Yetkilendirme:** Satıcı kendi ilanına teklif veremez, yetkisiz silme/düzenleme işlemleri engellenir.

---

##  Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| **Backend API** | Go 1.25 (Standart `net/http`, RESTful Mux) |
| **Veritabanı** | PostgreSQL 16 (Docker Container) |
| **Frontend** | React 19, Vite, React Router 7, Lucide Icons |
| **Konteynerleştirme** | Docker & Docker Compose |

---

##  Hızlı Başlangıç & Kurulum

### 1. Gereksinimler
- Docker & Docker Compose
- Go (1.22+)
- Node.js (18+)

### 2. Veritabanını Başlatma
```bash
docker compose up -d
```

### 3. Backend ve Frontend'i Çalıştırma
Tüm uygulama (Backend API + SPA Frontend) tek bir komutla ayağa kalkar:
```bash
go run main.go
```

Tarayıcınızdan açın: **http://localhost:8080**

---
<img width="2940" height="1912" alt="image" src="https://github.com/user-attachments/assets/fcc0486b-8130-4ccc-a306-cea3a6ee4be8" />



