# Project Structure

## Root
- `backend/` - Express/Prisma API server
- `frontend/` - React/Vite client
- `game-plan/` - Game design documents (CSV, Markdown)
- `docker-compose.yml` - Dev environment (postgres, redis, backend, frontend)
- `.env` - Environment variables (not tracked)
- `.kiro/` - Kiro configuration and steering rules

## Backend (`backend/`)
- `src/index.ts` - Entry point
- `prisma/schema.prisma` - Database schema
- `prisma/seed.ts` - Seed entry point
- `prisma/seeds/` - Per-domain seed files (actions, cards, education, housing, jobs, vehicles)

## Frontend (`frontend/`)
- `src/App.tsx` - Root component
- `src/main.tsx` - Entry point
- `src/store.ts` - Redux store

## Game Plan (`game-plan/`)
- `Game_Instructions.md` - Full gameplay rules and coding notes
- `Lemonade - *.csv` - Game data by domain (Actions, Cards, Edu, Jobs, Houses, Transportation, etc.)

## Conventions
- Seed files use Prisma upsert so they are safe to re-run
- Static game data (jobs, housing, vehicles, education, actions, cards) is seeded and read-only during gameplay
- Player state is fully relational; complex nested state stored as JSONB columns
- Environment config in `.env` (not tracked); see `.env.example`
- Node modules excluded from version control
