package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"
)

type ListingHandler struct {
	listingRepo repository.ListingRepository
}

func NewListingHandler(listingRepo repository.ListingRepository) *ListingHandler {
	return &ListingHandler{listingRepo: listingRepo}
}

type CreateListingRequest struct {
	Title         string    `json:"title"`
	Brand         string    `json:"brand"`
	Model         string    `json:"model"`
	Year          int       `json:"year"`
	Description   string    `json:"description"`
	StartingPrice float64   `json:"starting_price"`
	ImageURL      string    `json:"image_url"`
	EndTime       time.Time `json:"end_time"`
}

type UpdateListingRequest struct {
	Title       string `json:"title"`
	Brand       string `json:"brand"`
	Model       string `json:"model"`
	Year        int    `json:"year"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
}

func (h *ListingHandler) GetListings(w http.ResponseWriter, r *http.Request) {
	brand := r.URL.Query().Get("brand")
	status := r.URL.Query().Get("status")

	var minPrice *float64
	minPriceStr := r.URL.Query().Get("min_price")
	if minPriceStr != "" {
		if val, err := strconv.ParseFloat(minPriceStr, 64); err == nil {
			minPrice = &val
		}
	}

	var maxPrice *float64
	maxPriceStr := r.URL.Query().Get("max_price")
	if maxPriceStr != "" {
		if val, err := strconv.ParseFloat(maxPriceStr, 64); err == nil {
			maxPrice = &val
		}
	}

	listings, err := h.listingRepo.GetListings(brand, status, minPrice, maxPrice)
	if err != nil {
		http.Error(w, "İlanlar veritabanından çekilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listings)
}

func (h *ListingHandler) GetListingByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	listing, err := h.listingRepo.GetByID(id)
	if err == sql.ErrNoRows {
		http.Error(w, "İlan bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listing)
}

func (h *ListingHandler) CreateListing(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	var req CreateListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz JSON verisi", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Brand == "" || req.Model == "" || req.Year <= 1900 || req.StartingPrice <= 0 || req.ImageURL == "" {
		http.Error(w, "Başlık, marka, model, geçerli yıl, başlangıç fiyatı ve fotoğraf linki zorunludur", http.StatusBadRequest)
		return
	}

	if req.EndTime.Before(time.Now().Add(5 * time.Minute)) {
		http.Error(w, "Açık artırma bitiş süresi en az 5 dakika sonrası olmalıdır", http.StatusBadRequest)
		return
	}

	listing, err := h.listingRepo.Create(
		userID, req.Title, req.Brand, req.Model, req.Year, req.Description,
		req.StartingPrice, req.ImageURL, req.EndTime,
	)
	if err != nil {
		http.Error(w, "İlan veritabanına eklenemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(listing)
}

func (h *ListingHandler) UpdateListing(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	var req UpdateListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz JSON verisi", http.StatusBadRequest)
		return
	}

	if req.Title == "" || req.Brand == "" || req.Model == "" || req.Year <= 1900 {
		http.Error(w, "Başlık, marka, model ve geçerli yıl zorunludur", http.StatusBadRequest)
		return
	}

	listing, err := h.listingRepo.Update(id, userID, req.Title, req.Brand, req.Model, req.Year, req.Description, req.ImageURL)
	if err != nil {
		if err.Error() == "unauthorized" {
			http.Error(w, "Bu ilanı düzenleme yetkiniz yok", http.StatusForbidden)
			return
		} else if err == sql.ErrNoRows {
			http.Error(w, "İlan bulunamadı", http.StatusNotFound)
			return
		}
		http.Error(w, "İlan güncellenemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listing)
}

func (h *ListingHandler) DeleteListing(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	err = h.listingRepo.Delete(id, userID)
	if err != nil {
		if err.Error() == "unauthorized" {
			http.Error(w, "Bu ilanı silme yetkiniz yok", http.StatusForbidden)
			return
		} else if err == sql.ErrNoRows {
			http.Error(w, "İlan bulunamadı", http.StatusNotFound)
			return
		}
		http.Error(w, "İlan silinemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "İlan başarıyla silindi",
	})
}
