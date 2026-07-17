# TaskFlow AI

AI-Powered Real-Time Collaborative Task Management Board

A modern, full-stack Kanban board application with AI integration (Google Gemini), real-time collaboration (Socket.io), role-based access control, team mood tracking, and full Docker support.

## Features

- **Kanban Board** with drag-and-drop task management
- **Real-time collaboration** — see team members online, live task updates
- **AI-powered features** (Google Gemini):
  - Smart priority suggestions
  - Auto-generate tags for tasks
  - Break down tasks into subtasks
  - Generate structured tasks from rough descriptions
  - Board-level AI analysis (risk detection, recommendations)
- **6-Level Role Hierarchy** — Admin → Director → Manager → Team Leader → Team Member → Personnel
- **Role-based access control** — granular permissions per role
- **Authentication** — JWT-based with bcrypt password hashing
- **Multi-board support** — create and manage multiple project boards
- **Board member management** — add members by email during board creation or afterward
- **Team Pulse** — daily mood check-ins, stress & workload tracking, burnout risk detection
- **Focus Sessions** — Pomodoro-style focus time tracking with streaks
- **Automation** — trigger-based task automations per board
- **Messaging** — built-in direct messaging and group conversations
- **Notifications** — real-time in-app notification system
- **Comments** on tasks
- **Activity feed** — track all board actions
- **Command Palette** — quick search & navigation
- **i18n** — Turkish and English language support
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
| i18n | vue-i18n (TR / EN) |
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

After running the seed script (password for all: `123456`):

| Role | Email |
|------|-------|
| Admin | admin@taskflow.ai |
| Director | director@taskflow.ai |
| Manager | manager@taskflow.ai |
| Team Leader | leader@taskflow.ai |
| Team Member | member@taskflow.ai |
| Personnel | personnel@taskflow.ai |

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `PATCH /api/auth/me` — Update profile

### Boards
- `GET /api/boards` — List user's boards
- `POST /api/boards` — Create board (supports `memberEmails` array for inline member addition)
- `GET /api/boards/:id` — Get board with tasks, columns, and members
- `PATCH /api/boards/:id` — Update board
- `DELETE /api/boards/:id` — Delete board (soft delete)
- `POST /api/boards/:id/members` — Add member by email
- `DELETE /api/boards/:id/members/:userId` — Remove member

### Tasks
- `POST /api/boards/:boardId/tasks` — Create task
- `PATCH /api/boards/:boardId/tasks/:taskId` — Update task
- `PATCH /api/boards/:boardId/tasks/:taskId/move` — Move task (drag-drop)
- `DELETE /api/boards/:boardId/tasks/:taskId` — Delete task (soft delete)
- `POST /api/boards/:boardId/tasks/:taskId/comments` — Add comment

### AI
- `GET /api/ai/status` — Check if AI is configured
- `POST /api/ai/suggest-priority` — AI suggest task priority
- `POST /api/ai/suggest-tags` — AI suggest task tags
- `POST /api/ai/generate-subtasks` — AI generate subtasks
- `POST /api/ai/generate-task` — AI generate task from description
- `POST /api/ai/analyze-board/:boardId` — AI analyze board health

### Team Pulse
- `POST /api/mood/checkin` — Daily mood check-in (mood, stress, workload, note)
- `GET /api/mood/today` — Get today's check-in
- `GET /api/mood/team-pulse` — Get team mood overview (distribution, burnout risk, weekly trend)

### Focus Sessions
- `POST /api/focus/start` — Start focus session
- `POST /api/focus/stop` — Stop focus session
- `GET /api/focus/today` — Today's focus stats
- `GET /api/focus/week` — Weekly focus stats & streak

### Automations
- `GET /api/automations` — List automations
- `POST /api/automations` — Create automation
- `PATCH /api/automations/:id/toggle` — Enable/disable automation
- `DELETE /api/automations/:id` — Delete automation

### Notifications
- `GET /api/notifications` — List notifications
- `PATCH /api/notifications/:id/read` — Mark as read
- `PATCH /api/notifications/read-all` — Mark all as read

### Users (Admin)
- `GET /api/users` — List all users (admin only)
- `PATCH /api/users/:id/role` — Update user role (admin only)
- `PATCH /api/users/:id/status` — Activate/deactivate user (admin only)

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
│   │   ├── schema.prisma       # DB schema with enums, indexes, soft delete
│   │   └── seed.ts             # Seed script (6 role-based users)
│   └── src/
│       ├── server.ts           # Entry point
│       ├── app.ts              # Express app with Helmet, CORS, rate limit
│       ├── config/             # Config, Prisma client (soft delete middleware), permissions
│       ├── types/              # TypeScript types
│       ├── middleware/         # Auth, admin, error handling
│       ├── controllers/        # Auth, Board, Task, User, Mood, Focus, Automation, Notification
│       ├── routes/             # API routes
│       ├── services/           # AI service (Gemini)
│       └── sockets/            # Socket.io handler
└── client/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.ts             # Entry point
        ├── App.vue             # Root component
        ├── style.css           # Tailwind styles
        ├── types/              # TypeScript types
        ├── api/                # Axios client & Socket.io
        ├── stores/             # Pinia stores (auth, board, theme)
        ├── router/             # Vue Router
        ├── i18n/               # Turkish & English locales
        ├── components/         # Navbar, NotificationBadge, LanguageSwitcher
        └── views/              # Login, Register, Landing, Dashboard, Board, TeamPulse, Focus, Messages, Profile, Admin, Panels
```

## Getting a Free Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in your `.env` file as `GEMINI_API_KEY`

## Role Hierarchy & Permissions

| Role | Level | Key Permissions |
|------|-------|-----------------|
| Admin | 6 | Full system access, user management |
| Director | 5 | Department oversight, strategic management |
| Manager | 4 | Team management, board creation, task assignment |
| Team Leader | 3 | Team coordination, task management |
| Team Member | 2 | Task execution, comments, mood check-in |
| Personnel | 1 | Basic task view, limited actions |

## License

MIT
