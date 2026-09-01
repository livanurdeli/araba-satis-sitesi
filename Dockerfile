# 1. Aşama: React Frontend Derleme
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 2. Aşama: Go Backend Derleme
FROM golang:alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
# Go uygulamasını statik binary olarak derle
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

# 3. Aşama: Minimal Çalışma Ortamı (Runtime)
FROM alpine:latest
WORKDIR /app

# HTTPS istekleri ve sertifikalar için ca-certificates paketi
RUN apk --no-cache add ca-certificates tzdata

# Derlenen Go binary ve statik frontend dosyalarını al
COPY --from=backend-builder /app/server .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Resim yüklemeleri için klasör oluştur
RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./server"]
