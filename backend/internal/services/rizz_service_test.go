package services

import (
	"reflect"
	"testing"

	"github.com/ahmetcoskunkizilkaya/fully-autonomous-mobile-system/backend/internal/config"
)

func TestNormalizeRizzTone(t *testing.T) {
	if got := normalizeRizzTone("FlIrTy"); got != "flirty" {
		t.Fatalf("expected flirty, got %s", got)
	}
	if got := normalizeRizzTone("unknown"); got != "chill" {
		t.Fatalf("expected chill fallback, got %s", got)
	}
}

func TestNormalizeRizzCategory(t *testing.T) {
	if got := normalizeRizzCategory("WORK"); got != "work" {
		t.Fatalf("expected work, got %s", got)
	}
	if got := normalizeRizzCategory("random"); got != "casual" {
		t.Fatalf("expected casual fallback, got %s", got)
	}
}

func TestExtractResponsesFromContentJSON(t *testing.T) {
	content := `{"responses":[" Sure, let's do Friday night. ","I like your vibe, let's plan it.","Down for it. What time works?"]}`
	got, err := extractResponsesFromContent(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 3 {
		t.Fatalf("expected 3 responses, got %d", len(got))
	}
	if got[0] != "Sure, let's do Friday night." {
		t.Fatalf("unexpected first response: %q", got[0])
	}
}

func TestExtractResponsesFromContentLines(t *testing.T) {
	content := `1) First option
2) Second option
3) Third option`
	got, err := extractResponsesFromContent(content)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	expected := []string{"First option", "Second option", "Third option"}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("unexpected parsed responses: %#v", got)
	}
}

func TestPickTopResponsesFillsFallback(t *testing.T) {
	got := pickTopResponses([]string{"A"}, []string{"B", "C"}, 3)
	expected := []string{"A", "B", "C"}
	if !reflect.DeepEqual(got, expected) {
		t.Fatalf("expected %#v, got %#v", expected, got)
	}
}

func TestRizzLLMProviderPriorityGLMFirst(t *testing.T) {
	cfg := &config.Config{
		GLMAPIKey:      "glm-key",
		GLMAPIURL:      "https://api.z.ai/api/paas/v4/chat/completions",
		GLMModel:       "glm-4.7",
		DeepSeekAPIKey: "ds-key",
		DeepSeekAPIURL: "https://api.deepseek.com/chat/completions",
		DeepSeekModel:  "deepseek-chat",
	}

	client := newRizzLLMClient(cfg)
	if len(client.providers) != 2 {
		t.Fatalf("expected 2 providers, got %d", len(client.providers))
	}
	if client.providers[0].name != "glm" {
		t.Fatalf("expected glm first, got %s", client.providers[0].name)
	}
	if client.providers[1].name != "deepseek" {
		t.Fatalf("expected deepseek second, got %s", client.providers[1].name)
	}
}
