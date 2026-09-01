package services

import (
"araba-satis-sitesi/repository"
"fmt"
"log"
"time"
)

// StartAuctionWatcher, süresi dolan açık artırmaları periyodik olarak kapatan
// arka plan görevini başlatır. Somut *sql.DB yerine ListingRepository interface'ine
// bağımlı olduğu için test edilebilir ve DIP'e uygundur.
func StartAuctionWatcher(listingRepo repository.ListingRepository, interval time.Duration) {
go func() {
fmt.Printf("⏱️ Açık artırma zamanlayıcı servisi başlatıldı (Kontrol aralığı: %v)\n", interval)
ticker := time.NewTicker(interval)
defer ticker.Stop()

for range ticker.C {
closeExpiredAuctions(listingRepo)
}
}()
}

func closeExpiredAuctions(listingRepo repository.ListingRepository) {
closed, err := listingRepo.CloseExpiredAuctions()
if err != nil {
log.Printf("❌ Zamanlayıcı hatası (ilanlar güncellenemedi): %v\n", err)
return
}

for _, e := range closed {
log.Printf("🏁 Açık artırma sona erdi: [ID: %d] \"%s\" - Son Fiyat: %.2f TL\n", e.ID, e.Title, e.FinalPrice)
}

if len(closed) > 0 {
log.Printf("📢 Toplam %d adet süresi dolan açık artırma kapatıldı.\n", len(closed))
}
}
