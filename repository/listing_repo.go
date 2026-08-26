package repository

import (
"araba-satis-sitesi/models"
"database/sql"
"errors"
"fmt"
"time"
)

// ExpiredAuction, süresi dolup kapatılan bir açık artırmanın özet bilgisidir.
type ExpiredAuction struct {
ID         int
Title      string
FinalPrice float64
}

type ListingRepository interface {
GetListings(brand string, status string, minPrice *float64, maxPrice *float64) ([]models.Listing, error)
GetByID(id int) (*models.Listing, error)
GetBySellerID(sellerID int) ([]models.Listing, error)
Create(sellerID int, title, brand, model string, year int, description string, startingPrice float64, imageURL string, endTime time.Time) (*models.Listing, error)
Update(id, sellerID int, title, brand, model string, year int, description string, imageURL string) (*models.Listing, error)
Delete(id, sellerID int) error
CloseExpiredAuctions() ([]ExpiredAuction, error)
}

type PostgresListingRepository struct {
db *sql.DB
}

func NewListingRepository(db *sql.DB) ListingRepository {
return &PostgresListingRepository{db: db}
}

func (r *PostgresListingRepository) GetListings(brand string, status string, minPrice *float64, maxPrice *float64) ([]models.Listing, error) {
query := `SELECT l.id, l.seller_id, COALESCE(u.name, 'Satıcı') as seller_name, l.title, l.brand, l.model, l.year, l.description, 
                 l.starting_price, l.current_price, l.status, l.image_url, l.start_time, l.end_time, l.created_at 
          FROM listings l
          LEFT JOIN users u ON l.seller_id = u.id
          WHERE 1=1`
var args []interface{}
argIdx := 1

if brand != "" {
query += fmt.Sprintf(" AND LOWER(l.brand) = LOWER($%d)", argIdx)
args = append(args, brand)
argIdx++
}

if status != "" {
query += fmt.Sprintf(" AND l.status = $%d", argIdx)
args = append(args, status)
argIdx++
}

if minPrice != nil {
query += fmt.Sprintf(" AND l.current_price >= $%d", argIdx)
args = append(args, *minPrice)
argIdx++
}

if maxPrice != nil {
query += fmt.Sprintf(" AND l.current_price <= $%d", argIdx)
args = append(args, *maxPrice)
argIdx++
}

query += " ORDER BY l.created_at DESC"

rows, err := r.db.Query(query, args...)
if err != nil {
return nil, err
}
defer rows.Close()

listings := make([]models.Listing, 0)
for rows.Next() {
var l models.Listing
err := rows.Scan(
&l.ID, &l.SellerID, &l.SellerName, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
)
if err != nil {
return nil, err
}
listings = append(listings, l)
}
return listings, nil
}

func (r *PostgresListingRepository) GetByID(id int) (*models.Listing, error) {
query := `SELECT l.id, l.seller_id, COALESCE(u.name, 'Satıcı') as seller_name, l.title, l.brand, l.model, l.year, l.description, 
                 l.starting_price, l.current_price, l.status, l.image_url, l.start_time, l.end_time, l.created_at 
          FROM listings l
          LEFT JOIN users u ON l.seller_id = u.id
          WHERE l.id = $1`

var l models.Listing
err := r.db.QueryRow(query, id).Scan(
&l.ID, &l.SellerID, &l.SellerName, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt,
)
if err != nil {
return nil, err
}
return &l, nil
}

// GetBySellerID, bir satıcının kendi ilanlarını döner.
// (Daha önce UserRepository içindeydi; ilan verisi Listing domain'ine ait olduğu için buraya taşındı.)
func (r *PostgresListingRepository) GetBySellerID(sellerID int) ([]models.Listing, error) {
query := `SELECT id, seller_id, title, brand, model, year, description, 
                 starting_price, current_price, status, image_url, start_time, end_time, created_at 
          FROM listings 
          WHERE seller_id = $1 
          ORDER BY created_at DESC`

rows, err := r.db.Query(query, sellerID)
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

func (r *PostgresListingRepository) Create(sellerID int, title, brand, model string, year int, description string, startingPrice float64, imageURL string, endTime time.Time) (*models.Listing, error) {
query := `INSERT INTO listings (
seller_id, title, brand, model, year, description, 
starting_price, current_price, status, image_url, start_time, end_time
) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'active', $8, NOW(), $9)
RETURNING id, current_price, status, image_url, start_time, created_at`

var l models.Listing
l.SellerID = sellerID
l.Title = title
l.Brand = brand
l.Model = model
l.Year = year
l.Description = description
l.StartingPrice = startingPrice
l.EndTime = endTime

err := r.db.QueryRow(query, sellerID, title, brand, model, year, description, startingPrice, imageURL, endTime).
Scan(&l.ID, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.CreatedAt)
if err != nil {
return nil, err
}
return &l, nil
}

func (r *PostgresListingRepository) Update(id, sellerID int, title, brand, model string, year int, description string, imageURL string) (*models.Listing, error) {
// Sahiplik kontrolü
var currentSellerID int
err := r.db.QueryRow("SELECT seller_id FROM listings WHERE id = $1", id).Scan(&currentSellerID)
if err != nil {
return nil, err
}
if currentSellerID != sellerID {
return nil, errors.New("unauthorized")
}

query := `UPDATE listings 
          SET title = $1, brand = $2, model = $3, year = $4, description = $5, image_url = $6
          WHERE id = $7 AND seller_id = $8
          RETURNING id, seller_id, title, brand, model, year, description, 
                    starting_price, current_price, status, image_url, start_time, end_time, created_at`

var l models.Listing
err = r.db.QueryRow(query, title, brand, model, year, description, imageURL, id, sellerID).
Scan(&l.ID, &l.SellerID, &l.Title, &l.Brand, &l.Model, &l.Year, &l.Description,
&l.StartingPrice, &l.CurrentPrice, &l.Status, &l.ImageURL, &l.StartTime, &l.EndTime, &l.CreatedAt)
if err != nil {
return nil, err
}
return &l, nil
}

func (r *PostgresListingRepository) Delete(id, sellerID int) error {
var currentSellerID int
err := r.db.QueryRow("SELECT seller_id FROM listings WHERE id = $1", id).Scan(&currentSellerID)
if err != nil {
return err
}
if currentSellerID != sellerID {
return errors.New("unauthorized")
}

_, err = r.db.Exec("DELETE FROM listings WHERE id = $1 AND seller_id = $2", id, sellerID)
return err
}

// CloseExpiredAuctions, süresi dolmuş aktif ilanları 'ended' durumuna çeker.
// (Daha önce auction_worker.go içinde ham SQL olarak duruyordu; veri erişimi repository'ye ait olmalı.)
func (r *PostgresListingRepository) CloseExpiredAuctions() ([]ExpiredAuction, error) {
query := `
UPDATE listings 
SET status = 'ended' 
WHERE status = 'active' AND end_time <= NOW()
RETURNING id, title, current_price
`

rows, err := r.db.Query(query)
if err != nil {
return nil, err
}
defer rows.Close()

var closed []ExpiredAuction
for rows.Next() {
var e ExpiredAuction
if err := rows.Scan(&e.ID, &e.Title, &e.FinalPrice); err != nil {
return nil, err
}
closed = append(closed, e)
}
return closed, nil
}
