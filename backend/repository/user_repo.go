package repository

import (
"araba-satis-sitesi/models"
"database/sql"
)

type UserRepository interface {
Create(email, passwordHash, name string) (*models.User, error)
GetByEmail(email string) (*models.User, string, error)
GetByID(id int) (*models.User, error)
}

type PostgresUserRepository struct {
db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(email, passwordHash, name string) (*models.User, error) {
query := `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, created_at`
var user models.User
user.Email = email
user.Name = name
user.Role = "buyer"

err := r.db.QueryRow(query, email, passwordHash, name).Scan(&user.ID, &user.CreatedAt)
if err != nil {
return nil, err
}
return &user, nil
}

func (r *PostgresUserRepository) GetByEmail(email string) (*models.User, string, error) {
query := `SELECT id, email, password_hash, name, role, created_at FROM users WHERE email = $1`
var user models.User
var storedHash string
err := r.db.QueryRow(query, email).Scan(&user.ID, &user.Email, &storedHash, &user.Name, &user.Role, &user.CreatedAt)
if err != nil {
return nil, "", err
}
return &user, storedHash, nil
}

func (r *PostgresUserRepository) GetByID(id int) (*models.User, error) {
query := `SELECT id, email, name, role, created_at FROM users WHERE id = $1`
var user models.User
err := r.db.QueryRow(query, id).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.CreatedAt)
if err != nil {
return nil, err
}
return &user, nil
}
