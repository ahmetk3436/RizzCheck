package services

import (
	"errors"
	"math/rand"
	"time"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RizzService struct {
	db *gorm.DB
}

func NewRizzService(db *gorm.DB) *RizzService {
	return &RizzService{db: db}
}

// GenerateResponses creates 3 AI-style responses based on tone
func (s *RizzService) GenerateResponses(userID uuid.UUID, inputText, tone, category string) (*models.RizzResponse, error) {
	if len(inputText) < 5 {
		return nil, errors.New("input text too short")
	}
	if len(inputText) > 1000 {
		return nil, errors.New("input text too long")
	}

	// Check free usage limit
	streak, _ := s.GetStreak(userID)
	today := time.Now().Truncate(24 * time.Hour)
	if streak.LastUseDate.Truncate(24*time.Hour).Before(today) {
		streak.FreeUsesToday = 0
	}

	// TODO: skip this check for premium subscribers
	if streak.FreeUsesToday >= 5 {
		return nil, errors.New("daily free limit reached")
	}

	// For MVP: Generate template-based responses (replace with actual AI API later)
	responses := s.generateTemplateResponses(inputText, tone)

	rizzResponse := &models.RizzResponse{
		UserID:    userID,
		InputText: inputText,
		Tone:      tone,
		Category:  category,
		Response1: responses[0],
		Response2: responses[1],
		Response3: responses[2],
	}

	if err := s.db.Create(rizzResponse).Error; err != nil {
		return nil, err
	}

	// Update streak
	s.updateStreak(userID)

	return rizzResponse, nil
}

func (s *RizzService) generateTemplateResponses(input, tone string) []string {
	// Template responses by tone (in production, replace with OpenAI/Claude API)
	templates := map[string][]string{
		"flirty": {
			"I couldn't help but smile reading that 😊 You've definitely got my attention...",
			"Well well well, look who's making my day interesting 💫",
			"I have to say, you're pretty smooth yourself. But I think I can match that energy 😏",
		},
		"professional": {
			"Thank you for reaching out. I'd be happy to discuss this further at your convenience.",
			"I appreciate you bringing this to my attention. Let me review and get back to you shortly.",
			"That's a great point. I'll take this into consideration and follow up with my thoughts.",
		},
		"funny": {
			"LOL okay that's actually hilarious 😂 You win this round!",
			"I wasn't ready for that one 💀 Consider me officially entertained",
			"Alright alright, you got jokes! I respect the humor game 😆",
		},
		"chill": {
			"Yeah that's cool with me, sounds good 👍",
			"For sure, I'm down for whatever works",
			"No worries at all, we can figure it out",
		},
		"savage": {
			"Oh you thought that was clever? That's cute 😌",
			"I mean... you tried. Points for effort I guess 💅",
			"That's bold coming from you, but okay let's see where this goes",
		},
		"romantic": {
			"Every time I read your messages, I can't help but smile. You have that effect on me ❤️",
			"I hope you know how special you are to me. These little moments mean everything 💕",
			"Just thinking about you makes my day better. Can't wait to see you again 🥰",
		},
		"confident": {
			"I know exactly what I bring to the table, and honestly? It's pretty great 💪",
			"Yeah, I got this. No doubt in my mind we can make it work",
			"Trust me on this one. I've thought it through and I'm sure about it",
		},
		"mysterious": {
			"Maybe I'll tell you more... if you can handle it 🌙",
			"There's more to this story, but you'll have to wait and see",
			"Some things are better left unsaid... for now ✨",
		},
	}

	responses, ok := templates[tone]
	if !ok {
		responses = templates["chill"]
	}

	// Shuffle responses
	rand.Shuffle(len(responses), func(i, j int) {
		responses[i], responses[j] = responses[j], responses[i]
	})

	return responses
}

func (s *RizzService) GetStreak(userID uuid.UUID) (*models.RizzStreak, error) {
	var streak models.RizzStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		streak = models.RizzStreak{
			UserID: userID,
		}
		s.db.Create(&streak)
	}
	return &streak, nil
}

func (s *RizzService) GetHistory(userID uuid.UUID, page, limit int) ([]models.RizzResponse, int64, error) {
	var responses []models.RizzResponse
	var total int64

	offset := (page - 1) * limit

	query := s.db.Model(&models.RizzResponse{}).Where("user_id = ?", userID)
	query.Count(&total)

	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&responses).Error

	return responses, total, err
}

func (s *RizzService) SelectResponse(userID, responseID uuid.UUID, selectedIdx int) error {
	return s.db.Model(&models.RizzResponse{}).
		Where("id = ? AND user_id = ?", responseID, userID).
		Update("selected_idx", selectedIdx).Error
}

func (s *RizzService) updateStreak(userID uuid.UUID) {
	var streak models.RizzStreak
	today := time.Now().Truncate(24 * time.Hour)

	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		streak = models.RizzStreak{
			UserID:        userID,
			CurrentStreak: 1,
			LongestStreak: 1,
			TotalRizzes:   1,
			FreeUsesToday: 1,
			LastUseDate:   today,
		}
		s.db.Create(&streak)
		return
	}

	lastUse := streak.LastUseDate.Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)

	streak.TotalRizzes++
	streak.FreeUsesToday++

	if lastUse.Equal(today) {
		// Same day, just increment
	} else if lastUse.Equal(yesterday) {
		streak.CurrentStreak++
		if streak.CurrentStreak > streak.LongestStreak {
			streak.LongestStreak = streak.CurrentStreak
		}
		streak.FreeUsesToday = 1
	} else {
		streak.CurrentStreak = 1
		streak.FreeUsesToday = 1
	}

	streak.LastUseDate = today
	s.db.Save(&streak)
}
