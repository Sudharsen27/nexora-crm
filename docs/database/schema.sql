-- Nexora CRM PostgreSQL Schema Snapshot
-- Generated from SQLAlchemy models and Alembic migrations (revision 006)
-- Reflects actual implementation as of 2026-06-15

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
-- UUID generation uses Python uuid4 at application layer; no DB extension required.

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(320) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

-- =============================================================================
-- PERMISSIONS (global)
-- =============================================================================
CREATE TABLE permissions (
    id        UUID PRIMARY KEY,
    resource  VARCHAR(50) NOT NULL,
    action    VARCHAR(50) NOT NULL,
    slug      VARCHAR(100) NOT NULL UNIQUE
);

-- =============================================================================
-- TENANTS (organizations)
-- =============================================================================
CREATE TABLE tenants (
    id          UUID PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ix_tenants_slug ON tenants (slug);

-- =============================================================================
-- REFRESH TOKENS
-- =============================================================================
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    user_agent  VARCHAR(512),
    ip_address  VARCHAR(45),
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX ix_refresh_tokens_user_id ON refresh_tokens (user_id);

-- =============================================================================
-- ROLES (per-tenant or system)
-- =============================================================================
CREATE TABLE roles (
    id          UUID PRIMARY KEY,
    tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(50) NOT NULL,
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_roles_tenant_slug UNIQUE (tenant_id, slug)
);

-- =============================================================================
-- ROLE PERMISSIONS (junction)
-- =============================================================================
CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- =============================================================================
-- TENANT MEMBERSHIPS
-- =============================================================================
CREATE TABLE tenant_memberships (
    id          UUID PRIMARY KEY,
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    joined_at   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_membership_tenant_user UNIQUE (tenant_id, user_id)
);

-- =============================================================================
-- LEADS
-- =============================================================================
CREATE TABLE leads (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL DEFAULT '',
    email            VARCHAR(320),
    phone            VARCHAR(50),
    company          VARCHAR(255),
    job_title        VARCHAR(150),
    status           VARCHAR(30) NOT NULL DEFAULT 'new',
    source           VARCHAR(50),
    estimated_value  NUMERIC(12, 2),
    notes            TEXT,
    assigned_to_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_leads_tenant_id ON leads (tenant_id);
CREATE INDEX ix_leads_tenant_status ON leads (tenant_id, status);
CREATE INDEX ix_leads_tenant_created_at ON leads (tenant_id, created_at);

-- =============================================================================
-- DEALS
-- =============================================================================
CREATE TABLE deals (
    id                   UUID PRIMARY KEY,
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title                VARCHAR(255) NOT NULL,
    description          TEXT,
    stage                VARCHAR(30) NOT NULL DEFAULT 'new',
    position             INTEGER NOT NULL DEFAULT 0,
    value                NUMERIC(14, 2),
    currency             VARCHAR(3) NOT NULL DEFAULT 'USD',
    expected_close_date  DATE,
    lead_id              UUID REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_deals_tenant_id ON deals (tenant_id);
CREATE INDEX ix_deals_tenant_stage ON deals (tenant_id, stage);
CREATE INDEX ix_deals_tenant_stage_position ON deals (tenant_id, stage, position);

-- =============================================================================
-- CONTACTS
-- =============================================================================
CREATE TABLE contacts (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id          UUID REFERENCES leads(id) ON DELETE SET NULL,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL DEFAULT '',
    email            VARCHAR(320),
    phone            VARCHAR(50),
    company          VARCHAR(255),
    job_title        VARCHAR(150),
    assigned_to_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_contacts_tenant_lead UNIQUE (tenant_id, lead_id)
);

CREATE INDEX ix_contacts_tenant_id ON contacts (tenant_id);
CREATE INDEX ix_contacts_tenant_created_at ON contacts (tenant_id, created_at);

-- =============================================================================
-- ACTIVITIES
-- =============================================================================
CREATE TABLE activities (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type     VARCHAR(30) NOT NULL,
    entity_id       UUID NOT NULL,
    activity_type   VARCHAR(30) NOT NULL,
    description     TEXT NOT NULL,
    metadata        JSONB,
    created_by_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_activities_tenant_id ON activities (tenant_id);
CREATE INDEX ix_activities_tenant_created_at ON activities (tenant_id, created_at);
CREATE INDEX ix_activities_tenant_entity ON activities (tenant_id, entity_type, entity_id);
CREATE INDEX ix_activities_tenant_type ON activities (tenant_id, activity_type);

-- =============================================================================
-- TASKS
-- =============================================================================
CREATE TABLE tasks (
    id               UUID PRIMARY KEY,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    status           VARCHAR(30) NOT NULL DEFAULT 'pending',
    priority         VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date         DATE,
    assigned_to_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type      VARCHAR(30),
    entity_id        UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_tasks_tenant_id ON tasks (tenant_id);
CREATE INDEX ix_tasks_tenant_status ON tasks (tenant_id, status);
CREATE INDEX ix_tasks_tenant_assigned ON tasks (tenant_id, assigned_to_id);
CREATE INDEX ix_tasks_tenant_due_date ON tasks (tenant_id, due_date);
CREATE INDEX ix_tasks_tenant_entity ON tasks (tenant_id, entity_type, entity_id);
CREATE INDEX ix_tasks_tenant_priority ON tasks (tenant_id, priority);

-- =============================================================================
-- CHECK CONSTRAINTS (application-enforced; documented for reference)
-- =============================================================================
-- leads.status: new, contacted, qualified, unqualified, converted
-- leads.source: website, referral, cold_call, email, event, social, other
-- deals.stage: new, qualified, proposal, negotiation, won, lost
-- activities.entity_type: lead, contact, deal
-- activities.activity_type: call, meeting, email, note, task_update, lead_update, deal_update
-- tasks.status: pending, in_progress, completed, cancelled
-- tasks.priority: low, medium, high, urgent
-- tasks.entity_type: lead, contact, deal
-- tenant_memberships.status: active, invited, suspended
-- tenants.status: active, suspended
