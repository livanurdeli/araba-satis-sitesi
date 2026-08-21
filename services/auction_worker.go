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

// checkAndCloseExpiredAuctions süresi geçmiş ve hâlâ 'active' olan ilanları kapatır ve kazananlara bildirim gönderir
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

	type endedAuction struct {
		id         int
		title      string
		finalPrice float64
	}

	var endedList []endedAuction
	for rows.Next() {
		var ea endedAuction
		if err := rows.Scan(&ea.id, &ea.title, &ea.finalPrice); err == nil {
			endedList = append(endedList, ea)
		}
	}

	for _, ea := range endedList {
		var winnerID int
		var winnerName string
		_ = db.QueryRow(`
			SELECT b.bidder_id, u.name 
			FROM bids b 
			JOIN users u ON b.bidder_id = u.id 
			WHERE b.listing_id = $1 
			ORDER BY b.amount DESC, b.created_at ASC 
			LIMIT 1
		`, ea.id).Scan(&winnerID, &winnerName)

		log.Printf("🏁 Açık artırma sona erdi: [ID: %d] \"%s\" - Son Fiyat: %.2f TL - Kazanan: %s (ID: %d)\n", ea.id, ea.title, ea.finalPrice, winnerName, winnerID)

		GlobalHub.BroadcastAuctionEnded(ea.id, winnerID, winnerName, ea.finalPrice, ea.title)
	}

	if len(endedList) > 0 {
		log.Printf("📢 Toplam %d adet süresi dolan açık artırma kapatıldı.\n", len(endedList))
	}
}
