package handlers

import (
	"araba-satis-sitesi/middleware"
	"araba-satis-sitesi/repository"
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo repository.UserRepository
}

func NewAuthHandler(userRepo repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

// İsteklerden (JSON) gelecek verileri okumak için özel yapılar
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"` // Sadece kayıtta zorunlu
}

// Kayıt Olma Endpoint'i
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Sadece POST isteği kabul edilir", http.StatusMethodNotAllowed)
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz veri", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		http.Error(w, "Email, şifre ve isim alanları zorunludur", http.StatusBadRequest)
		return
	}

	// Şifreyi Hashle (Güvenli hale getir)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Şifre oluşturulamadı", http.StatusInternalServerError)
		return
	}

	// Veritabanına kaydet
	user, err := h.userRepo.Create(req.Email, string(hashedPassword), req.Name)
	if err != nil {
		http.Error(w, "Bu email adresi zaten kullanılıyor olabilir", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// Giriş Yapma Endpoint'i
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Sadece POST isteği kabul edilir", http.StatusMethodNotAllowed)
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Geçersiz veri", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email ve şifre zorunludur", http.StatusBadRequest)
		return
	}

	// Email'e göre kullanıcıyı repository'den bul
	user, storedHash, err := h.userRepo.GetByEmail(req.Email)
	if err != nil {
		http.Error(w, "Kullanıcı bulunamadı veya e-posta hatalı", http.StatusUnauthorized)
		return
	}

	// Gönderilen şifre ile hashlenmiş şifreyi karşılaştır
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		http.Error(w, "Yanlış şifre girdiniz", http.StatusUnauthorized)
		return
	}

	// JWT Token Oluştur
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     expirationTime.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(middleware.GetJWTKey())
	if err != nil {
		http.Error(w, "Giriş anahtarı (token) oluşturulamadı", http.StatusInternalServerError)
		return
	}

	// Başarılı giriş
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token":   tokenString,
		"message": "Başarıyla giriş yaptınız",
		"user": map[string]interface{}{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}
