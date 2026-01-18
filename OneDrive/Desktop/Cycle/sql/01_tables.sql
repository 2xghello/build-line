-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 1: TABLES
-- ============================================================================
-- Run this script FIRST in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1.1 ROLES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    permissions     JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('admin', 'Full system access - manages users, cycles, and system settings', '{"all": true}'),
    ('supervisor', 'Assigns cycles to technicians and monitors assembly progress', '{"cycles": ["read", "update", "assign"], "technicians": ["read"], "assignments": ["create", "read", "update"]}'),
    ('technician', 'Completes cycle assembly and fills checklists', '{"assignments": ["read"], "checklists": ["read", "update"], "cycles": ["read"]}'),
    ('qc', 'Quality control - inspects and verifies assembled cycles', '{"cycles": ["read", "update"], "qc_logs": ["create", "read"], "checklists": ["read"]}'),
    ('sales', 'Handles cycle dispatch and customer handover', '{"cycles": ["read", "update"], "dispatches": ["create", "read"]}')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.2 USER CODE SEQUENCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_code_sequences (
    prefix          VARCHAR(10) PRIMARY KEY,
    current_value   INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize sequences with correct prefixes
-- ADM = Admin, SUP = Supervisor, TECH = Technician, QC = QC, SLS = Sales
INSERT INTO user_code_sequences (prefix, current_value) VALUES
    ('ADM', 0),     -- Admin: ADM001, ADM002...
    ('SUP', 0),     -- Supervisor: SUP001, SUP002...
    ('TECH', 0),    -- Technician: TECH001, TECH002...
    ('QC', 0),      -- QC: QC001, QC002...
    ('SLS', 0)      -- Sales: SLS001, SLS002...
ON CONFLICT (prefix) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 1.3 PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    user_code       VARCHAR(20) UNIQUE NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    role_id         INTEGER NOT NULL REFERENCES roles(id),
    status          VARCHAR(20) DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'suspended')),
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add self-referencing foreign key after table creation
ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_created_by_fkey;
ALTER TABLE profiles
    ADD CONSTRAINT profiles_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_code ON profiles(user_code);

-- ----------------------------------------------------------------------------
-- 1.4 CYCLES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number   VARCHAR(50) UNIQUE NOT NULL,
    model           VARCHAR(100) NOT NULL,
    variant         VARCHAR(50),
    color           VARCHAR(30),
    status          VARCHAR(30) DEFAULT 'pending'
                    CHECK (status IN (
                        'pending',
                        'assigned',
                        'in_progress',
                        'qc_pending',
                        'qc_passed',
                        'qc_failed',
                        'ready_for_dispatch',
                        'dispatched'
                    )),
    priority        VARCHAR(10) DEFAULT 'normal'
                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    notes           TEXT,
    created_by      UUID NOT NULL REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for cycles
CREATE INDEX IF NOT EXISTS idx_cycles_status ON cycles(status);
CREATE INDEX IF NOT EXISTS idx_cycles_serial ON cycles(serial_number);
CREATE INDEX IF NOT EXISTS idx_cycles_created_at ON cycles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cycles_priority ON cycles(priority);
CREATE INDEX IF NOT EXISTS idx_cycles_model ON cycles(model);

-- ----------------------------------------------------------------------------
-- 1.5 ASSIGNMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    technician_id   UUID NOT NULL REFERENCES profiles(id),
    supervisor_id   UUID NOT NULL REFERENCES profiles(id),
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    due_date        DATE,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'reassigned', 'cancelled')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_technician ON assignments(technician_id);
CREATE INDEX IF NOT EXISTS idx_assignments_supervisor ON assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_assignments_cycle ON assignments(cycle_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- ----------------------------------------------------------------------------
-- 1.6 CHECKLIST TEMPLATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('technician_assembly', 'supervisor_review', 'qc_inspection')),
    model           VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_type ON checklist_templates(type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_model ON checklist_templates(model);

-- ----------------------------------------------------------------------------
-- 1.7 CHECKLIST TEMPLATE ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_template_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
    item_order      INTEGER NOT NULL,
    item_name       VARCHAR(200) NOT NULL,
    description     TEXT,
    is_required     BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(template_id, item_order)
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON checklist_template_items(template_id);

-- ----------------------------------------------------------------------------
-- 1.8 CHECKLISTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('technician_assembly', 'supervisor_review', 'qc_inspection')),
    template_id     UUID REFERENCES checklist_templates(id),
    created_by      UUID NOT NULL REFERENCES profiles(id),
    assigned_to     UUID REFERENCES profiles(id),
    status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for checklists
CREATE INDEX IF NOT EXISTS idx_checklists_cycle ON checklists(cycle_id);
CREATE INDEX IF NOT EXISTS idx_checklists_assigned ON checklists(assigned_to);
CREATE INDEX IF NOT EXISTS idx_checklists_type ON checklists(type);
CREATE INDEX IF NOT EXISTS idx_checklists_status ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_type_status ON checklists(type, status);

-- ----------------------------------------------------------------------------
-- 1.9 CHECKLIST ITEMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id    UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
    item_order      INTEGER NOT NULL,
    item_name       VARCHAR(200) NOT NULL,
    description     TEXT,
    is_completed    BOOLEAN DEFAULT false,
    is_required     BOOLEAN DEFAULT true,
    completed_by    UUID REFERENCES profiles(id),
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    photo_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(checklist_id, item_order)
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_completed ON checklist_items(is_completed);

-- ----------------------------------------------------------------------------
-- 1.10 QC LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qc_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID NOT NULL REFERENCES cycles(id),
    checklist_id    UUID REFERENCES checklists(id),
    inspector_id    UUID NOT NULL REFERENCES profiles(id),
    result          VARCHAR(20) NOT NULL
                    CHECK (result IN ('passed', 'failed', 'conditional')),
    overall_score   DECIMAL(5,2),
    defects_found   JSONB DEFAULT '[]',
    notes           TEXT,
    photos          JSONB DEFAULT '[]',
    is_override     BOOLEAN DEFAULT false,
    inspected_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for qc_logs
CREATE INDEX IF NOT EXISTS idx_qc_logs_cycle ON qc_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_qc_logs_inspector ON qc_logs(inspector_id);
CREATE INDEX IF NOT EXISTS idx_qc_logs_result ON qc_logs(result);
CREATE INDEX IF NOT EXISTS idx_qc_logs_date ON qc_logs(inspected_at DESC);

-- ----------------------------------------------------------------------------
-- 1.11 AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES profiles(id),
    user_code       VARCHAR(20),
    action          VARCHAR(20) NOT NULL
                    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE')),
    table_name      VARCHAR(100),
    record_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
SELECT 'Part 1: Tables created successfully!' as status;
-- ============================================================================
