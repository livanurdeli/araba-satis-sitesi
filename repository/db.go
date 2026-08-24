package repository

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

func ConnectDB() *sql.DB {
	_ = godotenv.Load()

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "postgres://postgres:sifre123@localhost:5432/araba_sitesi?sslmode=disable"
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Veritabanına bağlanılamadı: %v\n", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("Veritabanına ping atılamadı (ulaşılamıyor): %v\n", err)
	}

	fmt.Println(" PostgreSQL bağlantısı başarıyla kuruldu!")

	// Tabloların varlığını garanti et
	initSchema(db)

	return db
}

func initSchema(db *sql.DB) {
	schema := `
	CREATE TABLE IF NOT EXISTS messages (
		id SERIAL PRIMARY KEY,
		listing_id INT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
		sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		content TEXT NOT NULL,
		is_read BOOLEAN NOT NULL DEFAULT FALSE,
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON messages(listing_id);
	CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
	CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
	`
	_, _ = db.Exec(schema)
}
