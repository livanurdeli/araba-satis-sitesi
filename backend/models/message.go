package models

import "time"

// Message alıcı ve satıcı arasındaki tek bir mesajı temsil eder
type Message struct {
	ID           int       `json:"id"`
	ListingID    int       `json:"listing_id"`
	ListingTitle string    `json:"listing_title,omitempty"`
	ListingImage string    `json:"listing_image,omitempty"`
	SenderID     int       `json:"sender_id"`
	SenderName   string    `json:"sender_name,omitempty"`
	ReceiverID   int       `json:"receiver_id"`
	ReceiverName string    `json:"receiver_name,omitempty"`
	Content      string    `json:"content"`
	IsRead       bool      `json:"is_read"`
	CreatedAt    time.Time `json:"created_at"`
}

// ConversationSummary sohbet listesinde gösterilen özet bilgiyi temsil eder
type ConversationSummary struct {
	ListingID       int       `json:"listing_id"`
	ListingTitle    string    `json:"listing_title"`
	ListingImage    string    `json:"listing_image"`
	ListingStatus   string    `json:"listing_status"`
	CurrentPrice    float64   `json:"current_price"`
	OtherUserID     int       `json:"other_user_id"`
	OtherUserName   string    `json:"other_user_name"`
	LastMessage     string    `json:"last_message"`
	LastMessageTime time.Time `json:"last_message_time"`
	UnreadCount     int       `json:"unread_count"`
}
