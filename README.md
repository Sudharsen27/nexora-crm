# Nexora CRM

Production-grade multi-tenant SaaS CRM.

## Stack

- **Frontend:** Next.js 15+, TypeScript, Tailwind CSS
- **Backend:** FastAPI, PostgreSQL, SQLAlchemy, JWT
- **Infra:** Docker Compose (dev)

## Quick start

### Option A — With Docker

```bash
docker compose up -d
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Option B — Without Docker (Windows / local)

You need **PostgreSQL** and **Python 3.12+**. Pick one database option:

#### Database option 1: Install PostgreSQL locally

1. Download and install from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. During setup, note your password for the `postgres` user
3. Create the database (in **pgAdmin** or **psql**):

```sql
CREATE USER nexora WITH PASSWORD 'nexora';
CREATE DATABASE nexora OWNER nexora;
```

#### Database option 2: Free cloud database (no install)

Use [Neon](https://neon.tech) or [Supabase](https://supabase.com) — create a project and copy the PostgreSQL connection string.

#### Run the backend

Open PowerShell:

```powershell
cd "c:\Learning\Nexora CRM\backend"

# 1. Install dependencies (once)
pip install -r requirements.txt

# 2. Create env file (once)
copy .env.example .env
```

Edit `backend\.env` and set `DATABASE_URL`:

```
# Local PostgreSQL example:
DATABASE_URL=postgresql://nexora:nexora@localhost:5432/nexora

# Or paste your Neon/Supabase connection string:
# DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

Then run:

```powershell
# 3. Create tables (once, or after schema changes)
python -m alembic upgrade head

# 4. Start API server
python -m uvicorn app.main:app --reload --port 8000
```

**URLs:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

To stop the server: press `Ctrl + C` in the terminal.

### 2. Start frontend

```powershell
cd frontend
copy ..\.env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

### 3. First-time flow

1. Register at `/register`
2. Create an organization at `/create-organization`
3. Manage team at `/{org-slug}/settings/team`

## Phase 1 features

- User registration & login
- JWT access tokens + refresh token rotation
- Protected routes (Next.js middleware)
- Organization (tenant) creation
- Team member management (add, change role, remove)
- RBAC (owner, admin, member)

## Project structure

```
nexora-crm/
├── backend/          # FastAPI application
├── frontend/         # Next.js application
├── docs/             # Architecture & planning
└── docker-compose.yml
```

See [docs/README.md](./docs/README.md) for architecture details.
