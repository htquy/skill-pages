# Widget Norm / AVI integration

The shared hub owns account identity, checkout, SePay/VietQR confirmation and AI provider keys. Widget Norm uses OAuth2 PKCE S256 and /api/apps/:slug/check-access with a bearer token. It never receives provider keys.

Register the OAuth client and exact callback URL /api/auth/hub/callback. Create active apps avi and avi-tile with monthly prices: AVI starter 199000 VND; AVI Tile starter 499000 VND. Use existing admin app/plan screens, do not run production seed scripts blindly. Widget checkout now calls /api/apps/:slug, POST /api/orders, POST /api/orders/:id/payment and GET /api/orders/:id/status using scoped OAuth bearer tokens. Existing hub web checkout continues to use its session.

AI /api/v1/ai/text/generate accepts tools, toolChoice, assistant tool_calls, role=tool and tool_call_id; JSON returns toolCalls and SSE returns toolCallDeltas. OpenAI and OpenRouter support this contract. Gemini rejects tools explicitly. OpenRouter keys are managed centrally under provider openrouter; default provider data collection is deny.

Widget Norm keeps domain ownership and one-trial-per-domain records in its own public schema. Shared account module does not join those tables. Future cross-product domain policies should be extracted behind a facade. Route policy/model chains and tenant quotas remain the next gateway milestone. The widget binds each hub app subscription to one selected bot and rechecks the hub server before serving expired-trial/paid bots. Both answering and decision models use the hub transport when configured. Production SSO and actual payment confirmation still require configured client, callback, apps/plans and payment credentials.


## Shared SSO / local API setup

Account identity remains in the shared authentication User, Session and OAuth tables. Widget Norm stores workspace metadata and an encrypted subject/token link only. It does not create independent user/password accounts when SSO is enabled. Every site registers its own OAuth client and exact callback; the central session signs users into those sites through PKCE S256.

Local hub API: http://localhost:3000. Widget Norm: http://localhost:3001. Client widget-norm allows openid profile email orders:read orders:write. Payment endpoints reject invalid bearer tokens without falling back to another browser session; orders must still belong to that user and must not be expired.

Idempotent setup: npx tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/setup-widget-norm.ts --apply. Set WIDGET_NORM_BASE_URL for other deployments. Existing apps/plans and users are retained.

Checks: npx tsx --test tests/avi-gateway.test.ts tests/api-user.test.ts (6 tests), npx tsc --noEmit --incremental false, lint changed files. No real bank transfer was made during verification.
