# GymOS Server

Express + TypeScript backend for GymOS.

## Responsibilities

- Supabase-backed auth
- Cookie-based session handling
- Members, plans, enquiries, followups, reports, and dashboard APIs
- Background subscription reminder worker

## Scripts

```sh
npm run dev
npm run build
npm run start
```

## Environment

Create `apps/server/.env`.

Example:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8089
PASSWORD_RESET_REDIRECT_URL=http://localhost:8089/reset-password
ONBOARDING_PAYMENTS_ENABLED=false
DISCLOSE_FORGOT_PASSWORD_USER_EXISTS=true
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=GymOS <no-reply@yourdomain.com>

# Optional WhatsApp configuration
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Optional email links
# MOBILE_APP_URL=https://app.gymos.example/mobile
```

## Local Run

From the repo root:

```sh
bun run dev:server
```

Or from this folder:

```sh
npm run dev
```

The server listens on `http://localhost:3001` by default.

## Healthcheck

```text
GET /healthcheck
```

## Main Route Groups

- `/auth`
- `/members`
- `/plans`
- `/followups`
- `/enquiries`
- `/reports`
- `/stats`

## Auth Notes

- Login and signup set HTTP-only cookies
- Session refresh is handled on the backend
- `FRONTEND_URL` must match the frontend origin for CORS (no trailing slash). You can also provide multiple origins as a comma-separated list, or use `CORS_ORIGINS`.
- `PASSWORD_RESET_REDIRECT_URL` controls the `redirect_to` value in Supabase password recovery emails (must be allow-listed in Supabase Auth redirect URLs).
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` enable welcome emails for onboarding and admin-created staff accounts
- `MOBILE_APP_URL` overrides the default mobile app link used in staff welcome emails

## Production Notes

- Set `NODE_ENV=production`
- Use a real `FRONTEND_URL`, for example `https://app.yourdomain.com` (or a comma-separated list)
- Prefer deploying behind `https`
- If deployed separately from the frontend, keep both apps on the same root domain when possible
