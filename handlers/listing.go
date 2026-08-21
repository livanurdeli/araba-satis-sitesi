package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

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

func GetListings(w http.ResponseWriter, r *http.Request) {
	query := `SELECT id, seller_id, title, brand, model, year, description, 
	                 starting_price, current_price, status, image_url, start_time, end_time, created_at 
	          FROM listings WHERE 1=1`
	var args []interface{}
	argIdx := 1

	// Query Parametreleri
	brand := r.URL.Query().Get("brand")
	if brand != "" {
		query += fmt.Sprintf(" AND LOWER(brand) = LOWER($%d)", argIdx)
		args = append(args, brand)
		argIdx++
	}

	status := r.URL.Query().Get("status")
	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	minPriceStr := r.URL.Query().Get("min_price")
	if minPriceStr != "" {
		if minPrice, err := strconv.ParseFloat(minPriceStr, 64); err == nil {
			query += fmt.Sprintf(" AND current_price >= $%d", argIdx)
			args = append(args, minPrice)
			argIdx++
		}
	}

	maxPriceStr := r.URL.Query().Get("max_price")
	if maxPriceStr != "" {
		if maxPrice, err := strconv.ParseFloat(maxPriceStr, 64); err == nil {
			query += fmt.Sprintf(" AND current_price <= $%d", argIdx)
			args = append(args, maxPrice)
			argIdx++
		}
	}

	query += " ORDER BY created_at DESC"

	rows, err := repository.DB.Query(query, args...)
	if err != nil {
		http.Error(w, "İlanlar veritabanından çekilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	listings := make([]models.Listing, 0)
	for rows.Next() {
		var l models.Listing
		err := rows.Scan(
			&l.ID, &l.SellerID, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
			&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
		)
		if err != nil {
			http.Error(w, "Veri işlenirken hata oluştu: "+err.Error(), http.StatusInternalServerError)
			return
		}
		listings = append(listings, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(listings)
}

func GetListingByID(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		http.Error(w, "Geçersiz ilan ID", http.StatusBadRequest)
		return
	}

	query := `SELECT id, seller_id, title, brand, model, year, description, 
	                 starting_price, current_price, status, image_url, start_time, end_time, created_at 
	          FROM listings WHERE id = $1`

	var l models.Listing
	err = repository.DB.QueryRow(query, id).Scan(
		&l.ID, &l.SellerID, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
		&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
	)

	if err == sql.ErrNoRows {
		http.Error(w, "İlan bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(l)
}

func CreateListing(w http.ResponseWriter, r *http.Request) {
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

	// Fotoğraf da dahil olmak üzere zorunlu alan doğrulaması
	if req.Title == "" || req.Brand == "" || req.Model == "" || req.Year <= 1900 || req.StartingPrice <= 0 || req.ImageURL == "" {
		http.Error(w, "Başlık, marka, model, geçerli yıl, başlangıç fiyatı ve fotoğraf linki zorunludur", http.StatusBadRequest)
		return
	}

	if req.EndTime.Before(time.Now().Add(5 * time.Minute)) {
		http.Error(w, "Açık artırma bitiş süresi en az 5 dakika sonrası olmalıdır", http.StatusBadRequest)
		return
	}

	query := `INSERT INTO listings (
		seller_id, title, brand, model, year, description, 
		starting_price, current_price, status, image_url, start_time, end_time
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'active', $8, NOW(), $9)
	RETURNING id, current_price, status, image_url, start_time, created_at`

	var l models.Listing
	l.SellerID = userID
	l.Title = req.Title
	l.Brand = req.Brand
	l.Model = req.Model
	l.Year = req.Year
	l.Description = req.Description
	l.StartingPrice = req.StartingPrice
	l.ImageURL = req.ImageURL
	l.EndTime = req.EndTime

	err := repository.DB.QueryRow(
		query,
		userID, req.Title, req.Brand, req.Model, req.Year, req.Description, req.StartingPrice, req.ImageURL, req.EndTime,
	).Scan(&l.ID, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.CreatedAt)

	if err != nil {
		http.Error(w, "İlan oluşturulamadı: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(l)
}

func UpdateListing(w http.ResponseWriter, r *http.Request) {
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

	var sellerID int
	var status string
	err = repository.DB.QueryRow("SELECT seller_id, status FROM listings WHERE id = $1", id).Scan(&sellerID, &status)
	if err == sql.ErrNoRows {
		http.Error(w, "İlan bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası", http.StatusInternalServerError)
		return
	}

	if sellerID != userID {
		http.Error(w, "Bu ilanı güncelleme yetkiniz yok (Sadece ilan sahibi güncelleyebilir)", http.StatusForbidden)
		return
	}

	if status != "active" && status != "pending" {
		http.Error(w, "Süresi dolmuş veya satılmış ilanlar güncellenemez", http.StatusBadRequest)
		return
	}

	var req UpdateListingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz JSON verisi", http.StatusBadRequest)
		return
	}

	updateQuery := `UPDATE listings 
	                SET title = $1, brand = $2, model = $3, year = $4, description = $5, image_url = COALESCE(NULLIF($6, ''), image_url)
	                WHERE id = $7`
	_, err = repository.DB.Exec(updateQuery, req.Title, req.Brand, req.Model, req.Year, req.Description, req.ImageURL, id)
	if err != nil {
		http.Error(w, "İlan güncellenemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "İlan başarıyla güncellendi"})
}

func DeleteListing(w http.ResponseWriter, r *http.Request) {
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

	var sellerID int
	err = repository.DB.QueryRow("SELECT seller_id FROM listings WHERE id = $1", id).Scan(&sellerID)
	if err == sql.ErrNoRows {
		http.Error(w, "İlan bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası", http.StatusInternalServerError)
		return
	}

	if sellerID != userID {
		http.Error(w, "Bu ilanı silme yetkiniz yok", http.StatusForbidden)
		return
	}

	_, err = repository.DB.Exec("DELETE FROM listings WHERE id = $1", id)
	if err != nil {
		http.Error(w, "İlan silinemedi", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "İlan başarıyla silindi"})
}
