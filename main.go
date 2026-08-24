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

	"github.com/joho/godotenv"
)

func main() {
	// .env dosyasını yükle (varsa)
	_ = godotenv.Load()

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

	// 4. Repository'leri ve Handler'ları Dependency Injection ile oluştur
	userRepo := repository.NewUserRepository(db)
	listingRepo := repository.NewListingRepository(db)
	bidRepo := repository.NewBidRepository(db)
	msgRepo := repository.NewMessageRepository(db)

	authHandler := handlers.NewAuthHandler(userRepo)
	userHandler := handlers.NewUserHandler(userRepo)
	listingHandler := handlers.NewListingHandler(listingRepo)
	bidHandler := handlers.NewBidHandler(bidRepo)
	msgHandler := handlers.NewMessageHandler(msgRepo)

	// --- Auth Route'ları ---
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)

	// Profil Test Route'u
	mux.HandleFunc("GET /api/auth/me", middleware.AuthRequired(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Context().Value(middleware.UserIDKey).(int)
		role := r.Context().Value(middleware.RoleKey).(string)

		u, err := userRepo.GetByID(userID)
		name := ""
		email := ""
		if err == nil && u != nil {
			name = u.Name
			email = u.Email
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"user_id": userID,
			"name":    name,
			"email":   email,
			"role":    role,
			"status":  "Giriş yapılmış oturum aktif",
		})
	}))

	// --- İlan (Listing) Route'ları ---
	mux.HandleFunc("GET /api/listings", listingHandler.GetListings)
	mux.HandleFunc("GET /api/listings/{id}", listingHandler.GetListingByID)
	mux.HandleFunc("POST /api/listings", middleware.AuthRequired(listingHandler.CreateListing))
	mux.HandleFunc("PUT /api/listings/{id}", middleware.AuthRequired(listingHandler.UpdateListing))
	mux.HandleFunc("DELETE /api/listings/{id}", middleware.AuthRequired(listingHandler.DeleteListing))

	// --- Teklif (Bid) Route'ları ---
	mux.HandleFunc("POST /api/listings/{id}/bids", middleware.AuthRequired(bidHandler.PlaceBid))
	mux.HandleFunc("GET /api/listings/{id}/bids", bidHandler.GetListingBids)

	// --- Kullanıcı Paneli Route'ları ---
	mux.HandleFunc("GET /api/users/me/listings", middleware.AuthRequired(userHandler.GetMyListings))
	mux.HandleFunc("GET /api/users/me/bids", middleware.AuthRequired(userHandler.GetMyBids))

	// --- Mesajlaşma (Message) Route'ları ---
	mux.HandleFunc("POST /api/messages", middleware.AuthRequired(msgHandler.SendMessage))
	mux.HandleFunc("GET /api/messages/conversations", middleware.AuthRequired(msgHandler.GetConversations))
	mux.HandleFunc("GET /api/messages", middleware.AuthRequired(msgHandler.GetMessages))
	mux.HandleFunc("GET /api/messages/unread-count", middleware.AuthRequired(msgHandler.GetUnreadCount))

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

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}

	fmt.Printf("🚀 Sunucu http://localhost%s adresinde çalışıyor...\n", port)
	if err := http.ListenAndServe(port, handlerWithCORS); err != nil {
		log.Fatalf("Sunucu başlatılamadı: %v\n", err)
	}
}
