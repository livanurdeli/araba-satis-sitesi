package middleware

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// GetJWTKey ortam değişkenlerinden JWT_SECRET değerini döner (varsayılan fallback ile)
func GetJWTKey() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "super_gizli_anahtar_123"
	}
	return []byte(secret)
}

// Context (istek bağlamı) içinde verilerimizi taşımak için özel tipler tanımlıyoruz
type contextKey string

const (
	UserIDKey contextKey = "user_id"
	RoleKey   contextKey = "role"
)

// AuthRequired, sisteme giriş yapmış olmayı gerektiren işlemler için güvenlik duvarı görevi görür.
func AuthRequired(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 1. Gelen isteğin başlığından (Header) Token'ı al
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Bu işlemi yapmak için giriş yapmalısınız (Token eksik)", http.StatusUnauthorized)
			return
		}

		// 2. Token formatı "Bearer <token>" şeklinde gelmeli, bunu ayırıyoruz.
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Geçersiz token formatı", http.StatusUnauthorized)
			return
		}
		tokenString := parts[1]

		// 3. Token'ı bizim gizli anahtarımızla doğrula
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Güvenlik: Token algoritmasının bizim kullandığımız algoritma olduğundan emin ol
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("beklenmeyen imza algoritması: %v", token.Header["alg"])
			}
			return GetJWTKey(), nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Geçersiz veya süresi dolmuş token! Lütfen tekrar giriş yapın.", http.StatusUnauthorized)
			return
		}

		// 4. Token geçerliyse, içindeki verilere (user_id, role) ulaş
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			http.Error(w, "Token verileri (claims) okunamadı", http.StatusUnauthorized)
			return
		}

		// 5. Verileri sonraki adımda kullanabilmek için Request'in "Context"ine kaydet
		// (jwt, sayıları varsayılan olarak float64 okuduğu için int'e çeviriyoruz)
		userIDFloat, ok1 := claims["user_id"].(float64)
		role, ok2 := claims["role"].(string)
		if !ok1 || !ok2 {
			http.Error(w, "Token içeriği geçersiz veya eksik", http.StatusUnauthorized)
			return
		}
		userID := int(userIDFloat)

		ctx := context.WithValue(r.Context(), UserIDKey, userID)
		ctx = context.WithValue(ctx, RoleKey, role)

		// 6. Güvenlikten geçti! İsteği asıl gitmesi gereken yere (next) gönder
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}
