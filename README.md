# SmartCampus AI

An AI-powered college / university management platform: authentication with role-based access
control, a PostgreSQL data model, a full set of campus modules for **students, faculty, admins,
parents and alumni**, a grounded AI assistant, a Python ML service that scores student
performance, and a single dark application shell that ties the whole thing together.

Everything is a **modular monolith**: one backend, one frontend, one database, one Python service.
No microservices.

| | |
| --- | --- |
| Phases shipped | **1 – 15** (foundation, academics, operations, AI, ML, and every campus service) |
| Frontend routes | 39 |
| API regression | **488 assertions** |
| End-to-end | **702 assertions** (55 auth + 647 across the 15 phase suites) |
| ML integration | **61 assertions** · feature parity 7 students x 44 features |
| Python unit tests | **33 passed** |

![Student command center](docs/images/student-command-center.jpg)

---

## Contents

- [What it does](#what-it-does)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Running the tests](#running-the-tests)
- [Demo accounts](#demo-accounts)
- [Environment variables](#environment-variables)
- [Project layout](#project-layout)
- [Frontend design system](#frontend-design-system)
- [Performance prediction (ML)](#performance-prediction-ml)
- [Honest limitations](#honest-limitations)
- [Documentation](#documentation)
- [Roadmap](#roadmap)

---

## What it does

| Phase | Scope | Report |
| ----- | ----- | ------ |
| 1 | Foundation: auth, RBAC, PostgreSQL model, student API, dashboard | — |
| 2 | Attendance marking, fee register and payments | [PHASE2](docs/PHASE2_REPORT.md) |
| 3 | Timetable register with conflict detection and archive-first delete | [PHASE3](docs/PHASE3_REPORT.md) |
| 4 | AI chat assistant grounded in live campus data | [PHASE4](docs/PHASE4_REPORT.md) |
| 5 | Performance prediction served by a trained Python model | [ML_ARCHITECTURE](docs/ML_ARCHITECTURE.md) |
| 6 | Personalized learning recommendations | [PHASE6](docs/PHASE6_REPORT.md) |
| 7 | Dropout risk and intervention dashboard | [PHASE7](docs/PHASE7_REPORT.md) |
| 8 | Parent portal: invitations and read-only guardian access | [PHASE8](docs/PHASE8_REPORT.md) |
| 9 | Hostel and transport management | [PHASE9](docs/PHASE9_REPORT.md) |
| 10 | Digital certificates with QR verification | [PHASE10](docs/PHASE10_REPORT.md) |
| 11 | Library: catalogue, loans, renewals, fines | [PHASE11](docs/PHASE11_REPORT.md) |
| 12 | Placement cell: drives, eligibility, applications, offers | — |
| 13 | Alumni: directory, mentorship, events, giving | [PHASE13](docs/PHASE13_REPORT.md) |
| 14 | Mess and canteen management with billing | [PHASE14](docs/PHASE14_REPORT.md) |
| 15 | Transport live-tracking readiness (staff-reported telemetry) | [PHASE15](docs/PHASE15_REPORT.md) |
| — | **Global dark AppShell** + design system (one shell for all five roles) | [FRONTEND_INTEGRATION](docs/FRONTEND_INTEGRATION_REPORT.md) |

Every phase is verified end to end in a real browser against the real API, with per-phase
assertion counts recorded in the reports above.

---

## Screenshots

| Admin — transport fleet | Mobile navigation |
| --- | --- |
| ![Admin transport](docs/images/admin-transport.jpg) | ![Mobile navigation](docs/images/mobile-navigation.jpg) |

Sign-in is deliberately outside the authenticated shell, but on the same palette:

![Sign in](docs/images/sign-in.jpg)

---

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui, lucide-react |
| Backend | Node.js 20+, Express 5, TypeScript (`tsx` for dev, `tsc` for build), Zod |
| Database | PostgreSQL 16 in Docker, raw SQL migrations, `pg` driver — no ORM |
| Auth | JWT (HS256) + bcrypt, backend-enforced RBAC on every route |
| AI | Provider abstraction: OpenAI `gpt-4o-mini` or a deterministic mock, allowlisted read-only tools, per-user rate limit |
| ML | Python 3.11, FastAPI, scikit-learn `RandomForestClassifier`, joblib |
| Design | The prototype's dark design language, generated into two stylesheets plus a token layer |
| Testing | API smoke suite, Puppeteer E2E (system Chrome), pytest, feature-parity check, shell/accessibility probes |

---

## Architecture

```
Browser (Next.js 16, React 19)
   |  Authorization: Bearer <jwt>          one API client, one fetch hook
   v
Express API (port 4000)  -- modular monolith, one module per domain
   |  validate (Zod) -> requireAuth -> requireRole -> controller -> service -> SQL
   v
PostgreSQL 16 (port 5432)              migrations in database/migrations/*.sql

Express  ->  FastAPI ML service (port 8001)  ->  RandomForest
            the browser NEVER talks to the ML service
```

Rules that hold everywhere:

- Controllers are thin; **services own all SQL and domain logic**.
- Every response goes through one envelope helper; every failure is an `ApiError`.
- The backend is the **authoritative** authorization layer. The frontend's `RoleGuard` is UX.
- Students' data is always scoped by `WHERE user_id = $1` — no endpoint trusts a `studentId`
  from the client.
- The browser only ever talks to Express, never to the database or the ML service.

---

## Getting started

### Prerequisites

- Node.js 20.9+ (tested on 24) and npm 10+
- Python 3.11+ (only for the ML service and its tests)
- Docker Desktop, or any PostgreSQL 16 instance

### 1. Database

```bash
docker compose up -d          # PostgreSQL 16 on :5432
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env          # Windows: copy .env.example .env
# then set JWT_SECRET to a long random string
npm run migrate               # applies database/migrations/*.sql
npm run seed                  # realistic demo data + demo accounts
```

`npm run seed` is destructive by design: it truncates and rebuilds the demo dataset
(18 users, 6 courses, 30 timetable slots, 540 attendance rows, fees, payments, and the data every
later phase needs).

### 3. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. ML service (optional but recommended)

Without it, predictions degrade to the rule-based estimate and say so in the UI.

```bash
# option A: docker
docker compose up -d ml-service

# option B: local
cd ml && pip install -r requirements.txt
cd inference && python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### 5. Run

```bash
# terminal 1
cd backend  && npm run dev      # http://localhost:4000

# terminal 2
cd frontend && npm run dev      # http://localhost:3000
```

Open <http://localhost:3000> and sign in with any demo account below.

---

## Running the tests

### Backend

```bash
cd backend
npm run typecheck
npm run build
npm run test:api               # 488 assertions; needs the API running, mutates the DB
npm run test:ml                # 61 assertions: real ML path + every degradation mode
npm run test:feature-parity    # SQL feature vector == Python feature vector
```

### ML service

```bash
cd ml && python -m pytest       # 33 tests
```

### Frontend

```bash
cd frontend
npx tsc --noEmit
npm run lint
npm run build
```

### End to end (needs PostgreSQL, the API and the frontend running)

```bash
cd frontend
npm run test:e2e:auth          # 55 assertions: login, session, guards, logout, back button
npm run test:e2e               # Phase 1  (26)
npm run test:e2e:phase2        # Phase 2  (48)  attendance + payments
npm run test:e2e:phase3        # Phase 3  (52)  timetable register + conflicts + archive
npm run test:e2e:phase4        # Phase 4  (43)  AI chat, grounding, role scoping
npm run test:e2e:phase5        # Phase 5  (48)  ML prediction, source badge, fallback UI
npm run test:e2e:phase6        # Phase 6  (57)  recommendations
npm run test:e2e:phase7        # Phase 7  (37)  risk + interventions
npm run test:e2e:phase8        # Phase 8  (29)  parent invitations + portal
npm run test:e2e:phase9        # Phase 9  (37)  hostel + transport
npm run test:e2e:phase10       # Phase 10 (27)  certificates + verification
npm run test:e2e:phase11       # Phase 11 (23)  library
npm run test:e2e:phase12       # Phase 12 (141) placements
npm run test:e2e:phase13       # Phase 13 (28)  alumni
npm run test:e2e:phase14       # Phase 14 (22)  mess & canteen
npm run test:e2e:phase15       # Phase 15 (29)  transport tracking
```

Phase 5 can also prove the degraded path on purpose:

```bash
E2E_ML_EXPECTED_SOURCE=RULE_BASED npm run test:e2e:phase5
```

### Shell and accessibility probes

```bash
cd frontend
npm run build:styles           # regenerate the design layer + dark theme from the prototype
npm run probe:shell             # 90 assertions: roles, navigation, drawer, palette, all 39 routes
npm run probe:visual            # screenshots into frontend/artifacts/ + a light-container audit
npm run probe:a11y              # prefers-reduced-motion and focus-ring checks
```

`build:styles` regenerates two stylesheets from the visual prototype in `../frontend` and the
dark theme from the app's own token usage. Both scripts self-verify and fail on a leak.
Override the prototype location with `PROTOTYPE_ROOT` if it is not two directories up.

---

## Demo accounts

All demo accounts share the password **`SmartCampus@2026`** (seeded locally only — never use this
value anywhere real).

| Role | Email | Notes |
| ---- | ----- | ----- |
| Student | `aarav.sharma@smartcampus.edu` | 97.8% attendance, fees cleared, has a bus pass |
| Student | `diya.krishnan@smartcampus.edu` | Section A |
| Student | `rohan.verma@smartcampus.edu` | Section A, ~71% attendance (at risk) |
| Student | `sneha.patel@smartcampus.edu` | Section B |
| Student | `karthik.reddy@smartcampus.edu` | Section B, pending fees (shows due dates) |
| Student | `ishita.banerjee@smartcampus.edu` | Section B |
| Faculty | `ananya.sharma@smartcampus.edu` | CS301, CS305 |
| Faculty | `rajesh.menon@smartcampus.edu` | CS311, CS315 |
| Faculty | `priya.nair@smartcampus.edu` | CS321, MA201 |
| Admin | `admin@smartcampus.edu` | Fee management, timetable, and every admin workflow |
| Parent | `ravi.sharma@smartcampus.edu` | Linked to Aarav (SC2025-001) |
| Parent | `kavitha.verma@smartcampus.edu` | Linked to Rohan (SC2025-003), guardian |
| Parent | `farah.khan@smartcampus.edu` | Linked to Aarav **and** Diya — the multi-student demo |
| Alumni | `arjun.menon@alumni.smartcampus.edu` | Alumni portal: profile, events, giving, mentorship |

Each role lands on its own home: `/dashboard`, `/faculty`, `/admin`, `/parent`, `/alumni`.

Parent onboarding is invitation-only: an admin creates an invitation at `/admin/parents` and
shares the one-time link. Seeding prints a development invitation token to the console — it is a
local demo token, never a real one.

---

## Environment variables

`.env` files are git-ignored. The `*.example` files are safe templates and are committed.

| Variable | Used by | Purpose | Example |
| -------- | ------- | ------- | ------- |
| `DATABASE_URL` | backend | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/smartcampus` |
| `JWT_SECRET` | backend | HS256 signing key (**never commit**) | 64+ random characters |
| `JWT_EXPIRES_IN` | backend | Token lifetime | `1d` |
| `FRONTEND_URL` | backend | CORS allow-list origin | `http://localhost:3000` |
| `PORT` | backend | API port | `4000` |
| `BCRYPT_ROUNDS` | backend | Password hashing cost | `10` |
| `AI_PROVIDER` | backend | `auto` (default), `mock` or `openai` | `auto` |
| `OPENAI_API_KEY` | backend | Enables the real provider in `auto` mode; falls back to the mock when empty | `sk-...` |
| `AI_MODEL` | backend | Chat model for the OpenAI provider | `gpt-4o-mini` |
| `AI_TIMEOUT_MS` / `AI_MAX_TOKENS` | backend | Provider timeout / answer length cap | `12000` / `400` |
| `AI_RATE_LIMIT_MAX` / `AI_RATE_LIMIT_WINDOW_MS` | backend | Per-user chat limit | `30` / `60000` |
| `ML_SERVICE_URL` | backend | Where the Python service lives. **The browser never uses this.** | `http://localhost:8001` |
| `ML_TIMEOUT_MS` | backend | Ceiling for the backend-to-ML call; on timeout the prediction degrades and says so | `5000` |
| `NEXT_PUBLIC_API_URL` | frontend | Backend base URL (the only public variable) | `http://localhost:4000` |

---

## Project layout

```
smartcampus/
|-- backend/                        Express API (modular monolith)
|   |-- src/
|   |   |-- config/                 env.ts (validated) - db.ts (pg pool)
|   |   |-- middleware/             authenticate.ts - validate.ts - errorHandler.ts
|   |   |-- modules/                one folder per domain: auth, students, attendance, fees,
|   |   |                           timetable, ai, performance, recommendations, risk, parent,
|   |   |                           hostel, transport, certificates, library, placements,
|   |   |                           alumni, mess
|   |   |-- routes/index.ts         route registry
|   |   |-- scripts/                migrate.ts - seed.ts - reset-db.ts
|   |   |-- utils/                  jwt - password - response envelope - date - ApiError
|   |   |-- app.ts                  Express app factory
|   |   `-- server.ts               listener + graceful shutdown
|   `-- tests/api.smoke.mjs         API regression suite (488 assertions)
|-- frontend/                       Next.js app
|   |-- src/
|   |   |-- app/                    routes; the "(app)" group is the authenticated shell
|   |   |-- components/
|   |   |   |-- layout/             AppShell - nav-config - page-container - command-palette
|   |   |   |-- command-center/     the student command-center surface
|   |   |   |-- auth/ providers/ ui/ states/
|   |   |   `-- attendance/ admin/ alumni/ certificates/ faculty/ fees/ hostel/ library/
|   |   |                           mess/ parent/ placements/ recommendations/ risk/ transport/
|   |   |-- hooks/use-api.ts        shared data hook (data / loading / error / reload)
|   |   |-- lib/                    api.ts client - auth.ts token store - types.ts - format.ts
|   |   `-- styles/                 generated design layer + dark theme
|   |-- e2e/                        16 Puppeteer suites (auth + phase1 ... phase15)
|   `-- scripts/                    style codemods and the shell/visual/a11y probes
|-- ml/                             Python ML service
|   |-- inference/main.py           FastAPI app
|   |-- models/                     performance_model.joblib + metadata.json
|   |-- training/                   feature_engineering.py - train.py
|   `-- tests/                      pytest suite (33 tests)
|-- database/migrations/            001_core_users ... 017_phase15_transport_telemetry
|-- docs/                           API, architecture, ML, UI system, per-phase reports
|-- docker-compose.yml              PostgreSQL 16 (+ optional ml-service)
`-- README.md
```

The trained model (`ml/models/`, ~170 KB) is committed so `docker compose up` is enough to get a
working prediction. Retrain it with `ml/training/train.py`.

---

## Frontend design system

The authenticated application uses **one dark shell** for all five roles: a collapsible sidebar
with grouped, role-aware navigation, a sticky header, a command palette (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd>),
an account menu, and an off-canvas mobile drawer.

The design comes from a standalone visual prototype, so its stylesheet is **generated**, not
hand-copied:

| Layer | Generated by | Purpose |
| ----- | ------------ | ------- |
| `src/styles/app-shell.css` | `scripts/scope-command-center-css.mjs` | the shell, verbatim, filtered to the shell's own rules |
| `src/styles/command-center.css` | same script | the student command center, anchored on its own surface |
| `src/styles/theme-dark.css` | `scripts/build-dark-theme.mjs` | the shadcn tokens plus a dark mapping of the palette the pages reference directly |

The last one is why fifteen already-verified modules follow the dark shell without being
rewritten: the semantic tokens (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`)
are re-pointed at the new palette, and the ~200 raw `bg-gray-100` / `text-red-800` utilities in
the page components are re-mapped by role rather than hand-edited in forty files.

Navigation is generated from the real route guards, so the sidebar can never offer a link that
bounces back, and nested routes activate the correct parent
(`/admin/transport` -> Transport, `/alumni/events` -> Events).

Details: [`docs/UI_DESIGN_SYSTEM.md`](docs/UI_DESIGN_SYSTEM.md) and
[`docs/FRONTEND_INTEGRATION_REPORT.md`](docs/FRONTEND_INTEGRATION_REPORT.md).

---

## Performance prediction (ML)

`GET /api/performance/predict` is scored by the trained Python model. The flow:

```
Browser  ->  Express (auth, STUDENT-only, identity from the JWT)
        ->  44-feature vector built from the student's own records
        ->  FastAPI ML service (ML_SERVICE_URL)  ->  RandomForest model
        ->  validated prediction  ->  Express  ->  dashboard card
```

The UI always states which source produced the number — **"ML model - v1"** or
**"Rule-based fallback"** — so a degraded estimate is never mistaken for a model prediction. If the
ML service is unreachable, times out, or answers with something inconsistent, the API still
returns `200` with `prediction_source: "RULE_BASED"` and a typed `fallback_reason`.

The model has three classes (`AT_RISK`, `EXCELLENT`, `GOOD`). It was trained on **6 synthetic
students** and is **not validated for real academic use** — it demonstrates the integration, not
a production model.

Full detail, including the 44-feature source mapping:
[`docs/ML_ARCHITECTURE.md`](docs/ML_ARCHITECTURE.md).

---

## Honest limitations

- The ML model is trained on 6 synthetic students. Treat its output as a demo.
- Transport "live tracking" is **staff-reported or simulated telemetry**, not GPS. The UI labels
  it "Demo tracking" everywhere it appears.
- Sessions live in `localStorage` (XSS-explainable). httpOnly cookies are a later hardening item
  and need CORS-credentials work.
- Payments are recorded in an internal ledger. There is no payment gateway.
- Rate limiting is per-endpoint (only the AI route is throttled today).
- Individual pages have not been redesigned: the shell and the token layer changed how pages are
  painted, not how they are laid out. See the roadmap.
- The design stylesheets are regenerated from a prototype that lives outside this repository
  (`PROTOTYPE_ROOT`); until it is vendored in, the generated files are the source of truth.

---

## Documentation

| Document | What it covers |
| -------- | -------------- |
| [`docs/API.md`](docs/API.md) | Full API reference |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture, auth model, permission matrix, workflows |
| [`docs/ML_ARCHITECTURE.md`](docs/ML_ARCHITECTURE.md) | Feature contract, Express -> FastAPI flow, fallback, limitations |
| [`docs/UI_DESIGN_SYSTEM.md`](docs/UI_DESIGN_SYSTEM.md) | Tokens, shell classes, spacing, transitions, rules |
| [`docs/FRONTEND_INTEGRATION_REPORT.md`](docs/FRONTEND_INTEGRATION_REPORT.md) | Prototype integration and the global AppShell |
| [`docs/PHASE2_REPORT.md`](docs/PHASE2_REPORT.md) | Attendance marking, fee register and payments |
| [`docs/PHASE3_REPORT.md`](docs/PHASE3_REPORT.md) | Timetable management |
| [`docs/PHASE4_REPORT.md`](docs/PHASE4_REPORT.md) | AI assistant |
| [`docs/PHASE6_REPORT.md`](docs/PHASE6_REPORT.md) | Recommendations |
| [`docs/PHASE7_REPORT.md`](docs/PHASE7_REPORT.md) | Risk and interventions |
| [`docs/PHASE8_REPORT.md`](docs/PHASE8_REPORT.md) | Parent portal |
| [`docs/PHASE9_REPORT.md`](docs/PHASE9_REPORT.md) | Hostel and transport |
| [`docs/PHASE10_REPORT.md`](docs/PHASE10_REPORT.md) | Certificates |
| [`docs/PHASE11_REPORT.md`](docs/PHASE11_REPORT.md) | Library |
| [`docs/PHASE13_REPORT.md`](docs/PHASE13_REPORT.md) | Alumni |
| [`docs/PHASE14_REPORT.md`](docs/PHASE14_REPORT.md) | Mess and canteen |
| [`docs/PHASE15_REPORT.md`](docs/PHASE15_REPORT.md) | Transport tracking |

---

## Roadmap

| Stage | Scope | Status |
| ----- | ----- | ------ |
| 1 – 15 | Every module listed above | **done** |
| — | **Frontend 2.0**: per-page redesign of dashboards, cards, tables and charts on the new dark shell | next, not started |

There is no Phase 16 planned. The next step is visual, not functional: the shell and the token
layer are in place, so the remaining work is redesigning individual pages against them.
