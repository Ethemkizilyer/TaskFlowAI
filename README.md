# TaskFlow AI

AI-Powered Real-Time Collaborative Task Management Board

A modern, full-stack Kanban board application with AI integration (Google Gemini), real-time collaboration (Socket.io), and full Docker support.

## Features

- **Kanban Board** with drag-and-drop task management
- **Real-time collaboration** — see team members online, live task updates
- **AI-powered features** (Google Gemini):
  - Smart priority suggestions
  - Auto-generate tags for tasks
  - Break down tasks into subtasks
  - Generate structured tasks from rough descriptions
  - Board-level AI analysis (risk detection, recommendations)
- **Authentication** — JWT-based with bcrypt password hashing
- **Multi-board support** — create and manage multiple project boards
- **Team collaboration** — invite members by email
- **Comments** on tasks
- **Activity feed** — track all board actions
- **Dark mode** — beautiful dark theme by default
- **Responsive** — works on desktop and mobile
- **TypeScript** — full type safety across frontend and backend
- **Docker** — one command to run everything

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + TypeScript + Vite + TailwindCSS + Pinia |
| Backend | Node.js + Express + TypeScript + Socket.io |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini API (free tier) |
| Real-time | Socket.io |
| Container | Docker + docker-compose |

## Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone and enter the project
cd taskflow-ai

# 2. Copy environment file and add your Gemini API key
cp .env.example .env
# Edit .env and set GEMINI_API_KEY (get free key at https://aistudio.google.com/apikey)

# 3. Run everything
docker-compose up --build

# 4. Open the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:3000
```

### Option 2: Local Development

#### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis (optional, for Socket.io scaling)

#### Backend Setup

```bash
cd server
npm install

# Copy and configure environment
cp ../.env.example .env
# Edit .env with your database URL and Gemini API key

# Run database migrations
npx prisma migrate dev --name init

# Seed demo data
npm run seed

# Start dev server
npm run dev
```

#### Frontend Setup

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173

## Demo Accounts

After running the seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskflow.ai | admin123 |
| Member | demo@taskflow.ai | user123 |

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `PATCH /api/auth/me` — Update profile

### Boards
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create board
- `GET /api/boards/:id` — Get board with tasks
- `PATCH /api/boards/:id` — Update board
- `DELETE /api/boards/:id` — Delete board
- `POST /api/boards/:id/members` — Add member by email
- `DELETE /api/boards/:id/members/:userId` — Remove member

### Tasks
- `POST /api/boards/:boardId/tasks` — Create task
- `PATCH /api/boards/:boardId/tasks/:taskId` — Update task
- `PATCH /api/boards/:boardId/tasks/:taskId/move` — Move task (drag-drop)
- `DELETE /api/boards/:boardId/tasks/:taskId` — Delete task
- `POST /api/boards/:boardId/tasks/:taskId/comments` — Add comment

### AI
- `GET /api/ai/status` — Check if AI is configured
- `POST /api/ai/suggest-priority` — AI suggest task priority
- `POST /api/ai/suggest-tags` — AI suggest task tags
- `POST /api/ai/generate-subtasks` — AI generate subtasks
- `POST /api/ai/generate-task` — AI generate task from description
- `POST /api/ai/analyze-board/:boardId` — AI analyze board health

### Socket.io Events
- `board:join` / `board:leave` — Join/leave board room
- `task:created` / `task:updated` / `task:moved` / `task:deleted` — Real-time task updates
- `comment:added` — Real-time comment updates
- `user:joined` / `user:left` — Presence tracking
- `task:typing` — Typing indicators
- `cursor:move` — Live cursor tracking

## Project Structure

```
taskflow-ai/
├── docker-compose.yml
├── .env.example
├── server/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── server.ts          # Entry point
│       ├── app.ts             # Express app
│       ├── config/            # Config & Prisma client
│       ├── types/             # TypeScript types
│       ├── middleware/        # Auth & error handling
│       ├── controllers/       # Route controllers
│       ├── routes/            # API routes
│       ├── services/          # AI service (Gemini)
│       └── sockets/           # Socket.io handler
└── client/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.ts            # Entry point
        ├── App.vue            # Root component
        ├── style.css          # Tailwind styles
        ├── types/             # TypeScript types
        ├── api/               # Axios client & Socket.io
        ├── stores/            # Pinia stores (auth, board)
        ├── router/            # Vue Router
        └── views/             # Pages (Login, Register, Dashboard, Board)
```

## Getting a Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file as `GEMINI_API_KEY`

## License

MIT
