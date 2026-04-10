# PyLab — Python Learning IDE

A hands-on Python learning environment built for educators and students. Instructors create courses and assignments with guided instructions; students write code, get real-time AI tutoring, and prove their understanding through a code defense quiz at submission.

> **Status:** Proof of concept · EC2-ready · Mock auth (Clerk integration planned)

---

## Features

### For Students
- **Guided IDE** — Monaco-style code editor with assignment instructions side by side
- **Paste protection** — Students must type their code; paste is blocked at the browser level
- **AI Tutor chatbot** — Answers syntax questions, helps decode error messages, and gives hints without revealing answers (powered by Claude)
- **Code Defense Quiz** — At submission, students answer questions about their own code to verify genuine understanding
- **Course browser** — Browse and enroll in published courses; track progress per assignment

### For Instructors
- **Course management** — Create, publish/unpublish, and delete courses
- **Assignment builder** — Write assignment instructions with a rich text editor; set language and order
- **Student roster** — View enrolled students and their submission status per assignment

### Platform
- **Token-based auth** — Works inside sandboxed iframes (no cookies or localStorage required); Clerk integration planned for production
- **Language support** — Python today; architecture is language-agnostic for Java, Node.js, and others

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Tailwind CSS v3, Lucide icons |
| **Routing** | Wouter (hash-based routing for iframe compatibility) |
| **Data fetching** | TanStack Query v5 |
| **Backend** | Node.js, Express |
| **Database** | SQLite via better-sqlite3 + Drizzle ORM |
| **AI Tutor** | Anthropic Claude (claude-3-5-haiku) |
| **Code execution** | Server-side Python subprocess with sandboxed temp files |
| **Auth** | In-memory token store (Bearer tokens); Clerk planned |
| **Build** | esbuild (server), Vite (client) |

---

## Architecture

```
pylab/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── pages/
│       │   ├── auth.tsx             # Login / register with role selection
│       │   ├── instructor-dashboard.tsx  # Course & assignment CRUD
│       │   ├── student-dashboard.tsx     # Enrolled courses & browse
│       │   └── ide.tsx              # Code editor + instructions + AI tutor
│       ├── components/
│       │   ├── code-editor.tsx      # Monaco-style editor with paste protection
│       │   ├── instructions-panel.tsx
│       │   ├── terminal-panel.tsx   # Code execution output
│       │   ├── chat-panel.tsx       # AI Tutor interface
│       │   └── code-defense-dialog.tsx  # Submission quiz
│       ├── hooks/
│       │   └── use-auth.ts          # Token auth hook
│       └── lib/
│           └── queryClient.ts       # TanStack Query + auth header injection
│
├── server/                  # Express backend
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # All API routes + token auth middleware
│   ├── storage.ts           # Drizzle ORM data access layer
│   └── vite.ts              # Dev-mode Vite integration
│
└── shared/
    └── schema.ts            # Drizzle schema + Zod types (shared client/server)
```

### Data Model

```
users          — id, email, password, name, role (instructor | student)
courses        — id, instructorId, title, description, language, duration, isPublished
assignments    — id, courseId, title, instructions, order
enrollments    — id, studentId, courseId, enrolledAt, progress
submissions    — id, studentId, assignmentId, code, score, defenseAnswers, submittedAt
```

### Auth Flow (Token-based)

The app runs in a sandboxed iframe environment where cookies and Web Storage APIs are blocked. Authentication uses stateless Bearer tokens:

1. `POST /api/auth/login` — validates credentials, generates a random token, stores `token → userId` in server memory, returns `{ ...user, token }`
2. Client stores the token in React state (not localStorage)
3. Every API request includes `Authorization: Bearer <token>`
4. `requireAuth` middleware validates the token on every protected route
5. `POST /api/auth/logout` — deletes the token from server memory

> When Clerk is integrated, the JWT from Clerk's session replaces this token and the server-side token store is removed entirely.

### API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns token |
| POST | `/api/auth/logout` | Bearer | Invalidate token |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/courses` | Bearer | List courses (role-filtered) |
| POST | `/api/courses` | Instructor | Create course |
| PATCH | `/api/courses/:id` | Instructor | Update / publish course |
| DELETE | `/api/courses/:id` | Instructor | Delete course |
| GET | `/api/courses/:id/assignments` | Bearer | List assignments |
| POST | `/api/courses/:id/assignments` | Instructor | Create assignment |
| PATCH | `/api/assignments/:id` | Instructor | Update assignment |
| DELETE | `/api/assignments/:id` | Instructor | Delete assignment |
| GET | `/api/enrollments` | Bearer | Student's enrollments |
| POST | `/api/enrollments` | Student | Enroll in course |
| GET | `/api/courses/:id/students` | Instructor | Roster |
| POST | `/api/submissions` | Bearer | Submit code + defense answers |
| GET | `/api/submissions` | Bearer | Submission history |
| POST | `/api/execute` | Bearer | Run Python code (sandboxed) |
| POST | `/api/chat` | Bearer | AI Tutor message |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3 (for code execution)
- An [Anthropic API key](https://console.anthropic.com/) (for the AI Tutor)

### Install & Run

```bash
git clone https://github.com/rmichak/pylab.git
cd pylab
npm install

# Push the database schema
npx drizzle-kit push

# Start the dev server (Express + Vite on port 5000)
ANTHROPIC_API_KEY=your_key_here npm run dev
```

Open [http://localhost:5000](http://localhost:5000).

### Demo Accounts

Two accounts are seeded automatically on first run:

| Role | Email | Password |
|---|---|---|
| Instructor | `instructor@pylab.dev` | `demo123` |
| Student | `student@pylab.dev` | `demo123` |

### Production Build

```bash
npm run build
NODE_ENV=production ANTHROPIC_API_KEY=your_key_here node dist/index.cjs
```

---

## Roadmap

- [ ] **Clerk authentication** — Replace mock token auth with Clerk JWTs and user management
- [ ] **Stripe payments** — $5/month student subscriptions or $30 per 6-month course access
- [ ] **Multi-language support** — Java, Node.js execution alongside Python
- [ ] **EC2 deployment** — Dockerized with Nginx reverse proxy for production AWS hosting
- [ ] **Assignment auto-grading** — Test-case runner to validate output correctness
- [ ] **Progress analytics** — Instructor dashboard with per-student completion metrics

---

## License

MIT
