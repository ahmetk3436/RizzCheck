package handlers

import (
	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type RizzHandler struct {
	service *services.RizzService
}

func NewRizzHandler(service *services.RizzService) *RizzHandler {
	return &RizzHandler{service: service}
}

type GenerateRequest struct {
	InputText string `json:"input_text"`
	Tone      string `json:"tone"`
	Category  string `json:"category"`
}

func (h *RizzHandler) Generate(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user"})
	}

	var req GenerateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.Tone == "" {
		req.Tone = "chill"
	}
	if req.Category == "" {
		req.Category = "casual"
	}

	response, err := h.service.GenerateResponses(userID, req.InputText, req.Tone, req.Category)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"response":   response,
		"responses": []string{response.Response1, response.Response2, response.Response3},
	})
}

func (h *RizzHandler) GetStats(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user"})
	}

	streak, err := h.service.GetStreak(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(streak)
}

func (h *RizzHandler) GetHistory(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user"})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 20)

	history, total, err := h.service.GetHistory(userID, page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"history": history,
		"total":   total,
		"page":    page,
	})
}

type SelectRequest struct {
	ResponseID  string `json:"response_id"`
	SelectedIdx int    `json:"selected_idx"`
}

func (h *RizzHandler) SelectResponse(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Locals("userId").(string))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid user"})
	}

	var req SelectRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	responseID, err := uuid.Parse(req.ResponseID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid response ID"})
	}

	if err := h.service.SelectResponse(userID, responseID, req.SelectedIdx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}
