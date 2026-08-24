package services

import (
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

type AgentResponse struct {
	Reply           string           `json:"reply"`
	Recommendations []models.Listing `json:"recommendations,omitempty"`
	Suggestions     []string         `json:"suggestions,omitempty"`
}

type AIAgentService struct {
	listingRepo repository.ListingRepository
}

func NewAIAgentService(listingRepo repository.ListingRepository) *AIAgentService {
	return &AIAgentService{listingRepo: listingRepo}
}

func (s *AIAgentService) ProcessQuery(userMessage string, currentListingID int) (*AgentResponse, error) {
	msg := strings.ToLower(strings.TrimSpace(userMessage))

	// 1. İlan içi özel soru (Belirli bir ilanın detayındayken sorulmuşsa)
	if currentListingID > 0 && (strings.Contains(msg, "bu araç") || strings.Contains(msg, "alınır mı") || strings.Contains(msg, "fiyat nasıl") || strings.Contains(msg, "tavsiye")) {
		listing, err := s.listingRepo.GetByID(currentListingID)
		if err == nil && listing != nil {
			reply := fmt.Sprintf(
				"🔍 **%s %s (%d)** incelemesi:\n\n"+
					"• **Güncel Fiyat:** %.0f ₺\n"+
					"• **Durum:** %s\n"+
					"• **Açık Artırma Bitişi:** %s\n\n"+
					"💡 **Danışman Tavsiyesi:** Bu araç için teklif vermeden önce satıcıya mesaj atarak tramer/hasar kaydı ve son periyodik bakım detaylarını öğrenmenizi öneririm. Son dakikalarda fiyat hareketlenebileceğinden bütçenizi önceden belirleyin!",
				listing.Brand, listing.Model, listing.Year,
				listing.CurrentPrice,
				listing.Status,
				listing.EndTime.Format("02.01.2006 15:04"),
			)
			return &AgentResponse{
				Reply: reply,
				Suggestions: []string{
					"Bu araç için satıcıya ne sormalıyım?",
					"Ekspertizde nelere dikkat etmeliyim?",
					"Benzer bütçede başka araç var mı?",
				},
			}, nil
		}
	}

	// 2. Bütçe tespiti (Örn: "1500000", "1.500.000", "800 bin", "1 milyon", "2m", vb.)
	budget := parseBudget(msg)
	if budget > 0 {
		activeStatus := "active"
		maxPrice := budget * 1.05 // %5 esneklik
		listings, err := s.listingRepo.GetListings("", activeStatus, nil, &maxPrice)
		if err == nil && len(listings) > 0 {
			// En fazla 4 öneri döndür
			if len(listings) > 4 {
				listings = listings[:4]
			}
			reply := fmt.Sprintf(
				"🎯 **%.0f ₺ bütçeniz için en uygun açık artırmaları buldum:**\n\n"+
					"Şu an aktif mezatta olan ve bütçenize uyan %d harika fırsat var. İlan kartlarına tıklayarak detayları inceleyebilir ve hemen teklif verebilirsiniz!",
				budget, len(listings),
			)
			return &AgentResponse{
				Reply:           reply,
				Recommendations: listings,
				Suggestions: []string{
					"Ekspertiz raporunda nelere dikkat etmeliyim?",
					"Açık artırma nasıl kazanılır?",
					"Farklı bir bütçe belirle",
				},
			}, nil
		} else {
			return &AgentResponse{
				Reply: fmt.Sprintf(
					"🔍 Belirttiğiniz **%.0f ₺** bütçe aralığında şu an aktif bir ilan bulunamadı. "+
						"Ancak yeni ilanlar düzenli olarak ekleniyor! İsterseniz bütçenizi biraz artırabilir veya farklı bir marka belirtebilirsiniz.",
					budget,
				),
				Suggestions: []string{
					"Tüm aktif araçları listele",
					"Nasıl yeni ilan veririm?",
					"Popüler açık artırmalar",
				},
			}, nil
		}
	}

	// 3. Marka araması (Örn: "bmw var mı", "mercedes ilanları", "porsche")
	brands := []string{"bmw", "mercedes", "audi", "porsche", "volkswagen", "vw", "ford", "toyota", "renault", "fiat", "honda", "hyundai", "volvo"}
	for _, b := range brands {
		if strings.Contains(msg, b) {
			searchBrand := b
			if b == "vw" {
				searchBrand = "volkswagen"
			}
			listings, err := s.listingRepo.GetListings(searchBrand, "active", nil, nil)
			if err == nil && len(listings) > 0 {
				if len(listings) > 4 {
					listings = listings[:4]
				}
				return &AgentResponse{
					Reply: fmt.Sprintf(
						"🏎️ **%s marka aktif açık artırmalar:**\n\n"+
							"Şu an mezatta %d adet aktif %s ilanı bulunuyor. İncelemek istediğiniz aracın üzerine tıklayabilirsiniz:",
						strings.ToUpper(searchBrand), len(listings), strings.ToUpper(searchBrand),
					),
					Recommendations: listings,
					Suggestions: []string{
						"Bu markanın ekspertiz kontrol noktaları neler?",
						"Teklif verme taktikleri",
						"Bütçeme göre filtrele",
					},
				}, nil
			} else {
				return &AgentResponse{
					Reply: fmt.Sprintf(
						"🔍 Şu anda aktif mezatta **%s** marka ilan bulunamadı. "+
							"Dilerseniz diğer popüler markaların açık artırmalarına göz atabilir veya kendi aracınızı açık artırmaya çıkarabilirsiniz!",
						strings.ToUpper(searchBrand),
					),
					Suggestions: []string{
						"Tüm aktif açık artırmaları gör",
						"Yeni araç ilanı ver",
						"En uygun fiyatlı araçlar",
					},
				}, nil
			}
		}
	}

	// 4. Ekspertiz & Hasar & Kontrol Soruları
	if strings.Contains(msg, "ekspertiz") || strings.Contains(msg, "hasar") || strings.Contains(msg, "tramer") || strings.Contains(msg, "boya") || strings.Contains(msg, "değişen") || strings.Contains(msg, "kontrol") {
		reply := "📋 **Araç Alırken Hayati Ekspertiz Kontrol Noktaları:**\n\n" +
			"1. **Şasi, Direk ve Podye:** Aracın iskeletinde işlem olmaması en kritik güvenlik unsurudur.\n" +
			"2. **Motor ve Şanzıman Sağlığı:** Yağ kaçağı, üfleme, şanzıman vites geçişlerindeki vuruntular test edilmelidir.\n" +
			"3. **Tramer & Kilometre Orijinalliği:** Muayene kayıtları ve tramer sorgusu ile km doğrulanmalıdır.\n" +
			"4. **Satıcıyla İletişim:** İlan detay sayfasındaki **'Satıcıya Mesaj Gönder'** butonuyla ekspertiz raporunu talep edebilirsiniz!"

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Açık artırma nasıl kazanılır?",
				"1.000.000 ₺ altı araç öner",
				"Satıcıya güvenli mesaj nasıl atılır?",
			},
		}, nil
	}

	// 5. Açık Artırma / Teklif Stratejisi
	if strings.Contains(msg, "teklif") || strings.Contains(msg, "strateji") || strings.Contains(msg, "nasıl kazan") || strings.Contains(msg, "kazanmak") || strings.Contains(msg, "ihale") || strings.Contains(msg, "taktik") {
		reply := "⚡ **Açık Artırma Kazanma Taktikleri:**\n\n" +
			"• **Maksimum Sınırınızı Belirleyin:** Heyecana kapılmadan önce aracın piyasa değerine göre üst limitinizi netleştirin.\n" +
			"• **Canlı Yayını Takip Edin:** WebSocket canlı bağlantısı sayesinde teklifler ekranda anında güncellenir.\n" +
			"• **Son Dakika Hamlesi:** Süre bitimine yakın liderliği korumak için teklif geçmişini (`BidHistory`) izleyin.\n" +
			"• **Eşzamanlı Kilit Güvencesi:** Platformumuzda teklifler kilitli ve güvenli sırayla işlenir, teklif çakışması yaşanmaz."

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Şu anki canlı mezatları göster",
				"Ekspertiz tavsiyesi al",
				"Bütçeme uygun araç bul",
			},
		}, nil
	}

	// 6. İlan Verme & Satış Soruları
	if strings.Contains(msg, "ilan ver") || strings.Contains(msg, "satmak") || strings.Contains(msg, "nasıl satarım") || strings.Contains(msg, "aracımı sat") {
		reply := "🚗 **Aracınızı Açık Artırmayla Hızla Satın:**\n\n" +
			"1. Üst menüdeki **'Yeni İlan Ver'** butonuna tıklayın.\n" +
			"2. Araç marka, model, yıl ve başlangıç fiyatını girin.\n" +
			"3. Açık artırma süresini (10 dk, 1 saat, 1 gün vb.) belirleyin.\n" +
			"4. İlanınız canlı mezata çıksın, alıcılar yarışsın ve en yüksek teklife anında satın!"

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"İlan vermek için tıkla",
				"Alıcılarla nasıl mesajlaşırım?",
				"Teklif verme kuralları",
			},
		}, nil
	}

	// 7. Karşılama ve Genel Durum
	listings, _ := s.listingRepo.GetListings("", "active", nil, nil)
	activeCount := len(listings)
	var topRecommendations []models.Listing
	if activeCount > 0 {
		if activeCount > 3 {
			topRecommendations = listings[:3]
		} else {
			topRecommendations = listings
		}
	}

	reply := fmt.Sprintf(
		"👋 Merhaba! Ben **otopazar Yapay Zeka Danışmanı**.\n\n"+
			"Şu anda sistemimizde **%d adet aktif açık artırma** bulunuyor. "+
			"Bana bütçenizi söyleyebilir (*'1.500.000 TL bütçem var'*), araç modelleri hakkında tavsiye isteyebilir veya açık artırma kurallarını sorabilirsiniz!",
		activeCount,
	)

	return &AgentResponse{
		Reply:           reply,
		Recommendations: topRecommendations,
		Suggestions: []string{
			"Bütçeme uygun araç öner",
			"Ekspertizde nelere bakılmalı?",
			"BMW açık artırmaları",
			"Açık artırma tüyoları",
		},
	}, nil
}

// Bütçe metninden sayısal değeri ayıklar
func parseBudget(msg string) float64 {
	// "1.500.000", "1500000", "800000"
	reNumber := regexp.MustCompile(`(\d[\d\.\,]{2,}\d)`)
	match := reNumber.FindString(msg)
	if match != "" {
		cleaned := strings.ReplaceAll(match, ".", "")
		cleaned = strings.ReplaceAll(cleaned, ",", "")
		if val, err := strconv.ParseFloat(cleaned, 64); err == nil && val > 50000 {
			return val
		}
	}

	// "800 bin", "500bin", "1.2 milyon", "2 milyon"
	reMilyon := regexp.MustCompile(`([\d\.\,]+)\s*(milyon|m)`)
	mMatch := reMilyon.FindStringSubmatch(msg)
	if len(mMatch) > 1 {
		numStr := strings.ReplaceAll(mMatch[1], ",", ".")
		if val, err := strconv.ParseFloat(numStr, 64); err == nil {
			return val * 1000000
		}
	}

	reBin := regexp.MustCompile(`([\d\.\,]+)\s*(bin|k)`)
	bMatch := reBin.FindStringSubmatch(msg)
	if len(bMatch) > 1 {
		numStr := strings.ReplaceAll(bMatch[1], ",", ".")
		if val, err := strconv.ParseFloat(numStr, 64); err == nil {
			return val * 1000
		}
	}

	return 0
}
