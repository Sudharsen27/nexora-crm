# Project Folder Structure

```
nexora-crm/
├── README.md
├── .gitignore
├── docker-compose.yml              # Postgres, Redis, API (dev)
├── .env.example
│
├── docs/                           # Planning & runbooks (this folder)
│   ├── README.md
│   ├── architecture/
│   ├── database/
│   ├── api/
│   └── roadmap.md
│
├── frontend/                       # Next.js 15 application
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.mjs
│   ├── components.json             # Shadcn config
│   │
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   │
│   │   ├── (marketing)/            # Public marketing site
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Landing
│   │   │
│   │   ├── (auth)/                 # Unauthenticated flows
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── verify-email/page.tsx
│   │   │
│   │   ├── (onboarding)/           # Post-signup tenant setup
│   │   │   ├── layout.tsx
│   │   │   ├── create-tenant/page.tsx
│   │   │   └── accept-invite/[token]/page.tsx
│   │   │
│   │   ├── (platform)/             # Super-admin (future)
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       └── tenants/page.tsx
│   │   │
│   │   └── (tenant)/               # Tenant-scoped app shell
│   │       └── [tenantSlug]/
│   │           ├── layout.tsx      # Sidebar, nav, tenant context
│   │           ├── page.tsx        # Dashboard placeholder
│   │           ├── settings/
│   │           │   ├── page.tsx
│   │           │   ├── profile/page.tsx
│   │           │   ├── team/page.tsx
│   │           │   └── security/page.tsx
│   │           └── unauthorized/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                     # Shadcn primitives
│   │   ├── layout/                 # Header, sidebar, footer
│   │   ├── auth/                   # Login form, etc.
│   │   └── shared/                 # Loading, error states
│   │
│   ├── lib/
│   │   ├── api/                    # API client, endpoints
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   └── tenants.ts
│   │   ├── auth/                   # Token storage, session helpers
│   │   ├── tenant/                 # Tenant context, slug utils
│   │   └── utils.ts                # cn(), formatters
│   │
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   └── use-tenant.ts
│   │
│   ├── types/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── tenant.ts
│   │
│   ├── middleware.ts               # Auth + tenant subdomain routing
│   └── public/
│       └── assets/
│
└── backend/                        # FastAPI application
    ├── pyproject.toml              # or requirements.txt
    ├── alembic.ini
    ├── Dockerfile
    │
    ├── alembic/
    │   ├── env.py
    │   └── versions/
    │
    ├── app/
    │   ├── main.py                 # FastAPI app entry
    │   │
    │   ├── core/
    │   │   ├── config.py           # Settings (pydantic-settings)
    │   │   ├── security.py         # JWT, password hashing
    │   │   ├── deps.py             # DI: db, current user, tenant
    │   │   ├── exceptions.py       # HTTP exception handlers
    │   │   └── logging.py
    │   │
    │   ├── db/
    │   │   ├── base.py             # Declarative base
    │   │   ├── session.py          # Engine, SessionLocal
    │   │   └── mixins.py           # TimestampMixin, TenantMixin
    │   │
    │   ├── models/
    │   │   ├── tenant.py
    │   │   ├── user.py
    │   │   ├── membership.py
    │   │   ├── role.py
    │   │   ├── permission.py
    │   │   ├── refresh_token.py
    │   │   ├── invitation.py
    │   │   ├── audit_log.py
    │   │   └── tenant_setting.py
    │   │
    │   ├── schemas/
    │   │   ├── common.py           # Pagination, error responses
    │   │   ├── auth.py
    │   │   ├── tenant.py
    │   │   ├── user.py
    │   │   ├── invitation.py
    │   │   └── audit.py
    │   │
    │   ├── api/
    │   │   └── v1/
    │   │       ├── router.py       # Aggregates all v1 routes
    │   │       ├── auth.py
    │   │       ├── tenants.py
    │   │       ├── users.py
    │   │       ├── invitations.py
    │   │       ├── roles.py
    │   │       ├── settings.py
    │   │       └── audit.py
    │   │
    │   ├── services/
    │   │   ├── auth_service.py
    │   │   ├── tenant_service.py
    │   │   ├── user_service.py
    │   │   ├── invitation_service.py
    │   │   ├── rbac_service.py
    │   │   └── audit_service.py
    │   │
    │   ├── repositories/
    │   │   ├── base.py             # Generic tenant-scoped CRUD
    │   │   ├── tenant_repo.py
    │   │   ├── user_repo.py
    │   │   └── ...
    │   │
    │   └── middleware/
    │       ├── tenant_context.py
    │       └── request_id.py
    │
    └── tests/
        ├── conftest.py
        ├── unit/
        └── integration/
```

## Conventions

| Area | Convention |
|------|------------|
| API versioning | `/api/v1/*` |
| Tenant slug | lowercase, hyphenated (`acme-corp`) |
| DB tables | snake_case, plural (`tenant_memberships`) |
| Python modules | snake_case |
| React components | PascalCase files |
| Route groups | `(group)` — no URL segment |
