package models

import "time"

type Listing struct {
	ID            int       `json:"id"`
	SellerID      int       `json:"seller_id"`
	Title         string    `json:"title"`
	Brand         string    `json:"brand"`
	Model         string    `json:"model"`
	Year          int       `json:"year"`
	Description   string    `json:"description"`
	StartingPrice float64   `json:"starting_price"`
	CurrentPrice  float64   `json:"current_price"`
	Status        string    `json:"status"` // pending, active, ended, sold
	ImageURL      string    `json:"image_url"`
	StartTime     time.Time `json:"start_time"`
	EndTime       time.Time `json:"end_time"`
	CreatedAt     time.Time `json:"created_at"`
}
