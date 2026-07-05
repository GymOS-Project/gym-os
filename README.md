# GymOS

## Project Info

## Local development (Bun + Turborepo)

This project is a Bun-based Turborepo monorepo with two apps:

- `apps/web` – Vite/React frontend (current Gym UI)
- `apps/server` – Node/Express + TypeScript backend using Supabase

### Prerequisites

- Bun installed (v1.2.x): https://bun.sh
- Node.js installed (for running Express/nodemon)

### Install dependencies

```sh
bun install
```

### Configure environment variables

Backend (`apps/server/.env` – copy from `.env.example`):

```sh
cd apps/server
cp .env.example .env   # or create manually
```

Set at least:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL` – e.g. `http://localhost:8080`

Frontend (`apps/web/.env` – copy from `.env.example`):

```sh
cd apps/web
cp .env.example .env
```

Adjust `VITE_API_BASE_URL` if your API runs on a different port.

### Run all apps in dev mode

From the repo root:

```sh
bun run dev
```

This runs both:

- Web: http://localhost:8080
- API: http://localhost:3001

You can also run them individually:

```sh
# Only web
bun run dev:web

# Only server
bun run dev:server
```

## Tech Stack

This project is built with:

- Turborepo (monorepo orchestration)
- Bun (package manager)
- Vite, TypeScript, React, shadcn-ui, Tailwind CSS (frontend)
- Node, Express, TypeScript, Supabase (backend)
