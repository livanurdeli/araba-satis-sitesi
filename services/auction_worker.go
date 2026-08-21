package services

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// StartAuctionWatcher süresi dolan açık artırmaları periyodik olarak kontrol edip 'ended' yapar.
func StartAuctionWatcher(db *sql.DB, interval time.Duration) {
	go func() {
		fmt.Printf("⏱️ Açık artırma zamanlayıcı servisi başlatıldı (Kontrol aralığı: %v)\n", interval)
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			checkAndCloseExpiredAuctions(db)
		}
	}()
}

// checkAndCloseExpiredAuctions süresi geçmiş ve hâlâ 'active' olan ilanları kapatır
func checkAndCloseExpiredAuctions(db *sql.DB) {
	query := `
		UPDATE listings 
		SET status = 'ended' 
		WHERE status = 'active' AND end_time <= NOW()
		RETURNING id, title, current_price
	`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("❌ Zamanlayıcı hatası (ilanlar güncellenemedi): %v\n", err)
		return
	}
	defer rows.Close()

	closedCount := 0
	for rows.Next() {
		var id int
		var title string
		var finalPrice float64
		if err := rows.Scan(&id, &title, &finalPrice); err == nil {
			closedCount++
			log.Printf("🏁 Açık artırma sona erdi: [ID: %d] \"%s\" - Son Fiyat: %.2f TL\n", id, title, finalPrice)
		}
	}

	if closedCount > 0 {
		log.Printf("📢 Toplam %d adet süresi dolan açık artırma kapatıldı.\n", closedCount)
	}
}
