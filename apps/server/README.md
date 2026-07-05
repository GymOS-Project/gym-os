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
FRONTEND_URL=http://localhost:8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional WhatsApp configuration
# TWILIO_ACCOUNT_SID=your_twilio_account_sid
# TWILIO_AUTH_TOKEN=your_twilio_auth_token
# TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
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
- `FRONTEND_URL` must match the frontend origin for CORS

## Production Notes

- Set `NODE_ENV=production`
- Use a real `FRONTEND_URL`, for example `https://app.yourdomain.com`
- Prefer deploying behind `https`
- If deployed separately from the frontend, keep both apps on the same root domain when possible
