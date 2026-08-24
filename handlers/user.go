package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"encoding/json"
	"net/http"
)

type UserHandler struct {
	userRepo repository.UserRepository
}

func NewUserHandler(userRepo repository.UserRepository) *UserHandler {
	return &UserHandler{userRepo: userRepo}
}

func (h *UserHandler) GetMyListings(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	listings, err := h.userRepo.GetMyListings(userID)
	if err != nil {
		http.Error(w, "İlanlarınız getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listings)
}

func (h *UserHandler) GetMyBids(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	myBids, err := h.userRepo.GetMyBids(userID)
	if err != nil {
		http.Error(w, "Teklifleriniz getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(myBids)
}
