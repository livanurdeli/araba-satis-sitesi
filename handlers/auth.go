package handlers

import (
	"araba-satis-sitesi/models"
	"araba-satis-sitesi/repository"
	"encoding/json"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtKey = []byte("super_gizli_anahtar_123") // Gerçek projelerde bu .env dosyasından okunmalıdır.

// İsteklerden (JSON) gelecek verileri okumak için özel yapılar
type AuthRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"` // Sadece kayıtta zorunlu
}

// Kayıt Olma Endpoint'i
func Register(w http.ResponseWriter, r *http.Request) {
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
	query := `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, created_at`
	var user models.User
	user.Email = req.Email
	user.Name = req.Name
	user.Role = "buyer"

	err = repository.DB.QueryRow(query, req.Email, string(hashedPassword), req.Name).Scan(&user.ID, &user.CreatedAt)
	if err != nil {
		http.Error(w, "Bu email adresi zaten kullanılıyor olabilir", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user) // Parola alanı JSON'da "-" olduğu için otomatik gizlenir
}

// Giriş Yapma Endpoint'i
func Login(w http.ResponseWriter, r *http.Request) {
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

	var user models.User
	var storedHash string

	// Email'e göre kullanıcıyı veritabanında bul
	query := `SELECT id, email, password_hash, role FROM users WHERE email = $1`
	err := repository.DB.QueryRow(query, req.Email).Scan(&user.ID, &user.Email, &storedHash, &user.Role)
	if err != nil {
		http.Error(w, "Kullanıcı bulunamadı veya e-posta hatalı", http.StatusUnauthorized)
		return
	}

	// Gönderilen şifre ile veritabanındaki hashlenmiş şifreyi karşılaştır
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(req.Password)); err != nil {
		http.Error(w, "Yanlış şifre girdiniz", http.StatusUnauthorized)
		return
	}

	// JWT Token (Kimlik Kartı) Oluştur
	expirationTime := time.Now().Add(24 * time.Hour) // Token 1 gün geçerli olacak
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"role":    user.Role,
		"exp":     expirationTime.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtKey)
	if err != nil {
		http.Error(w, "Giriş anahtarı (token) oluşturulamadı", http.StatusInternalServerError)
		return
	}

	// Başarılı giriş: Token'ı kullanıcıya döndür
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token":   tokenString,
		"message": "Başarıyla giriş yaptınız",
	})
}
