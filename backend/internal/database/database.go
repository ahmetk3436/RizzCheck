package database

import (
	"fmt"
	"log"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func Connect(cfg *config.Config) error {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)

	log.Println("Database connected successfully")
	return nil
}

func Migrate() error {
	// Backward-compatible schema fix: older versions had subscriptions.user_id NOT NULL.
	// We now allow nullable UserID because RevenueCat webhooks can arrive before we can
	// reliably link an app_user_id to an internal user UUID.
	_ = DB.Exec(`
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_name = 'subscriptions' AND column_name = 'user_id'
	) THEN
		ALTER TABLE subscriptions ALTER COLUMN user_id DROP NOT NULL;
	END IF;
EXCEPTION
	WHEN undefined_table THEN
		NULL;
END $$;
`).Error

	err := DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Subscription{},
		&models.Report{},
		&models.Block{},
		&models.RizzResponse{},
		&models.RizzStreak{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migrations completed")
	return nil
}

func Ping() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
