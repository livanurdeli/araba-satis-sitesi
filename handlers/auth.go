package handlers

import (
"araba-satis-sitesi/services"
"encoding/json"
"errors"
"net/http"
)

type AuthHandler struct {
authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
return &AuthHandler{authService: authService}
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

user, err := h.authService.Register(req.Email, req.Password, req.Name)
if err != nil {
if errors.Is(err, services.ErrEmailInUse) {
http.Error(w, err.Error(), http.StatusConflict)
return
}
http.Error(w, "Kayıt işlemi başarısız: "+err.Error(), http.StatusInternalServerError)
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

user, token, err := h.authService.Login(req.Email, req.Password)
if err != nil {
http.Error(w, err.Error(), http.StatusUnauthorized)
return
}

w.Header().Set("Content-Type", "application/json")
json.NewEncoder(w).Encode(map[string]interface{}{
"token":   token,
"message": "Başarıyla giriş yaptınız",
"user": map[string]interface{}{
"id":    user.ID,
"email": user.Email,
"name":  user.Name,
"role":  user.Role,
},
})
}
