# GymOS

GymOS is a gym management monorepo with a React frontend and an Express backend backed by Supabase.

## Projects

- `apps/web`: Vite + React admin application
- `apps/server`: Express + TypeScript API

## Tech Stack

- Turborepo
- Bun workspaces
- React
- TypeScript
- Vite
- Express
- Supabase

## Requirements

- Bun `1.2.x` or newer
- Node.js `18+`

## Install

```sh
bun install
```

## Environment

Server env lives in `apps/server/.env`.

Required values:

- `PORT`
- `FRONTEND_URL`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Frontend env is optional and usually lives in `apps/web/.env.local`.

- `VITE_API_BASE_URL`

Example local setup:

```env
# apps/server/.env
PORT=3001
FRONTEND_URL=http://localhost:8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_GYM_PHOTO_BUCKET=bucket-name
```

```env
# apps/web/.env.local
VITE_API_BASE_URL=http://localhost:3001
```

## Development

Run both apps:

```sh
bun run dev
```

Run one app only:

```sh
bun run dev:web
bun run dev:server
```

Default local URLs:

- Web: `http://localhost:8080`
- API: `http://localhost:3001`

## Build

Build all workspaces:

```sh
bun run build
```

Build individual apps:

```sh
cd apps/web && npm run build
cd apps/server && npm run build
```

## Deployment

Deploy the frontend and backend separately.

Recommended production layout:

- Frontend: `https://app.yourdomain.com`
- Backend: `https://api.yourdomain.com`
- Supabase: hosted by Supabase

This project uses cookie-based auth between web and API, so keeping both apps under the same root domain is the simplest production setup.

Production example:

```env
# apps/server/.env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://app.yourdomain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```env
# apps/web/.env.production
VITE_API_BASE_URL=https://api.yourdomain.com
```

## Workspace Scripts

Root scripts:

- `bun run dev`
- `bun run dev:web`
- `bun run dev:server`
- `bun run build`
- `bun run lint`

See app-specific READMEs for more details:

- `apps/web/README.md`
- `apps/server/README.md`
