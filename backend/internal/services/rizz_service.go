package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var numberedPrefixPattern = regexp.MustCompile(`^\s*(?:\d+[\).:-]?|[-*])\s*`)

type RizzService struct {
	db  *gorm.DB
	llm *rizzLLMClient
}

type rizzLLMProvider struct {
	name   string
	apiURL string
	apiKey string
	model  string
}

type rizzLLMClient struct {
	providers []rizzLLMProvider
	client    *http.Client
}

type llmChatCompletionRequest struct {
	Model          string            `json:"model"`
	Messages       []llmChatMessage  `json:"messages"`
	Temperature    float64           `json:"temperature,omitempty"`
	ResponseFormat map[string]string `json:"response_format,omitempty"`
}

type llmChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type llmChatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewRizzService(db *gorm.DB, cfg *config.Config) *RizzService {
	return &RizzService{
		db:  db,
		llm: newRizzLLMClient(cfg),
	}
}

func newRizzLLMClient(cfg *config.Config) *rizzLLMClient {
	timeout := cfg.LLMTimeout
	if timeout <= 0 {
		timeout = 20 * time.Second
	}

	providers := make([]rizzLLMProvider, 0, 2)

	if strings.TrimSpace(cfg.GLMAPIKey) != "" {
		providers = append(providers, rizzLLMProvider{
			name:   "glm",
			apiURL: strings.TrimSpace(cfg.GLMAPIURL),
			apiKey: strings.TrimSpace(cfg.GLMAPIKey),
			model:  strings.TrimSpace(cfg.GLMModel),
		})
	}
	if strings.TrimSpace(cfg.DeepSeekAPIKey) != "" {
		providers = append(providers, rizzLLMProvider{
			name:   "deepseek",
			apiURL: strings.TrimSpace(cfg.DeepSeekAPIURL),
			apiKey: strings.TrimSpace(cfg.DeepSeekAPIKey),
			model:  strings.TrimSpace(cfg.DeepSeekModel),
		})
	}

	return &rizzLLMClient{
		providers: providers,
		client:    &http.Client{Timeout: timeout},
	}
}

// GenerateResponses creates 3 AI-style responses based on tone and category.
func (s *RizzService) GenerateResponses(userID uuid.UUID, inputText, tone, category string) (*models.RizzResponse, error) {
	trimmedInput := strings.TrimSpace(inputText)
	if len(trimmedInput) < 5 {
		return nil, errors.New("input text too short")
	}
	if len(trimmedInput) > 1000 {
		return nil, errors.New("input text too long")
	}

	normalizedTone := normalizeRizzTone(tone)
	normalizedCategory := normalizeRizzCategory(category)

	streak, err := s.GetStreak(userID)
	if err != nil {
		return nil, err
	}

	today := time.Now().Truncate(24 * time.Hour)
	if streak.LastUseDate.Truncate(24 * time.Hour).Before(today) {
		streak.FreeUsesToday = 0
	}

	isPremium, err := s.isPremiumSubscriber(userID)
	if err != nil {
		// Don't block core usage if subscription lookup fails.
		isPremium = false
	}

	if !isPremium && streak.FreeUsesToday >= 5 {
		return nil, errors.New("daily free limit reached")
	}

	templateResponses := s.generateTemplateResponses(trimmedInput, normalizedTone, normalizedCategory)
	responses := append([]string(nil), templateResponses...)

	if aiResponses, aiErr := s.llm.generateResponses(trimmedInput, normalizedTone, normalizedCategory); aiErr == nil {
		responses = pickTopResponses(aiResponses, templateResponses, 3)
	}

	rizzResponse := &models.RizzResponse{
		UserID:    userID,
		InputText: trimmedInput,
		Tone:      normalizedTone,
		Category:  normalizedCategory,
		Response1: responses[0],
		Response2: responses[1],
		Response3: responses[2],
	}

	if err := s.db.Create(rizzResponse).Error; err != nil {
		return nil, err
	}

	// Update streak.
	s.updateStreak(userID)

	return rizzResponse, nil
}

func (s *RizzService) isPremiumSubscriber(userID uuid.UUID) (bool, error) {
	var sub models.Subscription
	err := s.db.
		Where("user_id = ? AND status = ? AND current_period_end > ?", userID, "active", time.Now()).
		Order("current_period_end DESC").
		First(&sub).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (c *rizzLLMClient) generateResponses(input, tone, category string) ([]string, error) {
	if c == nil || len(c.providers) == 0 {
		return nil, errors.New("llm client disabled")
	}

	var lastErr error
	for _, provider := range c.providers {
		responses, err := c.generateWithProvider(provider, input, tone, category)
		if err == nil {
			return responses, nil
		}
		lastErr = fmt.Errorf("%s provider failed: %w", provider.name, err)
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, errors.New("no llm provider available")
}

func (c *rizzLLMClient) generateWithProvider(provider rizzLLMProvider, input, tone, category string) ([]string, error) {
	userPayload := map[string]string{
		"input_text": input,
		"tone":       tone,
		"category":   category,
	}
	payloadBytes, _ := json.Marshal(userPayload)

	reqBody := llmChatCompletionRequest{
		Model: provider.model,
		Messages: []llmChatMessage{
			{
				Role:    "system",
				Content: "You write high-converting text replies for mobile app users. Return only valid JSON with key 'responses' as an array of 3 strings. Rules: no numbering, no markdown, no quotes around the full response, each reply max 180 chars, natural and human.",
			},
			{
				Role:    "user",
				Content: string(payloadBytes),
			},
		},
		Temperature:    0.9,
		ResponseFormat: map[string]string{"type": "json_object"},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest(http.MethodPost, provider.apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+provider.apiKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		statusBody := strings.TrimSpace(string(respBytes))
		if len(statusBody) > 200 {
			statusBody = statusBody[:200]
		}
		return nil, fmt.Errorf("llm request failed: status=%d body=%s", resp.StatusCode, statusBody)
	}

	var completion llmChatCompletionResponse
	if err := json.Unmarshal(respBytes, &completion); err != nil {
		return nil, err
	}
	if len(completion.Choices) == 0 {
		return nil, errors.New("llm returned no choices")
	}

	content := strings.TrimSpace(completion.Choices[0].Message.Content)
	responses, err := extractResponsesFromContent(content)
	if err != nil {
		return nil, err
	}

	return pickTopResponses(responses, nil, 3), nil
}

func extractResponsesFromContent(content string) ([]string, error) {
	if content == "" {
		return nil, errors.New("empty llm content")
	}

	parsed := parseJSONResponses(content)
	if len(parsed) > 0 {
		return sanitizeLLMResponses(parsed), nil
	}

	start := strings.Index(content, "{")
	end := strings.LastIndex(content, "}")
	if start >= 0 && end > start {
		parsed = parseJSONResponses(content[start : end+1])
		if len(parsed) > 0 {
			return sanitizeLLMResponses(parsed), nil
		}
	}

	lines := strings.Split(strings.ReplaceAll(content, "\r", "\n"), "\n")
	fallback := make([]string, 0, 3)
	for _, line := range lines {
		line = strings.TrimSpace(numberedPrefixPattern.ReplaceAllString(line, ""))
		if line != "" {
			fallback = append(fallback, line)
		}
	}

	cleaned := sanitizeLLMResponses(fallback)
	if len(cleaned) == 0 {
		return nil, errors.New("could not parse llm responses")
	}

	return cleaned, nil
}

func parseJSONResponses(content string) []string {
	var result struct {
		Responses []string `json:"responses"`
		Response1 string   `json:"response_1"`
		Response2 string   `json:"response_2"`
		Response3 string   `json:"response_3"`
	}
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil
	}

	responses := make([]string, 0, 3)
	responses = append(responses, result.Responses...)
	if result.Response1 != "" {
		responses = append(responses, result.Response1)
	}
	if result.Response2 != "" {
		responses = append(responses, result.Response2)
	}
	if result.Response3 != "" {
		responses = append(responses, result.Response3)
	}
	return responses
}

func sanitizeLLMResponses(responses []string) []string {
	seen := make(map[string]struct{})
	cleaned := make([]string, 0, len(responses))

	for _, raw := range responses {
		t := strings.TrimSpace(raw)
		t = strings.Trim(t, `"'`)
		t = strings.Join(strings.Fields(t), " ")
		t = strings.TrimSpace(numberedPrefixPattern.ReplaceAllString(t, ""))
		if t == "" {
			continue
		}
		if len(t) > 280 {
			t = strings.TrimSpace(t[:280])
		}

		key := strings.ToLower(t)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		cleaned = append(cleaned, t)
	}

	return cleaned
}

func pickTopResponses(candidates, fallback []string, limit int) []string {
	all := make([]string, 0, len(candidates)+len(fallback))
	all = append(all, sanitizeLLMResponses(candidates)...)
	all = append(all, sanitizeLLMResponses(fallback)...)

	out := make([]string, 0, limit)
	for _, item := range all {
		out = append(out, item)
		if len(out) == limit {
			return out
		}
	}

	for len(out) < limit {
		out = append(out, "Sounds good, let's do it.")
	}

	return out
}

func normalizeRizzTone(tone string) string {
	normalized := strings.ToLower(strings.TrimSpace(tone))
	for _, allowed := range models.RizzTones {
		if normalized == allowed {
			return normalized
		}
	}
	return "chill"
}

func normalizeRizzCategory(category string) string {
	normalized := strings.ToLower(strings.TrimSpace(category))
	for _, allowed := range models.RizzCategories {
		if normalized == allowed {
			return normalized
		}
	}
	return "casual"
}

func (s *RizzService) generateTemplateResponses(input, tone, category string) []string {
	_ = input
	_ = category

	templates := map[string][]string{
		"flirty": {
			"I couldn't help but smile reading that. You definitely got my attention.",
			"Well, that message just made my day way more interesting.",
			"You're smooth. I like it. Want to keep this energy going?",
		},
		"professional": {
			"Thanks for reaching out. Happy to discuss this further when convenient.",
			"Appreciate the context. I'll review and share my thoughts shortly.",
			"Great point. Let's align on next steps and move this forward.",
		},
		"funny": {
			"Okay, that was actually hilarious. You win this round.",
			"I was not ready for that one. Respect.",
			"Top-tier joke. You've officially entertained me.",
		},
		"chill": {
			"Yeah, I'm good with that. Sounds easy.",
			"For sure, I'm down.",
			"No stress, we can figure it out.",
		},
		"savage": {
			"Bold take. I'm listening, but you'll need more than that.",
			"You're confident. I respect it. Let's see if you can back it up.",
			"Interesting energy. Keep going.",
		},
		"romantic": {
			"Every message from you makes my day a little better.",
			"I really like this connection we're building.",
			"You have a way of making ordinary moments feel special.",
		},
		"confident": {
			"I'm clear on what I want, and this feels right.",
			"Let's do it. I trust the direction.",
			"I'm in. We'll make this work.",
		},
		"mysterious": {
			"Maybe I'll tell you more soon. Stay curious.",
			"There is more to this story, just not all at once.",
			"Some things are better revealed at the right time.",
		},
	}

	selected, ok := templates[tone]
	if !ok {
		selected = templates["chill"]
	}

	responses := append([]string(nil), selected...)
	rand.Shuffle(len(responses), func(i, j int) {
		responses[i], responses[j] = responses[j], responses[i]
	})

	return pickTopResponses(responses, nil, 3)
}

func (s *RizzService) GetStreak(userID uuid.UUID) (*models.RizzStreak, error) {
	var streak models.RizzStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		streak = models.RizzStreak{
			UserID: userID,
		}
		if createErr := s.db.Create(&streak).Error; createErr != nil {
			return nil, createErr
		}
		return &streak, nil
	}
	if err != nil {
		return nil, err
	}
	return &streak, nil
}

func (s *RizzService) GetHistory(userID uuid.UUID, page, limit int) ([]models.RizzResponse, int64, error) {
	var responses []models.RizzResponse
	var total int64

	if page < 1 {
		page = 1
	}
	if limit <= 0 {
		limit = 20
	}

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
	if selectedIdx < 0 || selectedIdx > 2 {
		return errors.New("selected_idx must be between 0 and 2")
	}

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
	if err != nil {
		return
	}

	lastUse := streak.LastUseDate.Truncate(24 * time.Hour)
	yesterday := today.Add(-24 * time.Hour)

	streak.TotalRizzes++
	streak.FreeUsesToday++

	if lastUse.Equal(today) {
		// Same day, only counters change.
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
