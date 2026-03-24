# Technology Stack

## Backend
- Runtime: Node.js with TypeScript 5.3
- Framework: Express 4
- ORM: Prisma 5 with PostgreSQL 15
- Real-time: Socket.io 4
- Cache/Session: Redis 7 (ioredis)
- Auth: JWT (jsonwebtoken) + bcryptjs
- Validation: Zod
- Security: Helmet, CORS

## Frontend
- Framework: React 18 with TypeScript 5.3
- Build tool: Vite 5
- UI: MUI (Material UI) v5 + Emotion
- State: Redux Toolkit + React Query (TanStack)
- Routing: React Router v6
- Real-time: socket.io-client
- Charts: Recharts
- Animation: Framer Motion
- Audio: Howler.js
- HTTP: Axios

## Infrastructure
- Containerized with Docker Compose (dev)
- Services: postgres, redis, backend, frontend
- Backend port: 3001, Frontend port: 5173

## Common Commands
```bash
# Start all services
docker compose up

# Run DB seed
docker compose exec backend npm run prisma:seed

# Prisma migrations
docker compose exec backend npm run prisma:migrate

# Prisma Studio
docker compose exec backend npm run prisma:studio

# Frontend dev (standalone)
cd frontend && npm run dev

# Backend dev (standalone)
cd backend && npm run dev
```

## Code Style
- ESLint + Prettier configured in both frontend and backend
- `npm run lint` / `npm run format` in each package
