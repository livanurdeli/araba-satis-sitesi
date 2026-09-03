package services

import (
	"encoding/json"
	"sync"
	"time"
)

// EventEntry polling istemcilerine sunulan tek bir olay kaydı
type EventEntry struct {
	SeqID     int64       `json:"seq_id"`
	Type      string      `json:"type"`
	ListingID int         `json:"listing_id,omitempty"`
	UserID    int         `json:"user_id,omitempty"`
	Payload   interface{} `json:"payload"`
	CreatedAt time.Time   `json:"created_at"`
}

// EventBuffer son N saniyedeki olayları bellekte tutar (ring buffer)
type EventBuffer struct {
	mu      sync.RWMutex
	events  []EventEntry
	maxSize int
	maxAge  time.Duration
	nextSeq int64
}

// NewEventBuffer yeni bir event buffer oluşturur
func NewEventBuffer(maxSize int, maxAge time.Duration) *EventBuffer {
	eb := &EventBuffer{
		events:  make([]EventEntry, 0, maxSize),
		maxSize: maxSize,
		maxAge:  maxAge,
		nextSeq: 1,
	}

	// Eski event'leri periyodik olarak temizle
	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			eb.cleanup()
		}
	}()

	return eb
}

// Push yeni bir olay ekler
func (eb *EventBuffer) Push(eventType string, listingID int, userID int, payload interface{}) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	entry := EventEntry{
		SeqID:     eb.nextSeq,
		Type:      eventType,
		ListingID: listingID,
		UserID:    userID,
		Payload:   payload,
		CreatedAt: time.Now(),
	}
	eb.nextSeq++

	eb.events = append(eb.events, entry)

	// Boyut sınırını aş → en eski olayları at
	if len(eb.events) > eb.maxSize {
		eb.events = eb.events[len(eb.events)-eb.maxSize:]
	}
}

// GetSince belirtilen sequence ID'den sonraki olayları filtreli olarak döndürür
// userID > 0 ise: sadece o kullanıcıya yönelik + genel (UserID == 0) olaylar
// listingID > 0 ise: sadece o ilana ait + genel (ListingID == 0) olaylar
func (eb *EventBuffer) GetSince(sinceSeqID int64, userID int, listingID int) []EventEntry {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	var result []EventEntry
	for _, e := range eb.events {
		if e.SeqID <= sinceSeqID {
			continue
		}

		// Filtreleme mantığı: olayın hedef kitlesine uygun mu?
		match := false

		// Genel yayın olayları (listing bazlı): NEW_BID, NEW_LISTING, AUCTION_ENDED
		switch e.Type {
		case "NEW_BID", "NEW_LISTING", "AUCTION_ENDED":
			// listingID filtresi varsa sadece o ilana ait olanları al
			if listingID > 0 {
				if e.ListingID == listingID || e.ListingID == 0 {
					match = true
				}
			} else {
				// listingID filtresi yoksa tümünü al
				match = true
			}

		case "NEW_BID_SELLER", "OUTBID", "NEW_MESSAGE":
			// Kullanıcıya özel olaylar
			if userID > 0 && e.UserID == userID {
				match = true
			}
		default:
			// Bilinmeyen tip → genel yayın gibi davran
			match = true
		}

		if match {
			result = append(result, e)
		}
	}

	return result
}

// GetLatestSeqID mevcut en yüksek sequence ID'yi döndürür
func (eb *EventBuffer) GetLatestSeqID() int64 {
	eb.mu.RLock()
	defer eb.mu.RUnlock()
	if eb.nextSeq <= 1 {
		return 0
	}
	return eb.nextSeq - 1
}

// cleanup eski event'leri temizler
func (eb *EventBuffer) cleanup() {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	cutoff := time.Now().Add(-eb.maxAge)
	idx := 0
	for idx < len(eb.events) && eb.events[idx].CreatedAt.Before(cutoff) {
		idx++
	}
	if idx > 0 {
		eb.events = eb.events[idx:]
	}
}

// ToJSON event listesini JSON'a çevirir
func EventsToJSON(events []EventEntry) ([]byte, error) {
	return json.Marshal(events)
}

// GlobalEventBuffer tüm uygulama genelinde paylaşılan event buffer
// 2000 olay kapasiteli, 60 saniye max yaşam süresi
var GlobalEventBuffer = NewEventBuffer(2000, 60*time.Second)
