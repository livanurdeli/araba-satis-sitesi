package models

import "time"

type Bid struct {
	ID        int       `json:"id"`
	ListingID int       `json:"listing_id"`
	BidderID  int       `json:"bidder_id"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

type BidDetailResponse struct {
	ID         int       `json:"id"`
	ListingID  int       `json:"listing_id"`
	BidderID   int       `json:"bidder_id"`
	BidderName string    `json:"bidder_name"`
	Amount     float64   `json:"amount"`
	CreatedAt  time.Time `json:"created_at"`
}

type PlaceBidResult struct {
	Bid              Bid
	BidderName       string
	PreviousBidderID int
	CurrentPrice     float64
	ListingTitle     string
	SellerID         int
}
