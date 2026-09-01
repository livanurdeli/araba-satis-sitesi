package models

import "time"

type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"created_at"`
}

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
