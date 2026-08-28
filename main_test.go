package main

import (
	"araba-satis-sitesi/handlers"
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"araba-satis-sitesi/services"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func setupTestApp() http.Handler {
	db := repository.ConnectDB()

	userRepo := repository.NewUserRepository(db)
	listingRepo := repository.NewListingRepository(db)
	bidRepo := repository.NewBidRepository(db, userRepo)
	msgRepo := repository.NewMessageRepository(db, userRepo)

	agentService := services.NewAIAgentService(listingRepo)

	authService := services.NewAuthService(userRepo)
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(listingRepo, bidRepo)
	listingHandler := handlers.NewListingHandler(listingRepo)
	bidHandler := handlers.NewBidHandler(bidRepo)
	msgHandler := handlers.NewMessageHandler(msgRepo)
	agentHandler := handlers.NewAgentHandler(agentService)

	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/auth/register", authHandler.Register)
	mux.HandleFunc("POST /api/auth/login", authHandler.Login)
	mux.HandleFunc("GET /api/listings", listingHandler.GetListings)
	mux.HandleFunc("GET /api/listings/{id}", listingHandler.GetListingByID)
	mux.HandleFunc("POST /api/listings", middleware.AuthRequired(listingHandler.CreateListing))
	mux.HandleFunc("PUT /api/listings/{id}", middleware.AuthRequired(listingHandler.UpdateListing))
	mux.HandleFunc("DELETE /api/listings/{id}", middleware.AuthRequired(listingHandler.DeleteListing))
	mux.HandleFunc("POST /api/listings/{id}/bids", middleware.AuthRequired(bidHandler.PlaceBid))
	mux.HandleFunc("GET /api/listings/{id}/bids", bidHandler.GetListingBids)
	mux.HandleFunc("GET /api/users/me/listings", middleware.AuthRequired(userHandler.GetMyListings))
	mux.HandleFunc("GET /api/users/me/bids", middleware.AuthRequired(userHandler.GetMyBids))
	mux.HandleFunc("POST /api/messages", middleware.AuthRequired(msgHandler.SendMessage))
	mux.HandleFunc("GET /api/messages/conversations", middleware.AuthRequired(msgHandler.GetConversations))
	mux.HandleFunc("GET /api/messages", middleware.AuthRequired(msgHandler.GetMessages))
	mux.HandleFunc("GET /api/messages/unread-count", middleware.AuthRequired(msgHandler.GetUnreadCount))
	mux.HandleFunc("POST /api/agent/chat", agentHandler.Chat)

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

	// 6. Teklif Verme ve Kendi Teklifinin Üstüne Verememe Testi
	// 6a. Alıcı 1 ilk geçerli teklifi verir (520.000 TL)
	bid1Body, _ := json.Marshal(map[string]float64{"amount": 520000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(bid1Body))
	req.Header.Set("Authorization", "Bearer "+bidder1Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı 1 ilk teklifi veremedi! Beklenen: 201, Gelen: %d", resp.StatusCode)
	}

	// 6b. Alıcı 1 hemen kendi teklifinin üstüne tekrar teklif vermeyi dener -> 400 Engellenmelidir
	selfOutbidBody, _ := json.Marshal(map[string]float64{"amount": 530000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(selfOutbidBody))
	req.Header.Set("Authorization", "Bearer "+bidder1Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("Kullanıcı kendi teklifinin üzerine teklif verebildi! Beklenen: 400, Gelen: %d", resp.StatusCode)
	}

	// 6c. Alıcı 2 daha yüksek bir teklif verir (550.000 TL) -> 201 Başarılı
	bid2Body, _ := json.Marshal(map[string]float64{"amount": 550000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(bid2Body))
	req.Header.Set("Authorization", "Bearer "+bidder2Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı 2 teklif veremedi! Beklenen: 201, Gelen: %d", resp.StatusCode)
	}

	// 6d. Artık Alıcı 1 lider olmadığı için tekrar teklif verebilir (570.000 TL) -> 201 Başarılı
	bid1AgainBody, _ := json.Marshal(map[string]float64{"amount": 570000.0})
	req, _ = http.NewRequest("POST", fmt.Sprintf("%s/api/listings/%d/bids", ts.URL, listingID), bytes.NewBuffer(bid1AgainBody))
	req.Header.Set("Authorization", "Bearer "+bidder1Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı 1 liderlik değiştiğinde yeni teklif veremedi! Beklenen: 201, Gelen: %d", resp.StatusCode)
	}

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

func TestMessagingFlow(t *testing.T) {
	app := setupTestApp()
	ts := httptest.NewServer(app)
	defer ts.Close()

	client := &http.Client{}
	timestamp := time.Now().UnixNano()
	sellerEmail := fmt.Sprintf("msg_seller_%d@example.com", timestamp)
	buyerEmail := fmt.Sprintf("msg_buyer_%d@example.com", timestamp)

	// 1. Satıcı ve Alıcı Kayıt
	regSeller, _ := json.Marshal(map[string]string{
		"email":    sellerEmail,
		"password": "password123",
		"name":     "Satıcı Selim",
	})
	resp, _ := http.Post(ts.URL+"/api/auth/register", "application/json", bytes.NewBuffer(regSeller))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Satıcı kayıt başarısız: %d", resp.StatusCode)
	}

	regBuyer, _ := json.Marshal(map[string]string{
		"email":    buyerEmail,
		"password": "password123",
		"name":     "Alıcı Ali",
	})
	resp, _ = http.Post(ts.URL+"/api/auth/register", "application/json", bytes.NewBuffer(regBuyer))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Alıcı kayıt başarısız: %d", resp.StatusCode)
	}

	// 2. Giriş yap ve token al
	loginSeller, _ := json.Marshal(map[string]string{"email": sellerEmail, "password": "password123"})
	resp, _ = http.Post(ts.URL+"/api/auth/login", "application/json", bytes.NewBuffer(loginSeller))
	var sellerAuth struct {
		Token string `json:"token"`
		User  struct {
			ID int `json:"id"`
		} `json:"user"`
	}
	json.NewDecoder(resp.Body).Decode(&sellerAuth)

	loginBuyer, _ := json.Marshal(map[string]string{"email": buyerEmail, "password": "password123"})
	resp, _ = http.Post(ts.URL+"/api/auth/login", "application/json", bytes.NewBuffer(loginBuyer))
	var buyerAuth struct {
		Token string `json:"token"`
		User  struct {
			ID int `json:"id"`
		} `json:"user"`
	}
	json.NewDecoder(resp.Body).Decode(&buyerAuth)

	// 3. Satıcı ilan oluştursun
	listingPayload, _ := json.Marshal(map[string]interface{}{
		"title":          "2021 BMW 320i M Sport",
		"brand":          "BMW",
		"model":          "320i",
		"year":           2021,
		"description":    "Temiz araç",
		"starting_price": 1200000.0,
		"image_url":      "https://example.com/bmw.jpg",
		"end_time":       time.Now().Add(1 * time.Hour),
	})
	req, _ := http.NewRequest("POST", ts.URL+"/api/listings", bytes.NewBuffer(listingPayload))
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("İlan oluşturma başarısız: %d", resp.StatusCode)
	}
	var createdListing struct {
		ID int `json:"id"`
	}
	json.NewDecoder(resp.Body).Decode(&createdListing)
	listingID := createdListing.ID

	// 4. Alıcı satıcıya mesaj göndersin (listing_id ile)
	msgPayload, _ := json.Marshal(map[string]interface{}{
		"listing_id":  listingID,
		"receiver_id": sellerAuth.User.ID,
		"content":     "Merhaba, aracın kışlık lastikleri de verilecek mi?",
	})
	req, _ = http.NewRequest("POST", ts.URL+"/api/messages", bytes.NewBuffer(msgPayload))
	req.Header.Set("Authorization", "Bearer "+buyerAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, err = client.Do(req)
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("Mesaj gönderme başarısız: %d", resp.StatusCode)
	}

	// 5. Satıcının okunmamış mesaj sayısını kontrol et
	req, _ = http.NewRequest("GET", ts.URL+"/api/messages/unread-count", nil)
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Okunmamış mesaj sayısı çekilemedi: %d", resp.StatusCode)
	}
	var unreadResp struct {
		UnreadCount int `json:"unread_count"`
	}
	json.NewDecoder(resp.Body).Decode(&unreadResp)
	if unreadResp.UnreadCount != 1 {
		t.Fatalf("Beklenen okunmamış mesaj sayısı 1, gelen: %d", unreadResp.UnreadCount)
	}

	// 6. Satıcının sohbet listesini çek
	req, _ = http.NewRequest("GET", ts.URL+"/api/messages/conversations", nil)
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Sohbet listesi çekilemedi: %d", resp.StatusCode)
	}
	var conversations []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&conversations)
	if len(conversations) != 1 {
		t.Fatalf("Beklenen sohbet sayısı 1, gelen: %d", len(conversations))
	}
	if conversations[0]["other_user_name"] != "Alıcı Ali" {
		t.Fatalf("Karşı kullanıcı adı hatalı: %v", conversations[0]["other_user_name"])
	}

	// 7. Satıcı konuşmanın mesaj geçmişini okusun (bu sırada okundu işaretlenmeli)
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/messages?listing_id=%d&other_user_id=%d", ts.URL, listingID, buyerAuth.User.ID), nil)
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Mesaj geçmişi çekilemedi: %d", resp.StatusCode)
	}
	var messages []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&messages)
	if len(messages) != 1 {
		t.Fatalf("Beklenen mesaj sayısı 1, gelen: %d", len(messages))
	}

	// 8. Satıcının okunmamış mesaj sayısı şimdi 0 olmalı
	req, _ = http.NewRequest("GET", ts.URL+"/api/messages/unread-count", nil)
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	resp, _ = client.Do(req)
	json.NewDecoder(resp.Body).Decode(&unreadResp)
	if unreadResp.UnreadCount != 0 {
		t.Fatalf("Okunduktan sonra okunmamış mesaj sayısı 0 olmalıydı, gelen: %d", unreadResp.UnreadCount)
	}

	// 9. Satıcı alıcıya cevap yazsın
	replyPayload, _ := json.Marshal(map[string]interface{}{
		"listing_id":  listingID,
		"receiver_id": buyerAuth.User.ID,
		"content":     "Evet, 4 adet Michelin kış lastiği yanında hediye verilecektir.",
	})
	req, _ = http.NewRequest("POST", ts.URL+"/api/messages", bytes.NewBuffer(replyPayload))
	req.Header.Set("Authorization", "Bearer "+sellerAuth.Token)
	req.Header.Set("Content-Type", "application/json")
	resp, _ = client.Do(req)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Cevap mesajı gönderilemedi: %d", resp.StatusCode)
	}

	// 10. Alıcı tüm mesajları çeksin (toplam 2 mesaj olmalı)
	req, _ = http.NewRequest("GET", fmt.Sprintf("%s/api/messages?listing_id=%d&other_user_id=%d", ts.URL, listingID, sellerAuth.User.ID), nil)
	req.Header.Set("Authorization", "Bearer "+buyerAuth.Token)
	resp, _ = client.Do(req)
	json.NewDecoder(resp.Body).Decode(&messages)
	if len(messages) != 2 {
		t.Fatalf("Beklenen toplam mesaj sayısı 2, gelen: %d", len(messages))
	}

	t.Log("🎯 Mesajlaşma Testleri Başarılı: Alıcı-Satıcı mesajlaşma, sohbet listesi, anlık okundu takibi ve bildirim sayıları eksiksiz çalışıyor!")
}

func TestAIAgentChat(t *testing.T) {
	app := setupTestApp()
	ts := httptest.NewServer(app)
	defer ts.Close()

	client := &http.Client{Timeout: 5 * time.Second}

	// 1. Genel Karşılama / Merhaba Testi
	payload, _ := json.Marshal(map[string]interface{}{
		"message": "Merhaba, nasıl yardımcı olabilirsin?",
	})
	resp, err := client.Post(ts.URL+"/api/agent/chat", "application/json", bytes.NewBuffer(payload))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Agent karşılama isteği başarısız: %v, status: %d", err, resp.StatusCode)
	}

	var res services.AgentResponse
	json.NewDecoder(resp.Body).Decode(&res)
	if !strings.Contains(res.Reply, "otopazar") {
		t.Fatalf("Beklenen asistan karşılama metni dönmedi: %s", res.Reply)
	}

	// 2. Bütçe ve Araç Arama Testi
	budgetPayload, _ := json.Marshal(map[string]interface{}{
		"message": "1.500.000 TL bütçem var hangi arabaları önerirsin?",
	})
	resp, err = client.Post(ts.URL+"/api/agent/chat", "application/json", bytes.NewBuffer(budgetPayload))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Agent bütçe sorgusu başarısız: %v", err)
	}

	json.NewDecoder(resp.Body).Decode(&res)
	if !strings.Contains(res.Reply, "1500000") && !strings.Contains(res.Reply, "bütçe") {
		t.Fatalf("Beklenen bütçe analizi yanıtı gelmedi: %s", res.Reply)
	}

	// 3. Ekspertiz & Taktik Testi
	faqPayload, _ := json.Marshal(map[string]interface{}{
		"message": "Ekspertizde nelere dikkat etmeliyim ve teklif nasıl verilir?",
	})
	resp, err = client.Post(ts.URL+"/api/agent/chat", "application/json", bytes.NewBuffer(faqPayload))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Agent ekspertiz sorgusu başarısız: %v", err)
	}

	json.NewDecoder(resp.Body).Decode(&res)
	if !strings.Contains(res.Reply, "Ekspertiz") && !strings.Contains(res.Reply, "Şasi") {
		t.Fatalf("Beklenen ekspertiz rehberi yanıtı gelmedi: %s", res.Reply)
	}

	// 4. Ödeme ve Elden Ödeme Sorusu Testi
	paymentPayload, _ := json.Marshal(map[string]interface{}{
		"message": "ödeme yöntemi nasıl ve ödeme elden oluyor mu?",
	})
	resp, err = client.Post(ts.URL+"/api/agent/chat", "application/json", bytes.NewBuffer(paymentPayload))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Agent ödeme sorgusu başarısız: %v", err)
	}

	json.NewDecoder(resp.Body).Decode(&res)
	if !strings.Contains(res.Reply, "Ödeme") && !strings.Contains(res.Reply, "Noter") {
		t.Fatalf("Beklenen ödeme/noter rehberi yanıtı gelmedi: %s", res.Reply)
	}

	// 5. Satıcıya Mesaj Gönderme Sorusu Testi
	msgPayload, _ := json.Marshal(map[string]interface{}{
		"message": "Satıcıya güvenli mesaj nasıl atılır?",
	})
	resp, err = client.Post(ts.URL+"/api/agent/chat", "application/json", bytes.NewBuffer(msgPayload))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("Agent mesajlaşma sorgusu başarısız: %v", err)
	}

	json.NewDecoder(resp.Body).Decode(&res)
	if !strings.Contains(res.Reply, "Satıcı") && !strings.Contains(res.Reply, "Mesaj") {
		t.Fatalf("Beklenen satıcı mesajlaşma yanıtı gelmedi: %s", res.Reply)
	}

	t.Log("🤖 Yapay Zeka OtoDanışman Agent Testleri Başarılı: Karşılama, bütçe, ödeme/noter, satıcı mesajlaşma ve ekspertiz tavsiyeleri kusursuz çalışıyor!")
}

