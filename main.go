package main

import (
	"araba-satis-sitesi/handlers"
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"araba-satis-sitesi/services"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	// 1. Veritabanına bağlan
	db := repository.ConnectDB()
	defer db.Close()

	fmt.Println(" Veritabanı bağlantısı hazır!")

	// 2. Arka plan açık artırma zamanlayıcısını başlat (30 saniyede bir kontrol eder)
	services.StartAuctionWatcher(db, 30*time.Second)

	// 3. WebSocket Hub'ını arka planda başlat
	go services.GlobalHub.Run()

	// Uploads klasörünü garanti et
	_ = os.MkdirAll("./uploads", os.ModePerm)

	mux := http.NewServeMux()

	// --- WebSocket Route'u ---
	mux.HandleFunc("GET /ws", func(w http.ResponseWriter, r *http.Request) {
		services.ServeWS(services.GlobalHub, w, r)
	})

	// --- Medya Yükleme (Upload) Route'u ---
	mux.HandleFunc("POST /api/upload", middleware.AuthRequired(handlers.UploadHandler))

	// --- Fiziksel Yüklenen Dosyaları Sunma (/uploads/...) ---
	uploadsServer := http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads")))
	mux.Handle("GET /uploads/", uploadsServer)

	// --- Auth Route'ları ---
	mux.HandleFunc("POST /api/auth/register", handlers.Register)
	mux.HandleFunc("POST /api/auth/login", handlers.Login)

	// Profil Test Route'u
	mux.HandleFunc("GET /api/auth/me", middleware.AuthRequired(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(middleware.UserIDKey).(int)
		role := r.Context().Value(middleware.RoleKey).(string)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user_id": userID,
			"role":    role,
			"status":  "Giriş yapılmış oturum aktif",
		})
	}))

	// --- İlan (Listing) Route'ları ---
	mux.HandleFunc("GET /api/listings", handlers.GetListings)
	mux.HandleFunc("GET /api/listings/{id}", handlers.GetListingByID)
	mux.HandleFunc("POST /api/listings", middleware.AuthRequired(handlers.CreateListing))
	mux.HandleFunc("PUT /api/listings/{id}", middleware.AuthRequired(handlers.UpdateListing))
	mux.HandleFunc("DELETE /api/listings/{id}", middleware.AuthRequired(handlers.DeleteListing))

	// --- Teklif (Bid) Route'ları ---
	mux.HandleFunc("POST /api/listings/{id}/bids", middleware.AuthRequired(handlers.PlaceBid))
	mux.HandleFunc("GET /api/listings/{id}/bids", handlers.GetListingBids)

	// --- Kullanıcı Paneli Route'ları ---
	mux.HandleFunc("GET /api/users/me/listings", middleware.AuthRequired(handlers.GetMyListings))
	mux.HandleFunc("GET /api/users/me/bids", middleware.AuthRequired(handlers.GetMyBids))

	// --- React SPA Statik Dosya Sunucusu (Frontend/dist) ---
	fileServer := http.FileServer(http.Dir("./frontend/dist"))
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api") || strings.HasPrefix(r.URL.Path, "/uploads") {
			http.NotFound(w, r)
			return
		}

		filePath := "./frontend/dist" + r.URL.Path
		// Dosya yoksa veya dizin köküyse index.html döndür (React Router için)
		if fi, err := os.Stat(filePath); os.IsNotExist(err) || fi.IsDir() {
			http.ServeFile(w, r, "./frontend/dist/index.html")
			return
		}

		fileServer.ServeHTTP(w, r)
	})

	// CORS desteğini ekle
	handlerWithCORS := middleware.EnableCORS(mux)

	port := ":8080"
	fmt.Printf("🚀 Sunucu http://localhost%s adresinde çalışıyor...\n", port)
	if err := http.ListenAndServe(port, handlerWithCORS); err != nil {
		log.Fatalf("Sunucu başlatılamadı: %v\n", err)
	}
}
