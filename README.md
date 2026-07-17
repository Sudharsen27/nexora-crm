# Nexora CRM

Production-grade multi-tenant SaaS CRM with sales, service, AI, portal, and developer platform capabilities.

## Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Shadcn-style UI, Recharts, React Hook Form + Zod |
| **Backend** | FastAPI, SQLAlchemy, Alembic, PostgreSQL (Supabase / Neon / local) |
| **Auth** | JWT access + refresh tokens, RBAC (owner / admin / member) |
| **AI** | OpenAI API — Assistant + Multi-Agent platform |
| **Infra** | Docker Compose (optional), local PowerShell / npm workflows |

## Modules

| Module | Status |
|--------|--------|
| Authentication & RBAC | ✅ |
| Organizations & Team | ✅ |
| Companies, Contacts, Leads, Deals, Pipeline | ✅ |
| Activities, Tasks, Notes | ✅ |
| Dashboard & Business Intelligence | ✅ |
| Calendar & Meetings | ✅ |
| Workflow Engine | ✅ |
| Notifications | ✅ |
| Email Center | ✅ |
| Document Management | ✅ |
| Customer Portal | ✅ |
| AI Assistant | ✅ |
| AI Multi-Agent Platform | ✅ |
| Administration | ✅ |
| Integration Marketplace | ✅ |
| Developer Platform | ✅ |
| Mobile CRM (PWA) | ✅ |
| Reports & Analytics | ✅ |
| **Enterprise Support & Service Desk (Phase 19)** | ✅ |

### Support & Service Desk (Phase 19)

Staff CRM module at `/{tenantSlug}/support`:

- Support dashboard (KPIs, CSAT, SLA health, agent performance)
- Ticket management (create, assign, escalate, merge, split, close, reopen, archive, bulk actions)
- Omnichannel inbox (email, chat, portal, WhatsApp, social, SMS, phone)
- Live chat
- Knowledge base (articles, FAQs, drafts / published)
- SLA policies & automatic escalation checks
- Customer feedback (CSAT / NPS)
- Support analytics & AI assist (classify, sentiment, reply suggestions)
- Integrated with portal tickets, notifications, workflows, and activities

---

## Quick start

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL** (local, Docker, Neon, or Supabase)

### Option A — Docker (database)

```bash
docker compose up -d
```

### Option B — Local PostgreSQL

```sql
CREATE USER nexora WITH PASSWORD 'nexora';
CREATE DATABASE nexora OWNER nexora;
```

Or paste a Neon / Supabase connection string into `DATABASE_URL`.

---

### 1. Backend

```powershell
cd backend

# Virtual env (recommended)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

pip install -r requirements.txt
copy .env.example .env
```

Edit `backend\.env`:

```env
DATABASE_URL=postgresql://nexora:nexora@localhost:5432/nexora
SECRET_KEY=dev-secret-change-in-production
CORS_ORIGINS=["http://localhost:3000"]
FRONTEND_URL=http://localhost:3000
RUN_MIGRATIONS_ON_STARTUP=true
```

Start the API:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Migrations run automatically on startup when `RUN_MIGRATIONS_ON_STARTUP=true`.  
Manual migrate:

```powershell
python -m alembic upgrade head
```

**URLs**

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:8000 |
| Swagger docs | http://127.0.0.1:8000/docs |
| OpenAPI | http://127.0.0.1:8000/openapi.json |

---

### 2. Frontend

```powershell
cd frontend
copy ..\.env.example .env.local
npm install
npm run dev
```

Ensure `.env.local` includes:

```env
NEXT_PUBLIC_APP_NAME=Nexora CRM
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**App:** http://localhost:3000

---

### 3. First-time flow

1. Register at `/register`
2. Create an organization at `/create-organization`
3. Open the workspace at `/{org-slug}`
4. Manage team at `/{org-slug}/settings/team`

### Demo accounts (local)

Seed helper users (tenant slug `demo`):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m scripts.seed_demo_users
python -m scripts.seed_portal_demo
```

| Role | Email | Password |
|------|-------|----------|
| Owner | `owner@example.com` | `Password123!` |
| Admin | `admin@example.com` | `Password123!` |
| Member | `member@example.com` | `Password123!` |
| Portal customer | `customer@example.com` | (printed by seed script) |

---

## Test Support (Phase 19)

With backend + frontend running:

1. Log in as `owner@example.com`
2. Open **http://localhost:3000/demo/support**
3. Confirm **Support** appears in the sidebar
4. Create a ticket → assign → reply → escalate → close
5. Check **Knowledge**, **SLA**, **Live Chat**, and **Analytics** tabs
6. Optional: create a ticket from the **Customer Portal** (`/portal/demo`) and confirm it appears in the staff desk

API smoke (Swagger): http://127.0.0.1:8000/docs → authorize →  
`GET /api/v1/tenants/demo/support/dashboard`

---

## Project structure

```
nexora-crm/
├── backend/
│   ├── alembic/              # Migrations (head: 028 support)
│   ├── app/
│   │   ├── api/v1/           # FastAPI routers
│   │   ├── core/             # Config, auth, deps
│   │   ├── db/               # Session, seed, bootstrap
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic DTOs
│   │   ├── services/         # Business logic
│   │   └── repositories/     # Data access (select domains)
│   └── scripts/              # Seed & CLI utilities
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/           # Feature UI
│   ├── hooks/                # Data hooks
│   ├── lib/api/              # API clients
│   └── types/                # TypeScript types
├── docs/                     # Architecture & planning
└── docker-compose.yml
```

See [docs/README.md](./docs/README.md) for architecture details.

---

## Common commands

```powershell
# Backend
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
python -m alembic upgrade head
python -m scripts.seed_demo_users

# Frontend
cd frontend
npm run dev
npm run build
```

---

## License

Private / learning project — Nexora CRM.
