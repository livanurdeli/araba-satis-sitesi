package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"encoding/json"
	"net/http"
	"time"
)

type UserBidHistoryItem struct {
	BidID         int       `json:"bid_id"`
	ListingID     int       `json:"listing_id"`
	ListingTitle  string    `json:"listing_title"`
	Brand         string    `json:"brand"`
	Model         string    `json:"model"`
	ListingStatus string    `json:"listing_status"`
	ImageURL      string    `json:"image_url"`
	CurrentPrice  float64   `json:"current_price"`
	MyBidAmount   float64   `json:"my_bid_amount"`
	BidCreatedAt  time.Time `json:"bid_created_at"`
	EndTime       time.Time `json:"end_time"`
}

func GetMyListings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	query := `SELECT id, seller_id, title, brand, model, year, description, 
	                 starting_price, current_price, status, image_url, start_time, end_time, created_at 
	          FROM listings 
	          WHERE seller_id = $1 
	          ORDER BY created_at DESC`

	rows, err := repository.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "İlanlarınız getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	listings := make([]models.Listing, 0)
	for rows.Next() {
		var l models.Listing
		err := rows.Scan(
			&l.ID, &l.SellerID, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
			&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
		)
		if err != nil {
			http.Error(w, "Veri okunurken hata oluştu: "+err.Error(), http.StatusInternalServerError)
			return
		}
		listings = append(listings, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listings)
}

func GetMyBids(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	query := `SELECT b.id, b.listing_id, l.title, l.brand, l.model, l.status, l.image_url, l.current_price, 
	                 b.amount, b.created_at, l.end_time 
	          FROM bids b 
	          JOIN listings l ON b.listing_id = l.id 
	          WHERE b.bidder_id = $1 
	          ORDER BY b.created_at DESC`

	rows, err := repository.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Teklifleriniz getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	myBids := make([]UserBidHistoryItem, 0)
	for rows.Next() {
		var item UserBidHistoryItem
		err := rows.Scan(
			&item.BidID, &item.ListingID, &item.ListingTitle, &item.Brand, &item.Model,
			&item.ListingStatus, &item.ImageURL, &item.CurrentPrice, &item.MyBidAmount, &item.BidCreatedAt, &item.EndTime,
		)
		if err != nil {
			http.Error(w, "Veri okunurken hata oluştu: "+err.Error(), http.StatusInternalServerError)
			return
		}
		myBids = append(myBids, item)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(myBids)
}
