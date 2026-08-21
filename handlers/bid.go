package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type PlaceBidRequest struct {
	Amount float64 `json:"amount"`
}

type BidDetailResponse struct {
	ID         int       `json:"id"`
	ListingID  int       `json:"listing_id"`
	BidderID   int       `json:"bidder_id"`
	BidderName string    `json:"bidder_name"`
	Amount     float64   `json:"amount"`
	CreatedAt  time.Time `json:"created_at"`
}

func PlaceBid(w http.ResponseWriter, r *http.Request) {
	bidderID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	listingIDStr := r.PathValue("id")
	listingID, err := strconv.Atoi(listingIDStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	var req PlaceBidRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz JSON verisi", http.StatusBadRequest)
		return
	}

	if req.Amount <= 0 {
		http.Error(w, "Teklif tutarı sıfırdan büyük olmalıdır", http.StatusBadRequest)
		return
	}

	tx, err := repository.DB.BeginTx(r.Context(), nil)
	if err != nil {
		http.Error(w, "İşlem başlatılamadı", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()
	var sellerID int
	var currentPrice float64
	var status string
	var endTime time.Time

	lockQuery := `SELECT seller_id, current_price, status, end_time 
	              FROM listings 
	              WHERE id = $1 
	              FOR UPDATE`

	err = tx.QueryRow(lockQuery, listingID).Scan(&sellerID, &currentPrice, &status, &endTime)
	if err == sql.ErrNoRows {
		http.Error(w, "İlan bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı kilitleme hatası: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if status != "active" {
		http.Error(w, "Bu ilan aktif değil, teklif verilemez", http.StatusBadRequest)
		return
	}

	if time.Now().After(endTime) {
		http.Error(w, "Açık artırma süresi sona ermiş", http.StatusBadRequest)
		return
	}

	if sellerID == bidderID {
		http.Error(w, "Kendi ilanınıza teklif veremezsiniz", http.StatusBadRequest)
		return
	}

	if req.Amount <= currentPrice {
		http.Error(w, "Teklifiniz mevcut en yüksek fiyattan daha yüksek olmalıdır (Mevcut: "+strconv.FormatFloat(currentPrice, 'f', 2, 64)+")", http.StatusBadRequest)
		return
	}

	var bid models.Bid
	bid.ListingID = listingID
	bid.BidderID = bidderID
	bid.Amount = req.Amount

	insertBidQuery := `INSERT INTO bids (listing_id, bidder_id, amount, created_at) 
	                  VALUES ($1, $2, $3, NOW()) 
	                  RETURNING id, created_at`
	err = tx.QueryRow(insertBidQuery, listingID, bidderID, req.Amount).Scan(&bid.ID, &bid.CreatedAt)
	if err != nil {
		http.Error(w, "Teklif kaydedilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	updatePriceQuery := `UPDATE listings SET current_price = $1 WHERE id = $2`
	_, err = tx.Exec(updatePriceQuery, req.Amount, listingID)
	if err != nil {
		http.Error(w, "İlan fiyatı güncellenemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, "İşlem onaylanamadı", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Teklifiniz başarıyla verildi!",
		"bid":           bid,
		"current_price": req.Amount,
	})
}

func GetListingBids(w http.ResponseWriter, r *http.Request) {
	listingIDStr := r.PathValue("id")
	listingID, err := strconv.Atoi(listingIDStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	query := `SELECT b.id, b.listing_id, b.bidder_id, u.name, b.amount, b.created_at 
	          FROM bids b 
	          JOIN users u ON b.bidder_id = u.id 
	          WHERE b.listing_id = $1 
	          ORDER BY b.amount DESC, b.created_at DESC`

	rows, err := repository.DB.Query(query, listingID)
	if err != nil {
		http.Error(w, "Teklifler getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	bids := make([]BidDetailResponse, 0)
	for rows.Next() {
		var b BidDetailResponse
		if err := rows.Scan(&b.ID, &b.ListingID, &b.BidderID, &b.BidderName, &b.Amount, &b.CreatedAt); err != nil {
			http.Error(w, "Veri işlenirken hata oluştu", http.StatusInternalServerError)
			return
		}
		bids = append(bids, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bids)
}
