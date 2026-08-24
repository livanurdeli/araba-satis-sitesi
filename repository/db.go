package repository

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/joho/godotenv"
)

// ConnectDB PostgreSQL veritabanına bağlanır ve bağlantı havuzunu (*sql.DB) döner
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
	return db
}
