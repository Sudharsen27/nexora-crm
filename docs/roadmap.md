# Project Roadmap

Phased delivery for Nexora CRM aligned with the [Architecture Overview](./architecture/overview.md).

---

## Phase 0 — Planning & Architecture ✅

| Task | Status |
|------|--------|
| Architecture documentation | ✅ Done |
| Folder structure | ✅ Done |
| Database schema (foundation) | ✅ Done |
| API + frontend route map | ✅ Done |

---

## Phase 1 — Foundation ✅

| Task | Status |
|------|--------|
| FastAPI app, config, health endpoint | ✅ Done |
| SQLAlchemy + Alembic | ✅ Done |
| Docker Compose (Postgres) | ✅ Done |
| Next.js + Tailwind + UI components | ✅ Done |
| API client + auth layer | ✅ Done |

---

## Phase 2 — Authentication ✅

| Task | Status |
|------|--------|
| Register / login / refresh / logout | ✅ Done |
| JWT + refresh token rotation | ✅ Done |
| Protected routes (middleware) | ✅ Done |
| Email verification | 🔜 Planned |
| Forgot / reset password | 🔜 Planned |

---

## Phase 3 — Multi-Tenancy ✅

| Task | Status |
|------|--------|
| Tenant creation + slug routing | ✅ Done |
| Tenant context (backend deps) | ✅ Done |
| Organization onboarding UI | ✅ Done |
| Subdomain resolution | 🔜 Planned |
| Tenant switcher | 🔜 Planned |

---

## Phase 4 — RBAC & Team Management ✅ (partial)

| Task | Status |
|------|--------|
| Roles + permissions seed | ✅ Done (owner / admin / member) |
| Team management UI | ✅ Done |
| Migrate to 4-tier roles (Admin, Manager, Sales Executive) | 🔜 Planned |
| Invitation flow (email) | 🔜 Planned |
| Super Admin platform panel | 🔜 Planned |

---

## Phase 5 — CRM Modules (in progress)

| Module | Status |
|--------|--------|
| **Leads** — CRUD, search, filters, pagination | ✅ Done |
| **Deals** — Kanban, drag-and-drop, 6 stages | ✅ Done |
| **Contacts** | 🔜 Next |
| **Activities & Tasks** | 🔜 Planned |

---

## Phase 6 — Platform Services

| Task | Status |
|------|--------|
| TanStack Query (frontend data layer) | 🔜 Planned |
| Redis (cache, sessions, rate limiting) | 🔜 Planned |
| AWS S3 (file storage) | 🔜 Planned |
| Audit log service + viewer | 🔜 Planned |
| Tenant settings UI | 🔜 Planned |

---

## Phase 7 — Production & AWS Deployment

| Task | Status |
|------|--------|
| Structured logging + request IDs | 🔜 Planned |
| Rate limiting | 🔜 Planned |
| GitHub Actions CI/CD | 🔜 Planned |
| AWS EC2 deployment | 🔜 Planned |
| RDS PostgreSQL (production) | 🔜 Planned |
| Error tracking (Sentry) | 🔜 Planned |

---

## Phase 8+ — Future

| Module | Notes |
|--------|-------|
| Billing & Subscriptions | Stripe integration |
| Analytics & Reporting | Dashboards, pipeline metrics |
| Email integrations | SMTP, templates |
| Mobile-responsive PWA | Optional |

---

## Documentation

| Doc | Location |
|-----|----------|
| Architecture overview | `docs/architecture/overview.md` |
| Folder structure | `docs/architecture/folder-structure.md` |
| Database schema | `docs/database/schema.md` |
| API route map | `docs/api/route-map.md` |
| Deployment guide (AWS EC2) | `docs/guides/deployment.md` — 🔜 |
