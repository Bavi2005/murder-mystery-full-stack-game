# ft_transcendence — Mystery Mansion

A full-stack, real-time multiplayer murder mystery game built for the 42 `ft_transcendence` project.

Players join live rooms, move around a mansion board, gather clues, vote, and accuse the murderer in a clue-like social deduction game.

<img width="1167" height="926" alt="image" src="https://github.com/user-attachments/assets/a1713442-50a1-4b41-ac4a-9b89c8236d1b" />


## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Socket.IO client, Axios |
| Backend   | Node.js, Express, TypeScript, Prisma, Socket.IO |
| Database  | PostgreSQL 16 (schema in `backend/prisma/`) |
| Cache/Adapter | Redis 7 (Socket.IO Redis adapter) |
| Auth      | JWT (access + refresh tokens), bcrypt, optional 2FA (TOTP) |
| App armor | Helmet, rate limiting, XSS/SQL-injection guards, input validation |
| Infra     | Docker, docker-compose, nginx reverse proxy (TLS) |

## Project Structure

```
.
├── docker-compose.yml          # Postgres, Redis, backend, frontend, nginx
├── backend/
│   ├── src/
│   │   ├── config/             # env-driven configuration
│   │   ├── controllers/        # HTTP request handlers
│   │   ├── middleware/         # auth, validation, error handling
│   │   ├── routes/             # auth / users / games API routes
│   │   ├── services/           # business logic
│   │   ├── socket/             # real-time Socket.IO handlers
│   │   ├── game/               # game/board domain logic
│   │   └── utils/              # crypto, TOTP, logging, helpers
│   ├── prisma/
│   │   ├── schema.prisma       # data model
│   │   └── init.sql            # bootstraps schema/types on first DB start
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── components/         # reusable UI
    │   ├── context/            # auth, socket, game contexts
    │   ├── pages/              # login, lobby, game, profile, settings...
    │   ├── game/               # board rendering & game logic
    │   └── services/           # API + websocket clients
    └── vite.config.ts
```

## Features

- Live multiplayer rooms with Socket.IO (websocket + polling fallback)
- Turn-based gameplay: roll dice, move, suggest, reveal, accuse, vote
- JWT auth with refresh token rotation and optional TOTP two-factor auth
- Profile pages, friends, chat, match history, settings
- Rate limiting, input validation, helmet security headers
- Dockerized dev-to-prod deployment behind an nginx reverse proxy with TLS

## Quick Start

See [how_to_run.txt](./how_to_run.txt) for a detailed first-time setup, configuration, and troubleshooting.

Requirements: Node.js 20+, Docker + Docker Compose.

```bash
# 1. Start infrastructure (Postgres + Redis)
docker compose up -d postgres redis

# 2. Run backend (dev)
cd backend
npm install
cp .env.example .env         # edit as needed
npx prisma generate
npm run dev

# 3. Run frontend (dev, new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend dev server: http://localhost:3000
Backend API:         http://localhost:3001
Health check:        http://localhost:3001/health

## Scripts

### Backend (`cd backend`)

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start dev server with auto-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server from `dist/` |
| `npm test` | Run unit tests (vitest) |
| `npm run lint` | Lint `src/` |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Apply `prisma/migrate deploy` migrations |
| `npm run prisma:studio` | Open Prisma Studio GUI |

### Frontend (`cd frontend`)

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start Vite dev server on :3000 with proxy to :3001 |
| `npm run build` | Type-check and production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run tests (vitest) |
| `npm run lint` | Lint `src/` |

## Project Board / Tests

Unit tests live alongside the code (`*.test.ts`) under `backend/src` and `frontend/src`.
Run them with `npm test` in the relevant directory.

## License

For educational purposes (42 school project).# murder-mystery-full-stack-game
