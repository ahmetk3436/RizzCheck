# RizzCheck Backend API Endpoint Audit
Date: 2026-02-10

This is a pragmatic endpoint-by-endpoint audit of the current Go backend in `/backend/`.

## Status (What Changed / What’s Fixed)

Build checks:
- `go test ./...` OK
- `go vet ./...` OK

Security + correctness fixes applied:
- Account deletion now **requires password** for password-based users (Apple users can delete without password).
- Admin moderation endpoints now require **admin allowlist** (`ADMIN_EMAILS` / `ADMIN_USER_IDS`) and/or optional `X-Admin-Token` (`ADMIN_TOKEN`).
- Apple Sign-In now verifies the identity token **signature via Apple JWKS**, validates `iss` and `exp`, and optionally validates `aud` when `APPLE_CLIENT_IDS` is set.
- RevenueCat webhooks now:
  - Fail closed when `REVENUECAT_WEBHOOK_AUTH` is missing.
  - Upsert subscriptions using `original_transaction_id` when present (idempotent).
  - Attempt user linking by parsing `app_user_id` / `original_app_user_id` as UUID.
  - Allow nullable `subscriptions.user_id` (migration included).

## Required Environment (Production Minimum)

Core:
- `JWT_SECRET` (required, server exits if missing)
- DB settings (server exits if `DB_PASSWORD` missing)

Admin:
- `ADMIN_EMAILS` and/or `ADMIN_USER_IDS` (comma-separated)
- Optional `ADMIN_TOKEN` (sent as `X-Admin-Token`)

Apple:
- Recommended: `APPLE_CLIENT_IDS` (comma-separated bundle IDs / service IDs). If empty, audience is not enforced.

RevenueCat:
- `REVENUECAT_WEBHOOK_AUTH` (exact match against request `Authorization` header)

LLM providers (Rizz generation):
- `GLM_API_KEY` (primary) + optional `DEEPSEEK_API_KEY` (fallback)

## Endpoints (By Route)

Base prefix: `/api`

### Health

- `GET /health`
  - Auth: none
  - Response: `dto.HealthResponse` (`status`, `timestamp`, `db`)
  - Notes: returns DB health string (includes error message if unhealthy)

### Auth (Public)

- `POST /auth/register`
  - Auth: none
  - Body: `dto.RegisterRequest` (`email`, `password`)
  - Validations:
    - `email` required
    - `password` length >= 8
  - Response: `dto.AuthResponse`
  - Errors:
    - `409` when email already registered

- `POST /auth/login`
  - Auth: none
  - Body: `dto.LoginRequest`
  - Response: `dto.AuthResponse`
  - Errors:
    - `401` invalid credentials

- `POST /auth/refresh`
  - Auth: none
  - Body: `dto.RefreshRequest` (`refresh_token`)
  - Behavior:
    - Refresh token rotation (old token is revoked on use)
  - Response: `dto.AuthResponse`
  - Errors:
    - `401` invalid/expired refresh token

- `POST /auth/apple`
  - Auth: none
  - Body: `dto.AppleSignInRequest`
  - Behavior:
    - Verifies Apple identity token signature via JWKS
    - Validates `iss` and `exp`
    - Validates `aud` if `APPLE_CLIENT_IDS` is set
    - Links account by `apple_sub` (stored on user record)
  - Response: `dto.AuthResponse`
  - Notes:
    - `email` is only expected on first sign-in; fallback email is generated if missing.

### Auth (Protected: JWT)

- `POST /auth/logout`
  - Auth: JWT
  - Body: `dto.LogoutRequest` (`refresh_token`)
  - Behavior: revokes refresh token hash
  - Response: `{ "message": "Logged out successfully" }`

- `DELETE /auth/account`
  - Auth: JWT
  - Body: `dto.DeleteAccountRequest` (`password`)
  - Behavior:
    - If user has a password, password is required and must match
    - Scrubs refresh tokens, subscriptions, reports, blocks; soft-deletes user
  - Response: `{ "message": "Account deleted successfully" }`

### Moderation (Protected: JWT)

- `POST /reports`
  - Auth: JWT
  - Body: `dto.CreateReportRequest` (`content_type`, `content_id`, `reason`)
  - Validations:
    - `content_type` in `{user, post, comment}`
    - `reason` required
  - Response: `models.Report` (created)

- `POST /blocks`
  - Auth: JWT
  - Body: `dto.BlockUserRequest` (`blocked_id`)
  - Errors:
    - `409` self-block or already blocked
  - Response: `{ "message": "User blocked successfully" }`

- `DELETE /blocks/:id`
  - Auth: JWT
  - Params: `:id` = UUID of user to unblock
  - Response: `{ "message": "User unblocked successfully" }`

### Rizz (Protected: JWT)

- `POST /rizz/generate`
  - Auth: JWT
  - Body: `{ input_text, tone?, category? }`
  - Defaults:
    - `tone=chill` if empty
    - `category=casual` if empty
  - Limits:
    - `input_text` 5..1000 chars
    - Daily free limit: 5 (skipped for active premium subscribers in DB)
  - Response:
    - `{ response: <models.RizzResponse>, responses: [r1,r2,r3] }`
  - Errors:
    - `429` when daily free limit reached

- `GET /rizz/stats`
  - Auth: JWT
  - Response: `models.RizzStreak`

- `GET /rizz/history?page=1&limit=20`
  - Auth: JWT
  - Response: `{ history, total, page }`

- `POST /rizz/select`
  - Auth: JWT
  - Body: `{ response_id, selected_idx }`
  - Response: `{ success: true }`

### Admin Moderation (Protected: JWT + Admin)

- `GET /admin/moderation/reports?status=&limit=20&offset=0`
  - Auth: JWT + `middleware.AdminOnly`
  - Response: `{ reports, total, limit, offset }`

- `PUT /admin/moderation/reports/:id`
  - Auth: JWT + `middleware.AdminOnly`
  - Body: `dto.ActionReportRequest` (`status`, `admin_note`)
  - Validations:
    - `status` in `{reviewed, actioned, dismissed}`
  - Response: `{ "message": "Report updated successfully" }`

### Webhooks (Auth: Secret Header, Not JWT)

- `POST /webhooks/revenuecat`
  - Auth: request header `Authorization` must exactly equal `REVENUECAT_WEBHOOK_AUTH`
  - Body: `dto.RevenueCatWebhook`
  - Behavior:
    - Upserts subscription using `original_transaction_id` when available
    - Attempts to link user if `app_user_id` / `original_app_user_id` parses as UUID
  - Response: `{ "received": true }`

## Remaining Gaps (Known)

- Response error shapes are inconsistent (`dto.ErrorResponse` vs `{error: ...}` in rizz endpoints). Not fatal, but hurts API UX.
- Premium bypass for `/rizz/generate` depends on DB subscription state (active + not expired). If webhooks are delayed/misconfigured, paying users may still hit free limits.
- Apple Sign-In: signature/issuer/exp are verified; if you want higher assurance, also validate nonce and/or `aud` by setting `APPLE_CLIENT_IDS`.
