package handlers

import (
	"araba-satis-sitesi/middleware"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// UploadHandler multipart/form-data ile gönderilen dosyaları sunucuda ./uploads klasörüne kaydeder
func UploadHandler(w http.ResponseWriter, r *http.Request) {
	// Yetkilendirme kontrolü
	_, ok := r.Context().Value(middleware.UserIDKey).(int)
	if !ok {
		http.Error(w, "Yetkilendirme hatası", http.StatusUnauthorized)
		return
	}

	// Maksimum 25 MB boyut limiti
	if err := r.ParseMultipartForm(25 << 20); err != nil {
		http.Error(w, "Dosya boyutu çok büyük (Maksimum 25MB)", http.StatusBadRequest)
		return
	}

	// Uploads klasörünü oluştur
	uploadsDir := "./uploads"
	if err := os.MkdirAll(uploadsDir, os.ModePerm); err != nil {
		http.Error(w, "Sunucu depolama hatası", http.StatusInternalServerError)
		return
	}

	form := r.MultipartForm
	files := form.File["files"]
	if len(files) == 0 {
		// Tekli dosya için "file" anahtarını da kontrol et
		if singleFile := form.File["file"]; len(singleFile) > 0 {
			files = singleFile
		}
	}

	if len(files) == 0 {
		http.Error(w, "Yüklenecek dosya bulunamadı", http.StatusBadRequest)
		return
	}

	var uploadedURLs []string

	for _, fileHeader := range files {
		// Uzantı kontrolü
		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			http.Error(w, "Sadece JPG, PNG ve WEBP formatları desteklenmektedir", http.StatusBadRequest)
			return
		}

		file, err := fileHeader.Open()
		if err != nil {
			http.Error(w, "Dosya açılamadı", http.StatusInternalServerError)
			return
		}
		defer file.Close()

		// Rastgele benzersiz dosya adı oluşturma
		randBytes := make([]byte, 8)
		_, _ = rand.Read(randBytes)
		randomStr := hex.EncodeToString(randBytes)
		filename := fmt.Sprintf("car-%d-%s%s", time.Now().Unix(), randomStr, ext)
		dstPath := filepath.Join(uploadsDir, filename)

		dst, err := os.Create(dstPath)
		if err != nil {
			http.Error(w, "Dosya kaydedilemedi: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer dst.Close()

		if _, err := io.Copy(dst, file); err != nil {
			http.Error(w, "Dosya yazma hatası", http.StatusInternalServerError)
			return
		}

		uploadedURLs = append(uploadedURLs, "/uploads/"+filename)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Dosyalar başarıyla yüklendi",
		"urls":    uploadedURLs,
		"url":     uploadedURLs[0],
	})
}
