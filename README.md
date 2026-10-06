# JobDev

**Get hired faster — resume → interview in under 30 seconds.**

JobDev is a LinkedIn-style job platform connecting two kinds of users:

- **Job seekers (candidates)** — search and filter jobs, upload a resume, and get
  their profile auto-filled plus an ATS-tailored resume generated in under 30 seconds.
- **Recruiters** — post vacancies (e.g. "Java developer needed") and get matched
  with the highest-ranking candidates, backed by spam filtering and business-email
  verification.

> The core differentiator is **time**: resume parsing, profile sync, and
> ATS-based resume generation must all complete in under 30 seconds.

---

## Tech stack

| Layer | Technology |
|---|---|
| Workspace | pnpm 9.15 + Turborepo monorepo |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 3.4 · shadcn/ui · react-hook-form · Zod · Zustand |
| Backend | Node.js + Express 4 · Zod |
| Data | Postgres 16 + Redis 7 (defined in `docker-compose.yml` — not wired yet) |
| Code quality | Prettier · ESLint · Husky · GitHub Actions CI |

## Implemented so far (auth milestone)

- **Login** — email-or-phone identifier + password, show/hide password,
  "Keep me signed in", forgot-password link, success/error states.
- **Signup** — email, phone, password (with live strength meter), confirm
  password, terms checkbox, and **role selection (candidate / recruiter)**.
- **Role-aware dashboard** — candidates see the job-search dashboard, recruiters
  see the hiring dashboard; shared header with role badge and sign-out.
- **Auth API** — `POST /api/auth/register` and `POST /api/auth/login`
  (Express + Zod validation).
- **Security-conscious errors** — generic "Invalid credentials" messages to
  prevent account enumeration.
- **Brand** — JobDev logo (SVG) reflecting the resume → ATS → hired flow.

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9.15 (`corepack enable`, or `npm install -g pnpm@9.15.0`)

### Setup

```bash
git clone <repo-url>
cd <repo>
pnpm install
```

### Environment variables

Copy the examples and fill them in:

```bash
cp .env.example .env                       # (empty for now)
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
```

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:4000` | backend origin the frontend proxies `/api/*` to |
| `PORT` | backend | `4000` | API port |
| `DATABASE_URL` | backend | — | Postgres connection (not wired yet) |
| `REDIS_URL` | backend | — | Redis connection (not wired yet) |

### Run

```bash
pnpm dev
```

- Frontend — http://localhost:3000 (login at `/login`, signup at `/register`)
- Backend — http://localhost:4000 (health check at `/health`)

> **Note:** the frontend proxies `/api/*` to the backend via `next.config.js`
> rewrites, so the browser only ever talks to one origin.

---

## Folder structure

```
apps/
  frontend/                     # Next.js 15 (App Router)
    src/
      app/
        (auth)/                 # login + signup pages and shared shell
        (dashboard)/            # role-aware dashboard
        layout.tsx              # root layout (metadata, favicon, fonts)
        page.tsx                # redirects / -> /login
        globals.css             # Tailwind + shadcn CSS variables (JobDev palette)
      components/
        ui/                     # shadcn/ui primitives (Button, Input, Label, ...)
        logo.tsx                # JobDev logo (dark/light variants)
      features/
        auth/                   # schemas, api, login/register forms, role selector
        dashboard/              # candidate + recruiter dashboards
      store/
        auth.ts                 # zustand auth store (persists signed-in user + role)
      lib/                      # utils (cn), api-client
      types/                    # ambient declarations (css.d.ts)
    public/
      logo.svg, logo-mark.svg   # brand assets
    tailwind.config.ts
    postcss.config.js           # REQUIRED for Tailwind to compile
    next.config.js              # /api proxy rewrites
  backend/                      # Express 4 + Zod
    src/
      modules/
        auth/                   # schemas, types, service, controller, routes
        user/                   # starter user module
      middlewares/              # errorHandler (Zod-aware), auth, rateLimiter, validate
      config/                   # env, database, logger
      database/                 # client stub + migrations/models/seeders (to fill)
packages/
  shared-types/                 # shared TS types
  config/                       # shared config (tsconfig, eslint)
  ui/                           # shared UI package (starter)
```

---

## Auth API

| Method | Endpoint | Body | Success |
|---|---|---|---|
| `POST` | `/api/auth/register` | `{ email, phone, role: "candidate" \| "recruiter", password, confirmPassword }` | `201` + user |
| `POST` | `/api/auth/login` | `{ identifier, password }` (identifier = email or phone) | `200` + `{ user, token }` |

Error responses use `{ message, errors?: [{ field, message }] }`.

---

## Design system

JobDev uses a blue palette that reflects the job theme:

| Token | Hex |
|---|---|
| Primary | `#3B57E7` |
| Primary dark | `#2943C8` |
| Primary hover | `#304BD4` |
| Primary light | `#EEF1FF` |
| Background | `#F7F8FC` |
| Success / Warning / Error / Info | `#22B573` / `#F5A623` / `#E5484D` / `#40C9C6` |

The full palette lives as HSL CSS variables in `apps/frontend/src/app/globals.css`
and is mapped into Tailwind in `tailwind.config.ts`.

---

## Commit conventions

- **Branches:** `<type>/<scope>/<YourName>` — e.g. `feat/auth/Sushil`
- **Commits:** Conventional Commits with your name at the end, e.g.
  `feat(auth): add login and signup with role selection — Sushil`
- Keep commits **feature-wise and atomic** so reviewers can follow one logical
  change per commit.

---

## Known gaps / next tickets

- [ ] **Database** — `src/database/client.ts` is a stub; users currently live in
      an in-memory store. Wire Postgres (migrations/models in
      `apps/backend/src/database/`).
- [ ] **Auth hardening** — hash passwords (argon2/bcrypt) and sign real JWTs
      instead of demo tokens; replace the localStorage session with an
      httpOnly cookie.
- [ ] **Resume upload + parsing** — Python parser that extracts profile data and
      auto-fills the candidate profile.
- [ ] **ATS resume generation** — regenerate resumes for a target job/ATS with
      watermarks, all within the 30-second budget.
- [ ] **Recruiter side** — spam filtering, business-email-only registration,
      blocking of spam accounts, and candidate ranking per vacancy.
