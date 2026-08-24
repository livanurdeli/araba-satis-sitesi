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
	rawMsg := strings.TrimSpace(userMessage)
	msg := strings.ToLower(rawMsg)

	// 1. İlan İçi Özel Değerlendirme (Bir ilanın detay sayfasındayken sorulmuşsa)
	if currentListingID > 0 && (strings.Contains(msg, "bu araç") || strings.Contains(msg, "alınır mı") || strings.Contains(msg, "fiyat nasıl") || strings.Contains(msg, "tavsiye") || strings.Contains(msg, "nasıl bir araba")) {
		listing, err := s.listingRepo.GetByID(currentListingID)
		if err == nil && listing != nil {
			reply := fmt.Sprintf(
				"🔍 **%s %s (%d)** Özel İncelemesi:\n\n"+
					"• **Güncel Teklif:** %.0f ₺\n"+
					"• **Durum:** %s\n"+
					"• **İhale Bitiş Zamanı:** %s\n\n"+
					"💡 **Danışman Görüşü:** Bu araç için teklif vermeden önce satıcıya mesaj göndererek son bakım tarihi, tramer/boya durumu ve yedek anahtar varlığını teyit etmenizi öneririm. Süre bitimine yakın rekabet artabileceğinden bütçenizi önceden planlayın!",
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
					"Ödeme ve noter devri nasıl yapılıyor?",
				},
			}, nil
		}
	}

	// 2. Ödeme, Para, Elden Ödeme, Noter ve Devir Soruları
	if strings.Contains(msg, "ödeme") || strings.Contains(msg, "elden") || strings.Contains(msg, "para") || strings.Contains(msg, "noter") || strings.Contains(msg, "devir") || strings.Contains(msg, "havale") || strings.Contains(msg, "eft") || strings.Contains(msg, "kapora") || strings.Contains(msg, "hesap") {
		reply := "💰 **Ödeme ve Noter Satış Süreci:**\n\n" +
			"1. **Ödeme Nasıl Yapılır?** Açık artırma tamamlandıktan sonra alıcı ve satıcı sistem üzerinden mesajlaşarak noter buluşmasını planlar.\n" +
			"2. **Elden Ödeme Olur mu?** Güvenliğiniz açısından elden nakit ödeme **önerilmez**. Sahte para veya güvenlik risklerine karşı **Noter Güvenli Ödeme Sistemi (Noter Araç Satış)** veya doğrudan banka havalesi / FAST kullanılması tavsiye edilir.\n" +
			"3. **Noter Devir Aşaması:** Noter huzurunda devir işlemi imzalanmadan önce para transferi güvenceye alınır ve ruhsat yeni sahibine teslim edilir.\n" +
			"4. **Platform Komisyonu:** otopazar üzerinde teklif vermek ve ilan sahipleriyle mesajlaşmak tamamen ücretsizdir."

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Satıcıyla nasıl iletişime geçerim?",
				"Açık artırma nasıl kazanılır?",
				"Ekspertiz rehberi",
			},
		}, nil
	}

	// 3. Mesajlaşma, İletişim ve Satıcıya Ulaşma Soruları
	if strings.Contains(msg, "mesaj") || strings.Contains(msg, "satıcı") || strings.Contains(msg, "iletişim") || strings.Contains(msg, "konuş") || strings.Contains(msg, "ulaş") || strings.Contains(msg, "telefon") || strings.Contains(msg, "soru sor") || strings.Contains(msg, "görüş") {
		reply := "💬 **Satıcıyla Güvenli İletişim Rehberi:**\n\n" +
			"• **İlan Detayından:** İlgilendiğiniz aracın sayfasındaki **'Satıcıya Mesaj Gönder'** butonuna tıklayarak doğrudan canlı sohbet başlatabilirsiniz.\n" +
			"• **Mesajlar Sekmesi:** Üst menüdeki **'Mesajlar'** bölümünden tüm sohbetlerinizi, okunmamış bildirimleri ve gelen yanıtları anlık takip edebilirsiniz.\n" +
			"• **Satıcıya Ne Sormalısınız?**\n" +
			"  - Güncel ekspertiz raporu var mı?\n" +
			"  - Değişen/boyalı parça ve Tramer kaydı tutarı nedir?\n" +
			"  - Yedek anahtar ve kış lastikleri mevcut mu?\n" +
			"  - Noter devri için uygun gün ve saatler nelerdir?"

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Ödeme yöntemi ve noter süreci",
				"Ekspertiz kontrol noktaları",
				"Aktif açık artırmaları gör",
			},
		}, nil
	}

	// 4. Bütçe Tespiti (Örn: "1500000", "1.500.000", "800 bin", "1 milyon", "2m", vb.)
	budget := parseBudget(msg)
	if budget > 0 {
		activeStatus := "active"
		maxPrice := budget * 1.05 // %5 esneklik
		listings, err := s.listingRepo.GetListings("", activeStatus, nil, &maxPrice)
		if err == nil && len(listings) > 0 {
			if len(listings) > 4 {
				listings = listings[:4]
			}
			reply := fmt.Sprintf(
				"🎯 **%.0f ₺ bütçeniz için en uygun açık artırmalar:**\n\n"+
					"Şu an aktif mezatta olan ve bütçenize uyan %d harika araç bulundu. İlan kartlarına tıklayarak detayları inceleyebilir ve teklif verebilirsiniz!",
				budget, len(listings),
			)
			return &AgentResponse{
				Reply:           reply,
				Recommendations: listings,
				Suggestions: []string{
					"Ekspertiz raporunda nelere bakmalıyım?",
					"Açık artırma nasıl kazanılır?",
					"Ödeme elden oluyor mu?",
				},
			}, nil
		} else {
			return &AgentResponse{
				Reply: fmt.Sprintf(
					"🔍 Belirttiğiniz **%.0f ₺** bütçe aralığında şu an aktif bir ilan bulunamadı. "+
						"Ancak yeni araçlar sürekli eklenmektedir! Bütçenizi biraz esnetebilir veya farklı bir marka belirtebilirsiniz.",
					budget,
				),
				Suggestions: []string{
					"Tüm aktif araçları listele",
					"Nasıl yeni ilan veririm?",
					"Açık artırma tüyoları",
				},
			}, nil
		}
	}

	// 5. Marka Araması (Örn: "bmw var mı", "mercedes ilanları", "porsche")
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
						"Ödeme yöntemi ve noter",
						"Teklif verme taktikleri",
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

	// 6. Ekspertiz & Hasar & Kontrol Soruları
	if strings.Contains(msg, "ekspertiz") || strings.Contains(msg, "hasar") || strings.Contains(msg, "tramer") || strings.Contains(msg, "boya") || strings.Contains(msg, "değişen") || strings.Contains(msg, "kontrol") || strings.Contains(msg, "km") || strings.Contains(msg, "kilometre") {
		reply := "📋 **Araç Alırken Hayati Ekspertiz Kontrol Noktaları:**\n\n" +
			"1. **Şasi, Direk ve Podye:** Aracın taşıyıcı iskeletinde işlem olmaması en kritik güvenlik kriteridir.\n" +
			"2. **Motor ve Şanzıman:** Yağ/su kaçakları, turbo basıncı ve otomatik vites geçişlerindeki vuruntular kontrol edilmelidir.\n" +
			"3. **Tramer & Kilometre Orijinalliği:** TÜVTÜRK muayene kayıtları ve 5664 Tramer SMS sorgusu ile km doğrulanmalıdır.\n" +
			"4. **Satıcıyla İletişim:** İlan detayındaki **'Satıcıya Mesaj Gönder'** butonuyla ekspertiz raporunu isteyebilirsiniz!"

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Açık artırma nasıl kazanılır?",
				"Ödeme ve noter devri nasıl oluyor?",
				"1.000.000 ₺ altı araç öner",
			},
		}, nil
	}

	// 7. Açık Artırma / Teklif Stratejisi / Kazanma
	if strings.Contains(msg, "teklif") || strings.Contains(msg, "strateji") || strings.Contains(msg, "nasıl kazan") || strings.Contains(msg, "kazanmak") || strings.Contains(msg, "ihale") || strings.Contains(msg, "taktik") || strings.Contains(msg, "artırma") {
		reply := "⚡ **Açık Artırma Kazanma Taktikleri:**\n\n" +
			"• **Maksimum Bütçenizi Belirleyin:** Açık artırma heyecanına kapılmadan önce araca verebileceğiniz tavan fiyatı netleştirin.\n" +
			"• **Canlı Yayını İzleyin:** WebSocket canlı bağlantımız sayesinde teklifler sayfayı yenilemeden ekranda anında güncellenir.\n" +
			"• **Teklif Geçmişi Analizi:** Diğer teklif verenlerin artırma sıklığını inceleyin.\n" +
			"• **Eşzamanlı Kilit Güvencesi:** PostgreSQL `SELECT FOR UPDATE` kilidi sayesinde teklifler güvenle işlenir, teklif çakışması yaşanmaz."

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Ödeme elden mi yapılıyor?",
				"Ekspertiz tavsiyesi al",
				"Canlı açık artırmaları gör",
			},
		}, nil
	}

	// 8. İlan Verme & Araç Satışı
	if strings.Contains(msg, "ilan ver") || strings.Contains(msg, "satmak") || strings.Contains(msg, "nasıl satarım") || strings.Contains(msg, "aracımı sat") || strings.Contains(msg, "satış") {
		reply := "🚗 **Aracınızı Açık Artırmayla Hızla Satın:**\n\n" +
			"1. Üst menüdeki **'Yeni İlan Ver'** butonuna tıklayın.\n" +
			"2. Araç marka, model, yıl, fotoğraf ve başlangıç fiyatını girin.\n" +
			"3. Açık artırma süresini (10 dk, 1 saat, 1 gün vb.) belirleyin.\n" +
			"4. İlanınız canlı mezata çıksın, alıcılar yarışsın ve en yüksek teklife güvenle satın!"

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Satıcıyla nasıl mesajlaşılır?",
				"Ödeme ve noter süreci nasıl işler?",
				"Teklif verme kuralları",
			},
		}, nil
	}

	// 9. Güvenlik, İptal, Kurallar ve Genel Sorular
	if strings.Contains(msg, "güvenli") || strings.Contains(msg, "güvenilir") || strings.Contains(msg, "dolandır") || strings.Contains(msg, "sahte") || strings.Contains(msg, "garanti") || strings.Contains(msg, "iptal") || strings.Contains(msg, "vazgeç") || strings.Contains(msg, "nasıl çalışır") {
		reply := "🛡️ **otopazar Güvenlik ve İşleyiş Standartları:**\n\n" +
			"• **Eşzamanlı Veri Kilidi:** Teklifler sunucu ve veritabanı seviyesinde korunur, sahte veya mükerrer teklif verilemez.\n" +
			"• **Şeffaf İhale:** Tüm teklif geçmişi ve teklif sahipleri herkese açık ve anlık olarak listelenir.\n" +
			"• **Doğrudan İletişim:** Kazanan taraf satıcıyla platform içi şifreli mesajlaşma üzerinden güvenle irtibat kurar.\n" +
			"• **Noter Güvencesi:** Satış ve devir işlemleri Türkiye Cumhuriyeti Noterleri aracılığıyla tamamlanır."

		return &AgentResponse{
			Reply: reply,
			Suggestions: []string{
				"Ödeme yöntemleri ve noter devri",
				"Ekspertizde nelere dikkat edilmeli?",
				"Bütçeme uygun araç bul",
			},
		}, nil
	}

	// 10. Selamlaşma veya Genel Soru (Daha Akıllı ve Yardımcı Yanıt)
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
			"Size araç açık artırmaları, ekspertiz kontrolleri veya alım-satım süreçleri hakkında yardımcı olabilirim. "+
			"Şu anda sistemimizde **%d adet aktif açık artırma** bulunuyor. Aşağıdaki konulardan birini seçebilir veya aklınızdaki soruyu doğrudan yazabilirsiniz:",
		activeCount,
	)

	return &AgentResponse{
		Reply:           reply,
		Recommendations: topRecommendations,
		Suggestions: []string{
			"Ödeme elden mi yapılıyor?",
			"Satıcıya güvenli mesaj nasıl atılır?",
			"Ekspertiz kontrol noktaları",
			"Bütçeme uygun araç öner",
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
