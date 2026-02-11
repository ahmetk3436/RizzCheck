package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// RizzResponse represents a generated AI response
type RizzResponse struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;index" json:"user_id"`
	InputText   string         `gorm:"type:text;not null" json:"input_text"`
	Tone        string         `gorm:"type:varchar(30);not null" json:"tone"`
	Response1   string         `gorm:"type:text" json:"response_1"`
	Response2   string         `gorm:"type:text" json:"response_2"`
	Response3   string         `gorm:"type:text" json:"response_3"`
	SelectedIdx int            `gorm:"default:-1" json:"selected_idx"`
	Category    string         `gorm:"type:varchar(30)" json:"category"` // dating, work, casual, family
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// RizzStreak tracks daily usage
type RizzStreak struct {
	ID            uuid.UUID `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID        uuid.UUID `gorm:"type:uuid;uniqueIndex" json:"user_id"`
	CurrentStreak int       `gorm:"default:0" json:"current_streak"`
	LongestStreak int       `gorm:"default:0" json:"longest_streak"`
	TotalRizzes   int       `gorm:"default:0" json:"total_rizzes"`
	FreeUsesToday int       `gorm:"default:0" json:"free_uses_today"`
	LastUseDate   time.Time `json:"last_use_date"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Tone options
var RizzTones = []string{
	"flirty",
	"professional",
	"funny",
	"chill",
	"savage",
	"romantic",
	"confident",
	"mysterious",
}

// Category options
var RizzCategories = []string{
	"dating",
	"work",
	"casual",
	"family",
	"friends",
}
