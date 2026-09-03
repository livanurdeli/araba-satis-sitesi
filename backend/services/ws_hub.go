package services

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Geliştirme ortamında tüm origin'lere izin ver
	},
}

// WSMessage WebSocket üzerinden gönderilen standart mesaj yapısı
type WSMessage struct {
	Type      string      `json:"type"` // NEW_BID, OUTBID, AUCTION_ENDED, SYSTEM
	ListingID int         `json:"listing_id,omitempty"`
	UserID    int         `json:"user_id,omitempty"`
	Payload   interface{} `json:"payload"`
}

// Client bağlı olan tek bir WebSocket bağlantısını temsil eder
type Client struct {
	Hub       *Hub
	Conn      *websocket.Conn
	Send      chan []byte
	ListingID int // İzlediği ilan ID'si (0 ise tümü)
	UserID    int // Oturum açmış kullanıcının ID'si
}

// Hub tüm aktif WebSocket istemcilerini ve mesaj dağıtımını yönetir
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

var GlobalHub = NewHub()

func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.Send)
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastNewBid yeni bir teklif verildiğinde ilgili ilanı izleyen herkese ve taraflara anında yayın yapar
func (h *Hub) BroadcastNewBid(listingID int, amount float64, bidderName string, bidderID int, previousBidderID int, sellerID int, listingTitle string) {
	bidPayload := map[string]interface{}{
		"listing_id":    listingID,
		"listing_title": listingTitle,
		"amount":        amount,
		"bidder_name":   bidderName,
		"bidder_id":     bidderID,
	}

	msg := WSMessage{
		Type:      "NEW_BID",
		ListingID: listingID,
		Payload:   bidPayload,
	}

	// Polling fallback için event buffer'a kaydet
	GlobalEventBuffer.Push("NEW_BID", listingID, 0, bidPayload)
	if sellerID > 0 && sellerID != bidderID {
		GlobalEventBuffer.Push("NEW_BID_SELLER", listingID, sellerID, bidPayload)
	}
	if previousBidderID > 0 && previousBidderID != bidderID {
		GlobalEventBuffer.Push("OUTBID", listingID, previousBidderID, map[string]interface{}{
			"listing_id":    listingID,
			"listing_title": listingTitle,
			"new_amount":    amount,
			"message":       "Teklifiniz geçildi! Başka bir kullanıcı daha yüksek teklif verdi.",
		})
	}

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		// İlanı izleyen herkese veya genel akışı dinleyenlere gönder
		if client.ListingID == listingID || client.ListingID == 0 {
			select {
			case client.Send <- data:
			default:
			}
		}

		// İlan sahibine yeni teklif bildirimi gönder
		if sellerID > 0 && sellerID != bidderID && client.UserID == sellerID {
			sellerMsg, _ := json.Marshal(WSMessage{
				Type:      "NEW_BID_SELLER",
				ListingID: listingID,
				UserID:    sellerID,
				Payload: map[string]interface{}{
					"listing_id":    listingID,
					"listing_title": listingTitle,
					"amount":        amount,
					"bidder_name":   bidderName,
					"message":       "İlanınıza yeni bir teklif geldi!",
				},
			})
			select {
			case client.Send <- sellerMsg:
			default:
			}
		}

		// Önceki lider teklif sahibine özel OUTBID (Teklifiniz Geçildi) bildirimi gönder
		if previousBidderID > 0 && client.UserID == previousBidderID && client.UserID != bidderID {
			outbidMsg, _ := json.Marshal(WSMessage{
				Type:      "OUTBID",
				ListingID: listingID,
				UserID:    previousBidderID,
				Payload: map[string]interface{}{
					"listing_id":    listingID,
					"listing_title": listingTitle,
					"new_amount":    amount,
					"message":       "Teklifiniz geçildi! Başka bir kullanıcı daha yüksek teklif verdi.",
				},
			})
			select {
			case client.Send <- outbidMsg:
			default:
			}
		}
	}
}

// BroadcastNewListing yeni bir ilan oluşturulduğunda tüm bağlı istemcilere anında duyurur
func (h *Hub) BroadcastNewListing(listing interface{}) {
	msg := WSMessage{
		Type:    "NEW_LISTING",
		Payload: listing,
	}

	// Polling fallback için event buffer'a kaydet
	GlobalEventBuffer.Push("NEW_LISTING", 0, 0, listing)

	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- data:
		default:
		}
	}
}

// BroadcastAuctionEnded açık artırma bittiğinde duyurur
func (h *Hub) BroadcastAuctionEnded(listingID int, winnerID int, winnerName string, finalPrice float64, listingTitle string) {
	auctionPayload := map[string]interface{}{
		"listing_id":    listingID,
		"listing_title": listingTitle,
		"winner_id":     winnerID,
		"winner_name":   winnerName,
		"final_price":   finalPrice,
	}

	msg := WSMessage{
		Type:      "AUCTION_ENDED",
		ListingID: listingID,
		Payload:   auctionPayload,
	}

	// Polling fallback için event buffer'a kaydet
	GlobalEventBuffer.Push("AUCTION_ENDED", listingID, 0, auctionPayload)

	data, _ := json.Marshal(msg)
	if data == nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.Send <- data:
		default:
		}
	}
}

// BroadcastNewMessage alıcı ve gönderene yeni mesaj iletimini anlık olarak WebSocket üzerinden gönderir
func (h *Hub) BroadcastNewMessage(msg interface{}, receiverID int, senderID int) {
	wsMsg := WSMessage{
		Type:    "NEW_MESSAGE",
		UserID:  receiverID,
		Payload: msg,
	}

	// Polling fallback için event buffer'a kaydet (hem alıcı hem gönderen için)
	GlobalEventBuffer.Push("NEW_MESSAGE", 0, receiverID, msg)
	if senderID != receiverID {
		GlobalEventBuffer.Push("NEW_MESSAGE", 0, senderID, msg)
	}

	data, err := json.Marshal(wsMsg)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.UserID == receiverID || client.UserID == senderID {
			select {
			case client.Send <- data:
			default:
			}
		}
	}
}

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
)

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}

		// İstemciden gelen oda / dinleme tercihlerini ayrıştır
		var req struct {
			Action    string `json:"action"` // subscribe
			ListingID int    `json:"listing_id"`
			UserID    int    `json:"user_id"`
		}
		if err := json.Unmarshal(message, &req); err == nil {
			if req.ListingID > 0 {
				c.ListingID = req.ListingID
			}
			if req.UserID > 0 {
				c.UserID = req.UserID
			}
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ServeWS WebSocket bağlantı isteğini karşılar ve istemciyi hub'a kaydeder
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket yükseltme hatası:", err)
		return
	}

	listingID, _ := strconv.Atoi(r.URL.Query().Get("listing_id"))
	userID, _ := strconv.Atoi(r.URL.Query().Get("user_id"))

	client := &Client{
		Hub:       hub,
		Conn:      conn,
		Send:      make(chan []byte, 256),
		ListingID: listingID,
		UserID:    userID,
	}

	client.Hub.register <- client

	go client.writePump()
	go client.readPump()
}
