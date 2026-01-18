-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Run this script in Supabase SQL Editor
-- Version: 1.0
-- ============================================================================

-- ============================================================================
-- SECTION 1: CLEANUP (Optional - Uncomment if you need to reset)
-- ============================================================================
-- WARNING: This will delete all data! Only use for fresh setup.

-- DROP TRIGGER IF EXISTS audit_cycles ON cycles;
-- DROP TRIGGER IF EXISTS audit_assignments ON assignments;
-- DROP TRIGGER IF EXISTS audit_checklists ON checklists;
-- DROP TRIGGER IF EXISTS audit_qc_logs ON qc_logs;
-- DROP TRIGGER IF EXISTS audit_profiles ON profiles;
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
-- DROP FUNCTION IF EXISTS generate_user_code(VARCHAR) CASCADE;
-- DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
-- DROP FUNCTION IF EXISTS get_current_profile_id() CASCADE;
-- DROP FUNCTION IF EXISTS create_checklist_from_template(UUID, UUID, UUID) CASCADE;
-- DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS qc_logs CASCADE;
-- DROP TABLE IF EXISTS checklist_items CASCADE;
-- DROP TABLE IF EXISTS checklists CASCADE;
-- DROP TABLE IF EXISTS checklist_template_items CASCADE;
-- DROP TABLE IF EXISTS checklist_templates CASCADE;
-- DROP TABLE IF EXISTS assignments CASCADE;
-- DROP TABLE IF EXISTS cycles CASCADE;
-- DROP TABLE IF EXISTS user_code_sequences CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 ROLES TABLE
-- Purpose: Stores all system roles with their permissions
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
-- 2.2 USER CODE SEQUENCES TABLE
-- Purpose: Manages sequential user code generation per role prefix
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_code_sequences (
    prefix          VARCHAR(10) PRIMARY KEY,
    current_value   INTEGER DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize sequences
INSERT INTO user_code_sequences (prefix, current_value) VALUES
    ('ADM', 0),
    ('SUP', 0),
    ('TECH', 0),
    ('QC', 0),
    ('SALES', 0)
ON CONFLICT (prefix) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2.3 PROFILES TABLE
-- Purpose: Extends Supabase auth.users with application-specific data
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
-- 2.4 CYCLES TABLE
-- Purpose: Master table for all cycles in the assembly system
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serial_number   VARCHAR(50) UNIQUE NOT NULL,
    model           VARCHAR(100) NOT NULL,
    variant         VARCHAR(50),
    color           VARCHAR(30),
    status          VARCHAR(30) DEFAULT 'created'
                    CHECK (status IN (
                        'created',
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
-- 2.5 ASSIGNMENTS TABLE
-- Purpose: Links cycles to technicians for assembly
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
-- 2.6 CHECKLIST TEMPLATES TABLE
-- Purpose: Predefined checklist structures for reuse
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30) NOT NULL
                    CHECK (type IN ('technician_assembly', 'supervisor_review', 'qc_inspection')),
    model           VARCHAR(100),  -- NULL means applies to all models
    is_active       BOOLEAN DEFAULT true,
    created_by      UUID REFERENCES profiles(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_type ON checklist_templates(type);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_model ON checklist_templates(model);

-- ----------------------------------------------------------------------------
-- 2.7 CHECKLIST TEMPLATE ITEMS TABLE
-- Purpose: Individual items within a checklist template
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
-- 2.8 CHECKLISTS TABLE
-- Purpose: Checklist instances for each cycle
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
-- 2.9 CHECKLIST ITEMS TABLE
-- Purpose: Individual checkpoints within a checklist
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
-- 2.10 QC LOGS TABLE
-- Purpose: Records all QC inspections (immutable audit trail)
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
    inspected_at    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
    -- No updated_at: QC logs are immutable
);

-- Indexes for qc_logs
CREATE INDEX IF NOT EXISTS idx_qc_logs_cycle ON qc_logs(cycle_id);
CREATE INDEX IF NOT EXISTS idx_qc_logs_inspector ON qc_logs(inspector_id);
CREATE INDEX IF NOT EXISTS idx_qc_logs_result ON qc_logs(result);
CREATE INDEX IF NOT EXISTS idx_qc_logs_date ON qc_logs(inspected_at DESC);

-- ----------------------------------------------------------------------------
-- 2.11 AUDIT LOGS TABLE
-- Purpose: System-wide audit trail for all data changes
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
-- SECTION 3: FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Generate User Code Function
-- Purpose: Creates sequential user codes like ADM0001, TECH0005
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_user_code(role_name VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_next_val INTEGER;
    v_result VARCHAR(20);
BEGIN
    -- Map role to prefix
    v_prefix := CASE role_name
        WHEN 'admin' THEN 'ADM'
        WHEN 'supervisor' THEN 'SUP'
        WHEN 'technician' THEN 'TECH'
        WHEN 'qc' THEN 'QC'
        WHEN 'sales' THEN 'SALES'
        ELSE 'USR'
    END;

    -- Increment and get next value (with row lock)
    UPDATE user_code_sequences
    SET current_value = current_value + 1,
        updated_at = NOW()
    WHERE prefix = v_prefix
    RETURNING current_value INTO v_next_val;

    -- If no row was updated, insert new sequence
    IF v_next_val IS NULL THEN
        INSERT INTO user_code_sequences (prefix, current_value)
        VALUES (v_prefix, 1)
        ON CONFLICT (prefix) DO UPDATE SET current_value = user_code_sequences.current_value + 1
        RETURNING current_value INTO v_next_val;
    END IF;

    -- Format: PREFIX + zero-padded number (4 digits)
    v_result := v_prefix || LPAD(v_next_val::TEXT, 4, '0');

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3.2 Get Current User Role Function
-- Purpose: Returns the role name of the currently authenticated user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    SELECT r.name INTO v_role
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.auth_id = auth.uid();

    RETURN v_role;
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3.3 Get Current Profile ID Function
-- Purpose: Returns the profile ID of the currently authenticated user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE auth_id = auth.uid();

    RETURN v_profile_id;
END;
$$ LANGUAGE sql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3.4 Audit Trigger Function
-- Purpose: Automatically logs changes to audit_logs table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_user_code VARCHAR(20);
    v_old_jsonb JSONB;
    v_new_jsonb JSONB;
BEGIN
    -- Get current user info (may be null for system operations)
    SELECT id, user_code INTO v_user_id, v_user_code
    FROM profiles
    WHERE auth_id = auth.uid();

    -- Build JSONB values, excluding large or sensitive fields
    IF TG_OP = 'DELETE' THEN
        v_old_jsonb := to_jsonb(OLD);
        v_new_jsonb := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_jsonb := NULL;
        v_new_jsonb := to_jsonb(NEW);
    ELSE -- UPDATE
        v_old_jsonb := to_jsonb(OLD);
        v_new_jsonb := to_jsonb(NEW);
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (
        user_id,
        user_code,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    )
    VALUES (
        v_user_id,
        v_user_code,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_jsonb,
        v_new_jsonb
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3.5 Update Timestamp Function
-- Purpose: Automatically updates updated_at column
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 3.6 Create Checklist from Template Function
-- Purpose: Creates a new checklist with items from a template
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checklist_from_template(
    p_cycle_id UUID,
    p_template_id UUID,
    p_assigned_to UUID
)
RETURNS UUID AS $$
DECLARE
    v_checklist_id UUID;
    v_template_type VARCHAR(30);
    v_creator_id UUID;
BEGIN
    -- Get template type
    SELECT type INTO v_template_type
    FROM checklist_templates
    WHERE id = p_template_id;

    IF v_template_type IS NULL THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;

    -- Get creator ID
    SELECT id INTO v_creator_id
    FROM profiles
    WHERE auth_id = auth.uid();

    -- Create checklist
    INSERT INTO checklists (cycle_id, type, template_id, created_by, assigned_to)
    VALUES (p_cycle_id, v_template_type, p_template_id, v_creator_id, p_assigned_to)
    RETURNING id INTO v_checklist_id;

    -- Copy template items to checklist items
    INSERT INTO checklist_items (checklist_id, item_order, item_name, description, is_required)
    SELECT v_checklist_id, item_order, item_name, description, is_required
    FROM checklist_template_items
    WHERE template_id = p_template_id
    ORDER BY item_order;

    RETURN v_checklist_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3.7 Generate Cycle Serial Number Function
-- Purpose: Creates unique serial numbers for cycles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_cycle_serial()
RETURNS VARCHAR AS $$
DECLARE
    v_year VARCHAR(4);
    v_count INTEGER;
    v_serial VARCHAR(50);
BEGIN
    v_year := EXTRACT(YEAR FROM NOW())::VARCHAR;

    -- Count cycles created this year
    SELECT COUNT(*) + 1 INTO v_count
    FROM cycles
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

    -- Format: CYC-YYYY-NNNNNN
    v_serial := 'CYC-' || v_year || '-' || LPAD(v_count::TEXT, 6, '0');

    RETURN v_serial;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Updated_at Triggers
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cycles_updated_at ON cycles;
CREATE TRIGGER update_cycles_updated_at
    BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklists_updated_at ON checklists;
CREATE TRIGGER update_checklists_updated_at
    BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
CREATE TRIGGER update_checklist_items_updated_at
    BEFORE UPDATE ON checklist_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON checklist_templates;
CREATE TRIGGER update_checklist_templates_updated_at
    BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4.2 Audit Triggers
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_cycles ON cycles;
CREATE TRIGGER audit_cycles
    AFTER INSERT OR UPDATE OR DELETE ON cycles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_assignments ON assignments;
CREATE TRIGGER audit_assignments
    AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_checklists ON checklists;
CREATE TRIGGER audit_checklists
    AFTER INSERT OR UPDATE OR DELETE ON checklists
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_qc_logs ON qc_logs;
CREATE TRIGGER audit_qc_logs
    AFTER INSERT ON qc_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Enable RLS on Tables
-- ----------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 5.2 PROFILES RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles"
    ON profiles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin can update profiles" ON profiles;
CREATE POLICY "Admin can update profiles"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
CREATE POLICY "Admin can delete profiles"
    ON profiles FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Supervisor can view technicians" ON profiles;
CREATE POLICY "Supervisor can view technicians"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
        AND role_id = (SELECT id FROM roles WHERE name = 'technician')
    );

-- ----------------------------------------------------------------------------
-- 5.3 CYCLES RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to cycles" ON cycles;
CREATE POLICY "Admin full access to cycles"
    ON cycles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Supervisor can manage cycles" ON cycles;
CREATE POLICY "Supervisor can manage cycles"
    ON cycles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
    );

DROP POLICY IF EXISTS "Technician can view assigned cycles" ON cycles;
CREATE POLICY "Technician can view assigned cycles"
    ON cycles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN profiles p ON a.technician_id = p.id
            WHERE a.cycle_id = cycles.id
            AND p.auth_id = auth.uid()
            AND a.status IN ('pending', 'in_progress')
        )
    );

DROP POLICY IF EXISTS "Technician can update assigned cycles" ON cycles;
CREATE POLICY "Technician can update assigned cycles"
    ON cycles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM assignments a
            JOIN profiles p ON a.technician_id = p.id
            WHERE a.cycle_id = cycles.id
            AND p.auth_id = auth.uid()
            AND a.status IN ('pending', 'in_progress')
        )
    );

DROP POLICY IF EXISTS "QC can view pending cycles" ON cycles;
CREATE POLICY "QC can view pending cycles"
    ON cycles FOR SELECT
    USING (
        status IN ('qc_pending', 'qc_failed', 'in_progress')
        AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'qc'
        )
    );

DROP POLICY IF EXISTS "QC can update pending cycles" ON cycles;
CREATE POLICY "QC can update pending cycles"
    ON cycles FOR UPDATE
    USING (
        status IN ('qc_pending', 'qc_failed')
        AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'qc'
        )
    );

DROP POLICY IF EXISTS "Sales can view ready cycles" ON cycles;
CREATE POLICY "Sales can view ready cycles"
    ON cycles FOR SELECT
    USING (
        status IN ('ready_for_dispatch', 'qc_passed', 'dispatched')
        AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'sales'
        )
    );

DROP POLICY IF EXISTS "Sales can update ready cycles" ON cycles;
CREATE POLICY "Sales can update ready cycles"
    ON cycles FOR UPDATE
    USING (
        status IN ('ready_for_dispatch', 'qc_passed')
        AND EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'sales'
        )
    );

-- ----------------------------------------------------------------------------
-- 5.4 ASSIGNMENTS RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to assignments" ON assignments;
CREATE POLICY "Admin full access to assignments"
    ON assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Supervisor can manage assignments" ON assignments;
CREATE POLICY "Supervisor can manage assignments"
    ON assignments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
    );

DROP POLICY IF EXISTS "Technician can view own assignments" ON assignments;
CREATE POLICY "Technician can view own assignments"
    ON assignments FOR SELECT
    USING (
        technician_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    );

DROP POLICY IF EXISTS "Technician can update own assignments" ON assignments;
CREATE POLICY "Technician can update own assignments"
    ON assignments FOR UPDATE
    USING (
        technician_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
        AND status IN ('pending', 'in_progress')
    );

-- ----------------------------------------------------------------------------
-- 5.5 CHECKLISTS RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to checklists" ON checklists;
CREATE POLICY "Admin full access to checklists"
    ON checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Supervisor can manage checklists" ON checklists;
CREATE POLICY "Supervisor can manage checklists"
    ON checklists FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
    );

DROP POLICY IF EXISTS "Assigned user can view checklist" ON checklists;
CREATE POLICY "Assigned user can view checklist"
    ON checklists FOR SELECT
    USING (
        assigned_to = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    );

DROP POLICY IF EXISTS "Assigned user can update checklist" ON checklists;
CREATE POLICY "Assigned user can update checklist"
    ON checklists FOR UPDATE
    USING (
        assigned_to = (SELECT id FROM profiles WHERE auth_id = auth.uid())
        AND status IN ('pending', 'in_progress')
    );

DROP POLICY IF EXISTS "QC can view all checklists" ON checklists;
CREATE POLICY "QC can view all checklists"
    ON checklists FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'qc'
        )
    );

-- ----------------------------------------------------------------------------
-- 5.6 CHECKLIST ITEMS RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to checklist items" ON checklist_items;
CREATE POLICY "Admin full access to checklist items"
    ON checklist_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Supervisor can manage checklist items" ON checklist_items;
CREATE POLICY "Supervisor can manage checklist items"
    ON checklist_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
    );

DROP POLICY IF EXISTS "Assigned user can view checklist items" ON checklist_items;
CREATE POLICY "Assigned user can view checklist items"
    ON checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.assigned_to = (SELECT id FROM profiles WHERE auth_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Assigned user can update checklist items" ON checklist_items;
CREATE POLICY "Assigned user can update checklist items"
    ON checklist_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.assigned_to = (SELECT id FROM profiles WHERE auth_id = auth.uid())
            AND c.status IN ('pending', 'in_progress')
        )
    );

DROP POLICY IF EXISTS "QC can view all checklist items" ON checklist_items;
CREATE POLICY "QC can view all checklist items"
    ON checklist_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'qc'
        )
    );

-- ----------------------------------------------------------------------------
-- 5.7 QC LOGS RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin full access to qc logs" ON qc_logs;
CREATE POLICY "Admin full access to qc logs"
    ON qc_logs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "QC can create logs" ON qc_logs;
CREATE POLICY "QC can create logs"
    ON qc_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'qc'
        )
    );

DROP POLICY IF EXISTS "QC can view own logs" ON qc_logs;
CREATE POLICY "QC can view own logs"
    ON qc_logs FOR SELECT
    USING (
        inspector_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name IN ('qc', 'supervisor')
        )
    );

DROP POLICY IF EXISTS "Supervisor can view qc logs" ON qc_logs;
CREATE POLICY "Supervisor can view qc logs"
    ON qc_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'supervisor'
        )
    );

-- ----------------------------------------------------------------------------
-- 5.8 AUDIT LOGS RLS Policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin can view all audit logs" ON audit_logs;
CREATE POLICY "Admin can view all audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN roles r ON p.role_id = r.id
            WHERE p.auth_id = auth.uid() AND r.name = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
CREATE POLICY "Users can view own audit logs"
    ON audit_logs FOR SELECT
    USING (
        user_id = (SELECT id FROM profiles WHERE auth_id = auth.uid())
    );

-- ============================================================================
-- SECTION 6: SEED DATA - CHECKLIST TEMPLATES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Technician Assembly Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Standard Cycle Assembly Checklist', 'technician_assembly', NULL, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, item_order, item_name, description, is_required) VALUES
    ('11111111-1111-1111-1111-111111111111', 1, 'Frame Inspection', 'Inspect frame for damage, scratches, or manufacturing defects', true),
    ('11111111-1111-1111-1111-111111111111', 2, 'Fork Installation', 'Install front fork and ensure proper alignment', true),
    ('11111111-1111-1111-1111-111111111111', 3, 'Handlebar Assembly', 'Mount handlebar, stem, and grips. Check alignment with front wheel', true),
    ('11111111-1111-1111-1111-111111111111', 4, 'Front Wheel Installation', 'Install front wheel, check axle tightness and wheel alignment', true),
    ('11111111-1111-1111-1111-111111111111', 5, 'Rear Wheel Installation', 'Install rear wheel, ensure proper chain/belt alignment', true),
    ('11111111-1111-1111-1111-111111111111', 6, 'Drivetrain Setup', 'Install chain/belt, adjust tension, lubricate', true),
    ('11111111-1111-1111-1111-111111111111', 7, 'Brake System - Front', 'Install and adjust front brake, check cable tension', true),
    ('11111111-1111-1111-1111-111111111111', 8, 'Brake System - Rear', 'Install and adjust rear brake, check cable tension', true),
    ('11111111-1111-1111-1111-111111111111', 9, 'Gear System Setup', 'Install and tune derailleur/gear system, test all gears', true),
    ('11111111-1111-1111-1111-111111111111', 10, 'Seat Installation', 'Install seat post and saddle, adjust height', true),
    ('11111111-1111-1111-1111-111111111111', 11, 'Pedal Installation', 'Install both pedals (note: left pedal is reverse threaded)', true),
    ('11111111-1111-1111-1111-111111111111', 12, 'Accessories', 'Install reflectors, bell, and other accessories', false),
    ('11111111-1111-1111-1111-111111111111', 13, 'Final Torque Check', 'Verify all bolts are torqued to specification', true),
    ('11111111-1111-1111-1111-111111111111', 14, 'Test Ride', 'Perform short test ride to verify all systems', true),
    ('11111111-1111-1111-1111-111111111111', 15, 'Cleaning', 'Clean cycle and remove assembly residue', true)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6.2 QC Inspection Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Quality Control Inspection Checklist', 'qc_inspection', NULL, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, item_order, item_name, description, is_required) VALUES
    ('22222222-2222-2222-2222-222222222222', 1, 'Visual Inspection', 'Check for scratches, dents, paint defects', true),
    ('22222222-2222-2222-2222-222222222222', 2, 'Frame Integrity', 'Verify frame welds and structural integrity', true),
    ('22222222-2222-2222-2222-222222222222', 3, 'Wheel True Check', 'Spin both wheels, check for wobble or out-of-true', true),
    ('22222222-2222-2222-2222-222222222222', 4, 'Brake Function Test', 'Test front and rear brakes for stopping power', true),
    ('22222222-2222-2222-2222-222222222222', 5, 'Gear Shifting Test', 'Cycle through all gears, verify smooth shifting', true),
    ('22222222-2222-2222-2222-222222222222', 6, 'Bolt Torque Verification', 'Spot check critical bolt torque values', true),
    ('22222222-2222-2222-2222-222222222222', 7, 'Safety Equipment', 'Verify reflectors and safety equipment installed', true),
    ('22222222-2222-2222-2222-222222222222', 8, 'Documentation Check', 'Verify assembly checklist completed', true),
    ('22222222-2222-2222-2222-222222222222', 9, 'Final Test Ride', 'QC test ride for overall function', true),
    ('22222222-2222-2222-2222-222222222222', 10, 'Approval/Rejection', 'Final quality determination', true)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6.3 Supervisor Review Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('33333333-3333-3333-3333-333333333333', 'Supervisor Review Checklist', 'supervisor_review', NULL, true)
ON CONFLICT DO NOTHING;

INSERT INTO checklist_template_items (template_id, item_order, item_name, description, is_required) VALUES
    ('33333333-3333-3333-3333-333333333333', 1, 'Assembly Checklist Review', 'Verify technician completed all required items', true),
    ('33333333-3333-3333-3333-333333333333', 2, 'Time Compliance', 'Check if assembly was completed within expected time', true),
    ('33333333-3333-3333-3333-333333333333', 3, 'Parts Usage', 'Verify correct parts were used', true),
    ('33333333-3333-3333-3333-333333333333', 4, 'Workmanship Quality', 'Assess overall workmanship standard', true),
    ('33333333-3333-3333-3333-333333333333', 5, 'Ready for QC', 'Confirm cycle is ready for QC inspection', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 7: VIEWS (Optional - for easier querying)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7.1 Cycle Status Summary View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW cycle_status_summary AS
SELECT
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count
FROM cycles
GROUP BY status;

-- ----------------------------------------------------------------------------
-- 7.2 Technician Workload View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW technician_workload AS
SELECT
    p.id as technician_id,
    p.user_code,
    p.full_name,
    COUNT(a.id) FILTER (WHERE a.status = 'pending') as pending_assignments,
    COUNT(a.id) FILTER (WHERE a.status = 'in_progress') as in_progress_assignments,
    COUNT(a.id) FILTER (WHERE a.status = 'completed') as completed_assignments
FROM profiles p
JOIN roles r ON p.role_id = r.id AND r.name = 'technician'
LEFT JOIN assignments a ON p.id = a.technician_id
WHERE p.status = 'active'
GROUP BY p.id, p.user_code, p.full_name;

-- ----------------------------------------------------------------------------
-- 7.3 QC Performance View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW qc_performance AS
SELECT
    p.id as inspector_id,
    p.user_code,
    p.full_name,
    COUNT(q.id) as total_inspections,
    COUNT(q.id) FILTER (WHERE q.result = 'passed') as passed_count,
    COUNT(q.id) FILTER (WHERE q.result = 'failed') as failed_count,
    COUNT(q.id) FILTER (WHERE q.result = 'conditional') as conditional_count,
    ROUND(
        COUNT(q.id) FILTER (WHERE q.result = 'passed')::DECIMAL /
        NULLIF(COUNT(q.id), 0) * 100, 2
    ) as pass_rate
FROM profiles p
JOIN roles r ON p.role_id = r.id AND r.name = 'qc'
LEFT JOIN qc_logs q ON p.id = q.inspector_id
GROUP BY p.id, p.user_code, p.full_name;

-- ============================================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_user_code(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION create_checklist_from_template(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_cycle_serial() TO authenticated;

-- ============================================================================
-- SECTION 9: INITIAL ADMIN USER SETUP INSTRUCTIONS
-- ============================================================================
--
-- To create the first admin user, follow these steps:
--
-- 1. First, create the user in Supabase Authentication:
--    - Go to Supabase Dashboard > Authentication > Users
--    - Click "Add user" > "Create new user"
--    - Enter email and password
--    - Note the UUID of the created user
--
-- 2. Then insert the profile record (replace the UUID with actual auth user UUID):
--
-- INSERT INTO profiles (auth_id, user_code, full_name, email, role_id, created_by)
-- VALUES (
--     'YOUR-AUTH-USER-UUID-HERE',  -- Replace with actual auth.users UUID
--     (SELECT generate_user_code('admin')),
--     'System Administrator',
--     'admin@example.com',
--     (SELECT id FROM roles WHERE name = 'admin'),
--     NULL  -- First admin has no creator
-- );
--
-- ============================================================================

-- ============================================================================
-- SCHEMA SETUP COMPLETE
-- ============================================================================
SELECT 'Schema setup completed successfully!' as status;
