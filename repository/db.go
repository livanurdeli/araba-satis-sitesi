package repository

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var DB *sql.DB

func ConnectDB() *sql.DB {
	dsn := "postgres://postgres:sifre123@localhost:5432/araba_sitesi?sslmode=disable"

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("Veritabanına bağlanılamadı: %v\n", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("Veritabanına ping atılamadı (ulaşılamıyor): %v\n", err)
	}

	fmt.Println(" PostgreSQL bağlantısı başarıyla kuruldu!")
	DB = db
	return db
}
