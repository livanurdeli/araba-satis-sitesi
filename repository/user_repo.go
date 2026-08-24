package repository

import (
	"araba-satis-sitesi/models"
	"database/sql"
)

type UserRepository interface {
	Create(email, passwordHash, name string) (*models.User, error)
	GetByEmail(email string) (*models.User, string, error)
	GetByID(id int) (*models.User, error)
	GetMyListings(userID int) ([]models.Listing, error)
	GetMyBids(userID int) ([]models.UserBidHistoryItem, error)
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

func (r *PostgresUserRepository) GetMyListings(userID int) ([]models.Listing, error) {
	query := `SELECT id, seller_id, title, brand, model, year, description, 
	                 starting_price, current_price, status, image_url, start_time, end_time, created_at 
	          FROM listings 
	          WHERE seller_id = $1 
	          ORDER BY created_at DESC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	listings := make([]models.Listing, 0)
	for rows.Next() {
		var l models.Listing
		err := rows.Scan(
			&l.ID, &l.SellerID, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
			&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		listings = append(listings, l)
	}
	return listings, nil
}

func (r *PostgresUserRepository) GetMyBids(userID int) ([]models.UserBidHistoryItem, error) {
	query := `SELECT b.id, b.listing_id, l.title, l.brand, l.model, l.status, l.image_url, l.current_price, 
	                 b.amount, b.created_at, l.end_time 
	          FROM bids b 
	          JOIN listings l ON b.listing_id = l.id 
	          WHERE b.bidder_id = $1 
	          ORDER BY b.created_at DESC`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	myBids := make([]models.UserBidHistoryItem, 0)
	for rows.Next() {
		var item models.UserBidHistoryItem
		err := rows.Scan(
			&item.BidID, &item.ListingID, &item.ListingTitle, &item.Brand, &item.Model,
			&item.ListingStatus, &item.ImageURL, &item.CurrentPrice, &item.MyBidAmount, &item.BidCreatedAt, &item.EndTime,
		)
		if err != nil {
			return nil, err
		}
		myBids = append(myBids, item)
	}
	return myBids, nil
}
