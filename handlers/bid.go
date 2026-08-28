package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"araba-satis-sitesi/services"
	"encoding/json"
	"net/http"
	"strconv"
)

type BidHandler struct {
	bidRepo repository.BidRepository
}

func NewBidHandler(bidRepo repository.BidRepository) *BidHandler {
	return &BidHandler{bidRepo: bidRepo}
}

type PlaceBidRequest struct {
	Amount float64 `json:"amount"`
}

func (h *BidHandler) PlaceBid(w http.ResponseWriter, r *http.Request) {
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

	// Repository üzerinden eşzamanlı kilitli teklif verme
	result, err := h.bidRepo.PlaceBid(r.Context(), listingID, bidderID, req.Amount)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// WebSocket ile anında tüm bağlı kullanıcılara, teklif verene ve satıcıya canlı yayın yap
	go services.GlobalHub.BroadcastNewBid(
		listingID,
		result.CurrentPrice,
		result.BidderName,
		bidderID,
		result.PreviousBidderID,
		result.SellerID,
		result.ListingTitle,
	)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":       "Teklifiniz başarıyla verildi!",
		"bid":           result.Bid,
		"current_price": result.CurrentPrice,
		"bidder_name":   result.BidderName,
	})
}

func (h *BidHandler) GetListingBids(w http.ResponseWriter, r *http.Request) {
	listingIDStr := r.PathValue("id")
	listingID, err := strconv.Atoi(listingIDStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	bids, err := h.bidRepo.GetBidsByListingID(listingID)
	if err != nil {
		http.Error(w, "Teklifler getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bids)
}
