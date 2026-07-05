# GymOS Web

React + Vite frontend for GymOS.

## Responsibilities

- Gym owner auth flow
- Protected admin routes
- Member, plan, enquiry, followup, dashboard, and report UI
- Calls the backend API only

## Scripts

```sh
npm run dev
npm run build
npm run preview
npm run lint
```

## Environment

Create `apps/web/.env.local` for local development.

Example:

```env
VITE_API_BASE_URL=http://localhost:3001
```

For production:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

## Local Run

From the repo root:

```sh
bun run dev:web
```

Or from this folder:

```sh
npm run dev
```

The web app runs on `http://localhost:8080` by default.

## Auth Notes

- Auth is cookie-based
- API requests are sent with `credentials: include`
- The backend must allow this frontend origin through `FRONTEND_URL`

## Build

```sh
npm run build
```

Output is written to `dist/`.

## Deployment Notes

- Deploy this app separately from the API
- Point `VITE_API_BASE_URL` at the deployed backend
- Best setup:
  - frontend on `app.yourdomain.com`
  - backend on `api.yourdomain.com`
