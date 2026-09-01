package repository

import (
"araba-satis-sitesi/models"
"context"
"database/sql"
"errors"
"fmt"
"strconv"
"time"
)

type BidRepository interface {
	PlaceBid(ctx context.Context, listingID int, bidderID int, amount float64) (*models.PlaceBidResult, error)
	GetBidsByListingID(listingID int) ([]models.BidDetailResponse, error)
	GetByBidderID(bidderID int) ([]models.UserBidHistoryItem, error)
}

type PostgresBidRepository struct {
	db       *sql.DB
	userRepo UserRepository
}

func NewBidRepository(db *sql.DB, userRepo UserRepository) BidRepository {
	return &PostgresBidRepository{db: db, userRepo: userRepo}
}

func (r *PostgresBidRepository) PlaceBid(ctx context.Context, listingID int, bidderID int, amount float64) (*models.PlaceBidResult, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("işlem başlatılamadı: %w", err)
	}
	defer tx.Rollback()

	var sellerID int
	var currentPrice float64
	var status string
	var endTime time.Time
	var listingTitle string

	lockQuery := `SELECT seller_id, current_price, status, end_time, title 
	              FROM listings 
	              WHERE id = $1 
	              FOR UPDATE`

	err = tx.QueryRow(lockQuery, listingID).Scan(&sellerID, &currentPrice, &status, &endTime, &listingTitle)
	if err == sql.ErrNoRows {
		return nil, errors.New("İlan bulunamadı")
	} else if err != nil {
		return nil, fmt.Errorf("veritabanı kilitleme hatası: %w", err)
	}

	if status != "active" {
		return nil, errors.New("Bu ilan aktif değil, teklif verilemez")
	}

	if time.Now().After(endTime) {
		return nil, errors.New("Açık artırma süresi sona ermiş")
	}

	if sellerID == bidderID {
		return nil, errors.New("Kendi ilanınıza teklif veremezsiniz")
	}

	if amount <= currentPrice {
		return nil, fmt.Errorf("Teklifiniz mevcut en yüksek fiyattan daha yüksek olmalıdır (Mevcut: %.2f)", currentPrice)
	}

	// Önceki lider teklif sahibini tespit et (OUTBID bildirimi ve kural kontrolü için)
	var previousBidderID int
	_ = tx.QueryRow(`SELECT bidder_id FROM bids WHERE listing_id = $1 ORDER BY amount DESC LIMIT 1`, listingID).Scan(&previousBidderID)

	if previousBidderID == bidderID {
		return nil, errors.New("En yüksek teklif zaten size ait. Kendi teklifinizin üzerine tekrar teklif veremezsiniz.")
	}

	var bid models.Bid
	bid.ListingID = listingID
	bid.BidderID = bidderID
	bid.Amount = amount

	insertBidQuery := `INSERT INTO bids (listing_id, bidder_id, amount, created_at) 
	                  VALUES ($1, $2, $3, NOW()) 
	                  RETURNING id, created_at`
	err = tx.QueryRow(insertBidQuery, listingID, bidderID, amount).Scan(&bid.ID, &bid.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("teklif kaydedilemedi: %w", err)
	}

	updatePriceQuery := `UPDATE listings SET current_price = $1 WHERE id = $2`
	_, err = tx.Exec(updatePriceQuery, amount, listingID)
	if err != nil {
		return nil, fmt.Errorf("ilan fiyatı güncellenemedi: %w", err)
	}

	// Teklif veren kullanıcının adını repo üzerinden çek
	var bidderName string
	if bidderUser, err := r.userRepo.GetByID(bidderID); err == nil && bidderUser != nil && bidderUser.Name != "" {
		bidderName = bidderUser.Name
	} else {
		bidderName = "Alıcı #" + strconv.Itoa(bidderID)
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("işlem onaylanamadı: %w", err)
	}

	return &models.PlaceBidResult{
		Bid:              bid,
		BidderName:       bidderName,
		PreviousBidderID: previousBidderID,
		CurrentPrice:     amount,
		ListingTitle:     listingTitle,
		SellerID:         sellerID,
	}, nil
}

func (r *PostgresBidRepository) GetBidsByListingID(listingID int) ([]models.BidDetailResponse, error) {
query := `SELECT b.id, b.listing_id, b.bidder_id, u.name, b.amount, b.created_at 
          FROM bids b 
          JOIN users u ON b.bidder_id = u.id 
          WHERE b.listing_id = $1 
          ORDER BY b.amount DESC, b.created_at DESC`

rows, err := r.db.Query(query, listingID)
if err != nil {
return nil, err
}
defer rows.Close()

bids := make([]models.BidDetailResponse, 0)
for rows.Next() {
var b models.BidDetailResponse
if err := rows.Scan(&b.ID, &b.ListingID, &b.BidderID, &b.BidderName, &b.Amount, &b.CreatedAt); err != nil {
return nil, err
}
bids = append(bids, b)
}
return bids, nil
}

// GetByBidderID, bir kullanıcının verdiği tüm tekliflerin geçmişini döner.
// (Daha önce UserRepository içindeydi; teklif verisi Bid domain'ine ait olduğu için buraya taşındı.)
func (r *PostgresBidRepository) GetByBidderID(bidderID int) ([]models.UserBidHistoryItem, error) {
query := `SELECT b.id, b.listing_id, l.title, l.brand, l.model, l.status, l.image_url, l.current_price, 
                 b.amount, b.created_at, l.end_time 
          FROM bids b 
          JOIN listings l ON b.listing_id = l.id 
          WHERE b.bidder_id = $1 
          ORDER BY b.created_at DESC`

rows, err := r.db.Query(query, bidderID)
if err != nil {
return nil, err
}
defer rows.Close()

myBids := make([]models.UserBidHistoryItem, 0)
for rows.Next() {
var item models.UserBidHistoryItem
err := rows.Scan(
&item.BidID, &item.ListingID, &item.ListingTitle, &item.Brand, &item.Model,
&item.ListingStatus, &item.ImageURL, &item.CurrentPrice, &item.MyBidAmount, &item.BidCreatedAt, &item.EndTime,
)
if err != nil {
return nil, err
}
myBids = append(myBids, item)
}
return myBids, nil
}
