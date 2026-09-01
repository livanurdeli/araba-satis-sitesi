package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"araba-satis-sitesi/services"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type MessageHandler struct {
	msgRepo repository.MessageRepository
}

func NewMessageHandler(msgRepo repository.MessageRepository) *MessageHandler {
	return &MessageHandler{msgRepo: msgRepo}
}

type SendMessageRequest struct {
	ListingID  int    `json:"listing_id"`
	ReceiverID int    `json:"receiver_id"`
	Content    string `json:"content"`
}

func (h *MessageHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	senderID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz istek gövdesi", http.StatusBadRequest)
		return
	}

	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		http.Error(w, "Mesaj içeriği boş olamaz", http.StatusBadRequest)
		return
	}

	if req.ListingID <= 0 {
		http.Error(w, "Geçerli bir ilan belirtilmelidir", http.StatusBadRequest)
		return
	}

	msg, err := h.msgRepo.CreateMessage(req.ListingID, senderID, req.ReceiverID, req.Content)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Canlı WebSocket bildirimi ilet
	services.GlobalHub.BroadcastNewMessage(*msg, msg.ReceiverID, senderID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

func (h *MessageHandler) GetConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	conversations, err := h.msgRepo.GetConversations(userID)
	if err != nil {
		http.Error(w, "Sohbetler getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

func (h *MessageHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	listingIDStr := r.URL.Query().Get("listing_id")
	listingID, err := strconv.Atoi(listingIDStr)
	if err != nil || listingID <= 0 {
		http.Error(w, "Geçerli bir listing_id parametresi gereklidir", http.StatusBadRequest)
		return
	}

	otherUserIDStr := r.URL.Query().Get("other_user_id")
	otherUserID, _ := strconv.Atoi(otherUserIDStr)

	messages, err := h.msgRepo.GetMessages(listingID, userID, otherUserID)
	if err != nil {
		http.Error(w, "Mesajlar getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *MessageHandler) GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	count, err := h.msgRepo.GetUnreadCount(userID)
	if err != nil {
		http.Error(w, "Okunmamış mesaj sayısı hesaplanamadı: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"unread_count": count})
}
