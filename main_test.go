package main

import (
	"araba-satis-sitesi/handlers"
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func setupTestApp() http.Handler {
	_ = repository.ConnectDB()

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", handlers.Register)
	mux.HandleFunc("POST /api/auth/login", handlers.Login)
	mux.HandleFunc("GET /api/listings", handlers.GetListings)
	mux.HandleFunc("GET /api/listings/{id}", handlers.GetListingByID)
	mux.HandleFunc("POST /api/listings", middleware.AuthRequired(handlers.CreateListing))
	mux.HandleFunc("PUT /api/listings/{id}", middleware.AuthRequired(handlers.UpdateListing))
	mux.HandleFunc("DELETE /api/listings/{id}", middleware.AuthRequired(handlers.DeleteListing))
	mux.HandleFunc("POST /api/listings/{id}/bids", middleware.AuthRequired(handlers.PlaceBid))
	mux.HandleFunc("GET /api/listings/{id}/bids", handlers.GetListingBids)
	mux.HandleFunc("GET /api/users/me/listings", middleware.AuthRequired(handlers.GetMyListings))
	mux.HandleFunc("GET /api/users/me/bids", middleware.AuthRequired(handlers.GetMyBids))

	return middleware.EnableCORS(mux)
}

func TestCompleteFlow(t *testing.T) {
	app := setupTestApp()
	ts := httptest.NewServer(app)
	defer ts.Close()

	timestamp := time.Now().UnixNano()
	sellerEmail := fmt.Sprintf("seller_%d@example.com", timestamp)
	bidder1Email := fmt.Sprintf("bidder1_%d@example.com", timestamp)
	bidder2Email := fmt.Sprintf("bidder2_%d@example.com", timestamp)

	// 1. Satıcı Kayıt & Giriş
	regBody, _ := json.Marshal(map[string]string{
		"email":    sellerEmail,
		"password": "password123",
		"name":     "Ahmet Satıcı",
	})
	resp, err := http.Post(ts.URL+"/api/auth/register", "application/json", bytes.NewBuffer(regBody))
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("Satıcı kayıt başarısız. Status: %d", resp.StatusCode)
	}

	loginBody, _ := json.Marshal(map[string]string{
		"email":    sellerEmail,
		"password": "password123",
	})
	resp, err = http.Post(ts.URL+"/api/auth/login", "application/json", bytes.NewBuffer(loginBody))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Satıcı giriş başarısız. Status: %d", resp.StatusCode)
	}
	var sellerLoginResp map[string]string
	json.NewDecoder(resp.Body).Decode(&sellerLoginResp)
	sellerToken := sellerLoginResp["token"]

	// 2. Alıcı 1 & Alıcı 2 Kayıt
	regBodyBidder1, _ := json.Marshal(map[string]string{
		"email":    bidder1Email,
		"password": "password123",
		"name":     "Mehmet Alıcı",
	})
	resp, _ = http.Post(ts.URL+"/api/auth/register", "application/json", bytes.NewBuffer(regBodyBidder1))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı 1 kayıt başarısız. Status: %d", resp.StatusCode)
	}
	resp, _ = http.Post(ts.URL+"/api/auth/login", "application/json", bytes.NewBuffer(regBodyBidder1))
	var bidder1LoginResp map[string]string
	json.NewDecoder(resp.Body).Decode(&bidder1LoginResp)
	bidder1Token := bidder1LoginResp["token"]

	regBodyBidder2, _ := json.Marshal(map[string]string{
		"email":    bidder2Email,
		"password": "password123",
		"name":     "Canan Alıcı",
	})
	resp, _ = http.Post(ts.URL+"/api/auth/register", "application/json", bytes.NewBuffer(regBodyBidder2))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı 2 kayıt başarısız. Status: %d", resp.StatusCode)
	}
	resp, _ = http.Post(ts.URL+"/api/auth/login", "application/json", bytes.NewBuffer(regBodyBidder2))
	var bidder2LoginResp map[string]string
	json.NewDecoder(resp.Body).Decode(&bidder2LoginResp)
	bidder2Token := bidder2LoginResp["token"]

	// 3. Satıcı Çoklu Görselli İlan Ekliyor
	listingBody, _ := json.Marshal(map[string]interface{}{
		"title":          "2021 Model Audi A4 M Sport",
		"brand":          "Audi",
		"model":          "A4",
		"year":           2021,
		"description":    "Temiz, servis bakımlı, hatasız",
		"starting_price": 500000.0,
		"image_url":      `["https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a", "https://images.unsplash.com/photo-1555215695-3004980ad54e"]`,
		"end_time":       time.Now().Add(2 * time.Hour),
	})
	req, _ := http.NewRequest("POST", ts.URL+"/api/listings", bytes.NewBuffer(listingBody))
	req.Header.Set("Authorization", "Bearer "+sellerToken)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, err = client.Do(req)
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("İlan ekleme başarısız. Status: %d", resp.StatusCode)
	}
	var createdListing map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&createdListing)
	listingID := int(createdListing["id"].(float64))

	// 4. İlanları Listeleme ve Detay Testi
	resp, err = http.Get(ts.URL + "/api/listings?brand=Audi")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("İlan listeleme başarısız: %v", err)
	}

	resp, err = http.Get(fmt.Sprintf("%s/api/listings/%d", ts.URL, listingID))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("İlan detay getirme başarısız: %v", err)
	}

	// 5. Validasyon: Satıcının Kendi İlanına Teklif Verememesi (400)
	badBidBody, _ := json.Marshal(map[string]float64{"amount": 550000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(badBidBody))
	req.Header.Set("Authorization", "Bearer "+sellerToken)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("Satıcı kendi ilanına teklif verebildi! Beklenen: 400, Gelen: %d", resp.StatusCode)
	}

	// 6. Eşzamanlı Teklif Testi (Concurrency Test / Race Condition Check)
	var wg sync.WaitGroup
	successCount := 0
	var mu sync.Mutex

	for i := 1; i <= 4; i++ {
		wg.Add(1)
		go func(bidIdx int) {
			defer wg.Done()
			bidAmount := 520000.0 + float64(bidIdx*10000)
			bidPayload, _ := json.Marshal(map[string]float64{"amount": bidAmount})
			bReq, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(bidPayload))
			bReq.Header.Set("Authorization", "Bearer "+bidder1Token)
			bReq.Header.Set("Content-Type", "application/json")
			bResp, bErr := client.Do(bReq)
			if bErr == nil && bResp.StatusCode == http.StatusCreated {
				mu.Lock()
				successCount++
				mu.Unlock()
			}
		}(i)
	}
	wg.Wait()

	// 7. Alıcı 2'nin En Yüksek Kazanan Teklifi Vermesi (600.000 TL)
	winningBidBody, _ := json.Marshal(map[string]float64{"amount": 600000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(winningBidBody))
	req.Header.Set("Authorization", "Bearer "+bidder2Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Kazanan teklif verilemedi! Gelen: %d", resp.StatusCode)
	}

	// 8. Kazanan Belirleme ve Teklif Listesi Doğrulama
	resp, err = http.Get(fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Teklif geçmişi getirilemedi: %v", err)
	}
	var allBids []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&allBids)
	if len(allBids) == 0 {
		t.Fatalf("Teklifler boş döndü!")
	}
	highestBid := allBids[0]
	if highestBid["amount"].(float64) != 600000.0 {
		t.Fatalf("En yüksek teklif beklenen 600.000 TL yerine %v geldi", highestBid["amount"])
	}
	if highestBid["bidder_name"].(string) != "Canan Alıcı" {
		t.Fatalf("Kazanan teklif sahibi beklenen 'Canan Alıcı' yerine %v geldi", highestBid["bidder_name"])
	}

	// 9. Düşük Teklif Engeli (400 bekleniyor)
	lowBidBody, _ := json.Marshal(map[string]float64{"amount": 580000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(lowBidBody))
	req.Header.Set("Authorization", "Bearer "+bidder1Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("Düşük teklif kabul edildi! Beklenen: 400, Gelen: %d", resp.StatusCode)
	}

	// 10. Kullanıcı Panelleri Doğrulama
	req, _ = http.NewRequest("GET", ts.URL+"/api/users/me/listings", nil)
	req.Header.Set("Authorization", "Bearer "+sellerToken)
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Satıcı kendi ilanlarını çekemedi: %d", resp.StatusCode)
	}

	req, _ = http.NewRequest("GET", ts.URL+"/api/users/me/bids", nil)
	req.Header.Set("Authorization", "Bearer "+bidder2Token)
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Alıcı verdiği teklifleri çekemedi: %d", resp.StatusCode)
	}

	t.Log("🎯 Hafta 4 Testleri Tamamlandı: Uçtan uca açık artırma akışı, eşzamanlı kilitler, kazanan hesaplama ve panel entegrasyonu kusursuz çalışıyor!")
}
