package services

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"

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
					close(client.Send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// BroadcastNewBid yeni bir teklif verildiğinde ilgili ilanı izleyen herkese anında yayın yapar
func (h *Hub) BroadcastNewBid(listingID int, amount float64, bidderName string, bidderID int, previousBidderID int) {
	msg := WSMessage{
		Type:      "NEW_BID",
		ListingID: listingID,
		Payload: map[string]interface{}{
			"listing_id":  listingID,
			"amount":      amount,
			"bidder_name": bidderName,
			"bidder_id":   bidderID,
		},
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

		// Önceki lider teklif sahibine özel OUTBID (Teklifiniz Geçildi) bildirimi gönder
		if previousBidderID > 0 && client.UserID == previousBidderID && client.UserID != bidderID {
			outbidMsg, _ := json.Marshal(WSMessage{
				Type:      "OUTBID",
				ListingID: listingID,
				UserID:    previousBidderID,
				Payload: map[string]interface{}{
					"listing_id": listingID,
					"new_amount": amount,
					"message":    "Teklifiniz geçildi! Başka bir kullanıcı daha yüksek teklif verdi.",
				},
			})
			select {
			case client.Send <- outbidMsg:
			default:
			}
		}
	}
}

// BroadcastAuctionEnded açık artırma bittiğinde duyurur
func (h *Hub) BroadcastAuctionEnded(listingID int, winnerID int, winnerName string, finalPrice float64, listingTitle string) {
	msg := WSMessage{
		Type:      "AUCTION_ENDED",
		ListingID: listingID,
		Payload: map[string]interface{}{
			"listing_id":    listingID,
			"listing_title": listingTitle,
			"winner_id":     winnerID,
			"winner_name":   winnerName,
			"final_price":   finalPrice,
		},
	}

	data, _ := json.Marshal(msg)
	h.broadcast <- data
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

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
	defer c.Conn.Close()

	for {
		message, ok := <-c.Send
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
