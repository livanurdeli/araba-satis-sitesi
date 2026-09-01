package repository

import (
	"araba-satis-sitesi/models"
	"database/sql"
	"errors"
	"fmt"
)

type MessageRepository interface {
	CreateMessage(listingID int, senderID int, receiverID int, content string) (*models.Message, error)
	GetConversations(userID int) ([]models.ConversationSummary, error)
	GetMessages(listingID int, userID int, otherUserID int) ([]models.Message, error)
	GetUnreadCount(userID int) (int, error)
}

type PostgresMessageRepository struct {
	db       *sql.DB
	userRepo UserRepository
}

func NewMessageRepository(db *sql.DB, userRepo UserRepository) MessageRepository {
	return &PostgresMessageRepository{db: db, userRepo: userRepo}
}

func (r *PostgresMessageRepository) CreateMessage(listingID int, senderID int, receiverID int, content string) (*models.Message, error) {
	// İlanı ve satıcıyı kontrol et
	var sellerID int
	var listingTitle, listingImage string
	err := r.db.QueryRow(
		"SELECT seller_id, title, image_url FROM listings WHERE id = $1",
		listingID,
	).Scan(&sellerID, &listingTitle, &listingImage)

	if err == sql.ErrNoRows {
		return nil, errors.New("İlgili araç ilanı bulunamadı")
	} else if err != nil {
		return nil, fmt.Errorf("veritabanı hatası: %w", err)
	}

	// Eğer alıcı ID verilmemişse (0 ise):
	if receiverID <= 0 {
		if senderID != sellerID {
			receiverID = sellerID
		} else {
			return nil, errors.New("Satıcı olarak mesaj gönderirken alıcı kullanıcı belirtilmelidir")
		}
	}

	if receiverID == senderID {
		return nil, errors.New("Kendi kendinize mesaj gönderemezsiniz")
	}

	// Alıcı kullanıcının adını al
	receiverUser, err := r.userRepo.GetByID(receiverID)
	if err != nil || receiverUser == nil {
		return nil, errors.New("Alıcı kullanıcı bulunamadı")
	}
	receiverName := receiverUser.Name

	// Gönderen kullanıcının adını al
	var senderName string
	if senderUser, err := r.userRepo.GetByID(senderID); err == nil && senderUser != nil {
		senderName = senderUser.Name
	}

	var msg models.Message
	msg.ListingID = listingID
	msg.ListingTitle = listingTitle
	msg.ListingImage = listingImage
	msg.SenderID = senderID
	msg.SenderName = senderName
	msg.ReceiverID = receiverID
	msg.ReceiverName = receiverName
	msg.Content = content
	msg.IsRead = false

	insertQuery := `
		INSERT INTO messages (listing_id, sender_id, receiver_id, content, is_read, created_at)
		VALUES ($1, $2, $3, $4, FALSE, NOW())
		RETURNING id, created_at
	`
	err = r.db.QueryRow(insertQuery, msg.ListingID, msg.SenderID, msg.ReceiverID, msg.Content).
		Scan(&msg.ID, &msg.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("mesaj kaydedilemedi: %w", err)
	}

	return &msg, nil
}

func (r *PostgresMessageRepository) GetConversations(userID int) ([]models.ConversationSummary, error) {
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

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
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
			return nil, err
		}
		conversations = append(conversations, c)
	}

	return conversations, nil
}

func (r *PostgresMessageRepository) GetMessages(listingID int, userID int, otherUserID int) ([]models.Message, error) {
	// Eğer other_user_id verilmemişse, ilanın satıcısını bul
	if otherUserID <= 0 {
		var sellerID int
		err := r.db.QueryRow("SELECT seller_id FROM listings WHERE id = $1", listingID).Scan(&sellerID)
		if err != nil {
			return nil, errors.New("İlan bulunamadı")
		}
		if userID != sellerID {
			otherUserID = sellerID
		} else {
			return nil, errors.New("Satıcı olarak konuşmayı görüntülerken other_user_id belirtilmelidir")
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

	rows, err := r.db.Query(query, listingID, userID, otherUserID)
	if err != nil {
		return nil, err
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
			return nil, err
		}
		messages = append(messages, m)
	}

	// Karşı taraftan gelen okunmamış mesajları okundu yap
	updateReadQuery := `
		UPDATE messages 
		SET is_read = TRUE 
		WHERE listing_id = $1 AND sender_id = $2 AND receiver_id = $3 AND is_read = FALSE
	`
	_, _ = r.db.Exec(updateReadQuery, listingID, otherUserID, userID)

	return messages, nil
}

func (r *PostgresMessageRepository) GetUnreadCount(userID int) (int, error) {
	var count int
	err := r.db.QueryRow(
		"SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND is_read = FALSE",
		userID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
