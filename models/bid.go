package models

import "time"

type Bid struct {
	ID        int       `json:"id"`
	ListingID int       `json:"listing_id"`
	BidderID  int       `json:"bidder_id"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}
