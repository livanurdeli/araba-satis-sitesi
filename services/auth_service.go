package services

import (
"araba-satis-sitesi/middleware"
"araba-satis-sitesi/models"
"araba-satis-sitesi/repository"
"errors"
"time"

"github.com/golang-jwt/jwt/v5"
"golang.org/x/crypto/bcrypt"
)

// AuthService, kimlik doğrulama ile ilgili iş mantığını (şifreleme, token üretimi,
// kullanıcı doğrulama) barındırır. Handler katmanı sadece HTTP'yi yönetir.
type AuthService struct {
userRepo repository.UserRepository
}

func NewAuthService(userRepo repository.UserRepository) *AuthService {
return &AuthService{userRepo: userRepo}
}

var ErrEmailInUse = errors.New("bu email adresi zaten kullanılıyor olabilir")
var ErrInvalidCredentials = errors.New("email veya şifre hatalı")

// Register yeni bir kullanıcı oluşturur; şifreyi hashlemek dahil tüm iş mantığı burada.
func (s *AuthService) Register(email, password, name string) (*models.User, error) {
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
if err != nil {
return nil, err
}

user, err := s.userRepo.Create(email, string(hashedPassword), name)
if err != nil {
return nil, ErrEmailInUse
}
return user, nil
}

// Login kullanıcıyı doğrular ve başarılıysa imzalı bir JWT döner.
func (s *AuthService) Login(email, password string) (*models.User, string, error) {
user, storedHash, err := s.userRepo.GetByEmail(email)
if err != nil {
return nil, "", ErrInvalidCredentials
}

if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(password)); err != nil {
return nil, "", ErrInvalidCredentials
}

token, err := s.generateToken(user)
if err != nil {
return nil, "", err
}

return user, token, nil
}

func (s *AuthService) generateToken(user *models.User) (string, error) {
expirationTime := time.Now().Add(24 * time.Hour)
claims := jwt.MapClaims{
"user_id": user.ID,
"email":   user.Email,
"role":    user.Role,
"exp":     expirationTime.Unix(),
}

token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
return token.SignedString(middleware.GetJWTKey())
}
