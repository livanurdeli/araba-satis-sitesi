package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"araba-satis-sitesi/services"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type SendMessageRequest struct {
	ListingID  int    `json:"listing_id"`
	ReceiverID int    `json:"receiver_id"`
	Content    string `json:"content"`
}

// SendMessage yeni bir mesaj gönderir ve alıcıya canlı WebSocket bildirimi iletir
func SendMessage(w http.ResponseWriter, r *http.Request) {
	senderID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz istek gövdesi", http.StatusBadRequest)
		return
	}

	req.Content = strings.TrimSpace(req.Content)
	if req.Content == "" {
		http.Error(w, "Mesaj içeriği boş olamaz", http.StatusBadRequest)
		return
	}

	if req.ListingID <= 0 {
		http.Error(w, "Geçerli bir ilan belirtilmelidir", http.StatusBadRequest)
		return
	}

	// İlanı ve satıcıyı kontrol et
	var sellerID int
	var listingTitle, listingImage string
	err := repository.DB.QueryRow(
		"SELECT seller_id, title, image_url FROM listings WHERE id = $1",
		req.ListingID,
	).Scan(&sellerID, &listingTitle, &listingImage)

	if err == sql.ErrNoRows {
		http.Error(w, "İlgili araç ilanı bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Eğer alıcı ID verilmemişse:
	// Gönderen satıcı değilse alıcı otomatik olarak satıcıdır.
	if req.ReceiverID <= 0 {
		if senderID != sellerID {
			req.ReceiverID = sellerID
		} else {
			http.Error(w, "Satıcı olarak mesaj gönderirken alıcı kullanıcı belirtilmelidir", http.StatusBadRequest)
			return
		}
	}

	if req.ReceiverID == senderID {
		http.Error(w, "Kendi kendinize mesaj gönderemezsiniz", http.StatusBadRequest)
		return
	}

	// Alıcı kullanıcının varlığını kontrol et
	var receiverName string
	err = repository.DB.QueryRow("SELECT name FROM users WHERE id = $1", req.ReceiverID).Scan(&receiverName)
	if err == sql.ErrNoRows {
		http.Error(w, "Alıcı kullanıcı bulunamadı", http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, "Veritabanı hatası: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Gönderen kullanıcının adını al
	var senderName string
	_ = repository.DB.QueryRow("SELECT name FROM users WHERE id = $1", senderID).Scan(&senderName)

	// Mesajı veritabanına kaydet
	var msg models.Message
	msg.ListingID = req.ListingID
	msg.ListingTitle = listingTitle
	msg.ListingImage = listingImage
	msg.SenderID = senderID
	msg.SenderName = senderName
	msg.ReceiverID = req.ReceiverID
	msg.ReceiverName = receiverName
	msg.Content = req.Content
	msg.IsRead = false

	insertQuery := `
		INSERT INTO messages (listing_id, sender_id, receiver_id, content, is_read, created_at)
		VALUES ($1, $2, $3, $4, FALSE, NOW())
		RETURNING id, created_at
	`
	err = repository.DB.QueryRow(insertQuery, msg.ListingID, msg.SenderID, msg.ReceiverID, msg.Content).
		Scan(&msg.ID, &msg.CreatedAt)
	if err != nil {
		http.Error(w, "Mesaj kaydedilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Canlı WebSocket bildirimi ilet
	services.GlobalHub.BroadcastNewMessage(msg, req.ReceiverID, senderID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

// GetConversations kullanıcının dahil olduğu tüm sohbet özetlerini getirir
func GetConversations(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	query := `
		WITH user_conversations AS (
			SELECT 
				m.id,
				m.listing_id,
				CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_user_id,
				m.content,
				m.is_read,
				m.sender_id,
				m.created_at,
				ROW_NUMBER() OVER (
					PARTITION BY m.listing_id, 
					CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END 
					ORDER BY m.created_at DESC
				) as rn
			FROM messages m
			WHERE m.sender_id = $1 OR m.receiver_id = $1
		)
		SELECT 
			uc.listing_id,
			l.title AS listing_title,
			l.image_url AS listing_image,
			l.status AS listing_status,
			l.current_price,
			uc.other_user_id,
			u.name AS other_user_name,
			uc.content AS last_message,
			uc.created_at AS last_message_time,
			(
				SELECT COUNT(*) 
				FROM messages unread 
				WHERE unread.listing_id = uc.listing_id 
				  AND unread.sender_id = uc.other_user_id 
				  AND unread.receiver_id = $1 
				  AND unread.is_read = FALSE
			) AS unread_count
		FROM user_conversations uc
		JOIN listings l ON uc.listing_id = l.id
		JOIN users u ON uc.other_user_id = u.id
		WHERE uc.rn = 1
		ORDER BY uc.created_at DESC
	`

	rows, err := repository.DB.Query(query, userID)
	if err != nil {
		http.Error(w, "Sohbetler getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	conversations := make([]models.ConversationSummary, 0)
	for rows.Next() {
		var c models.ConversationSummary
		err := rows.Scan(
			&c.ListingID,
			&c.ListingTitle,
			&c.ListingImage,
			&c.ListingStatus,
			&c.CurrentPrice,
			&c.OtherUserID,
			&c.OtherUserName,
			&c.LastMessage,
			&c.LastMessageTime,
			&c.UnreadCount,
		)
		if err != nil {
			http.Error(w, "Veri okunurken hata: "+err.Error(), http.StatusInternalServerError)
			return
		}
		conversations = append(conversations, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(conversations)
}

// GetMessages belirli bir ilan ve kullanıcı arasındaki mesajlaşma geçmişini getirir ve okundu yapar
func GetMessages(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	listingIDStr := r.URL.Query().Get("listing_id")
	listingID, err := strconv.Atoi(listingIDStr)
	if err != nil || listingID <= 0 {
		http.Error(w, "Geçerli bir listing_id parametresi gereklidir", http.StatusBadRequest)
		return
	}

	otherUserIDStr := r.URL.Query().Get("other_user_id")
	otherUserID, _ := strconv.Atoi(otherUserIDStr)

	// Eğer other_user_id verilmemişse, ilanın satıcısını bul
	if otherUserID <= 0 {
		var sellerID int
		err := repository.DB.QueryRow("SELECT seller_id FROM listings WHERE id = $1", listingID).Scan(&sellerID)
		if err != nil {
			http.Error(w, "İlan bulunamadı", http.StatusNotFound)
			return
		}
		if userID != sellerID {
			otherUserID = sellerID
		} else {
			http.Error(w, "Satıcı olarak konuşmayı görüntülerken other_user_id belirtilmelidir", http.StatusBadRequest)
			return
		}
	}

	query := `
		SELECT 
			m.id, m.listing_id, l.title, l.image_url,
			m.sender_id, u_sender.name,
			m.receiver_id, u_receiver.name,
			m.content, m.is_read, m.created_at
		FROM messages m
		JOIN listings l ON m.listing_id = l.id
		JOIN users u_sender ON m.sender_id = u_sender.id
		JOIN users u_receiver ON m.receiver_id = u_receiver.id
		WHERE m.listing_id = $1
		  AND (
			(m.sender_id = $2 AND m.receiver_id = $3) OR
			(m.sender_id = $3 AND m.receiver_id = $2)
		  )
		ORDER BY m.created_at ASC
	`

	rows, err := repository.DB.Query(query, listingID, userID, otherUserID)
	if err != nil {
		http.Error(w, "Mesajlar getirilemedi: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := make([]models.Message, 0)
	for rows.Next() {
		var m models.Message
		err := rows.Scan(
			&m.ID, &m.ListingID, &m.ListingTitle, &m.ListingImage,
			&m.SenderID, &m.SenderName,
			&m.ReceiverID, &m.ReceiverName,
			&m.Content, &m.IsRead, &m.CreatedAt,
		)
		if err != nil {
			http.Error(w, "Veri okunurken hata: "+err.Error(), http.StatusInternalServerError)
			return
		}
		messages = append(messages, m)
	}

	// Karşı taraftan bize gelen okunmamış mesajları okundu olarak güncelle
	updateReadQuery := `
		UPDATE messages 
		SET is_read = TRUE 
		WHERE listing_id = $1 AND sender_id = $2 AND receiver_id = $3 AND is_read = FALSE
	`
	_, _ = repository.DB.Exec(updateReadQuery, listingID, otherUserID, userID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// GetUnreadCount kullanıcının toplam okunmamış mesaj sayısını döner
func GetUnreadCount(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	var count int
	err := repository.DB.QueryRow(
		"SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE",
		userID,
	).Scan(&count)

	if err != nil {
		http.Error(w, "Okunmamış mesaj sayısı hesaplanamadı: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int{"unread_count": count})
}
