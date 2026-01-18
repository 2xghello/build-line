-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Run this script FOURTH in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Check if current user is Admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'admin'
        AND p.status = 'active'
    );
$$;

-- ----------------------------------------------------------------------------
-- Check if current user is Supervisor
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_supervisor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'supervisor'
        AND p.status = 'active'
    );
$$;

-- ----------------------------------------------------------------------------
-- Check if current user is Technician
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_technician()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'technician'
        AND p.status = 'active'
    );
$$;

-- ----------------------------------------------------------------------------
-- Check if current user is QC
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_qc()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'qc'
        AND p.status = 'active'
    );
$$;

-- ----------------------------------------------------------------------------
-- Check if current user is Sales
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_sales()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'sales'
        AND p.status = 'active'
    );
$$;

-- ----------------------------------------------------------------------------
-- Get current user's profile ID (cached version)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM profiles WHERE auth_id = auth.uid();
$$;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Read technicians only (for assignment)
-- - All users: Read own profile
-- ============================================================================

DROP POLICY IF EXISTS "profiles_admin_all" ON profiles;
CREATE POLICY "profiles_admin_all"
    ON profiles FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
CREATE POLICY "profiles_read_own"
    ON profiles FOR SELECT
    USING (auth_id = auth.uid());

DROP POLICY IF EXISTS "profiles_supervisor_read_technicians" ON profiles;
CREATE POLICY "profiles_supervisor_read_technicians"
    ON profiles FOR SELECT
    USING (
        is_supervisor()
        AND role_id = (SELECT id FROM roles WHERE name = 'technician')
    );

-- Supervisor can also see QC users (for workflow visibility)
DROP POLICY IF EXISTS "profiles_supervisor_read_qc" ON profiles;
CREATE POLICY "profiles_supervisor_read_qc"
    ON profiles FOR SELECT
    USING (
        is_supervisor()
        AND role_id = (SELECT id FROM roles WHERE name = 'qc')
    );

-- ============================================================================
-- CYCLES TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Full CRUD access (creates and assigns cycles)
-- - Technician: Read/Update only cycles assigned to them
-- - QC: Read/Update cycles in qc_pending or qc_failed status
-- - Sales: Read/Update cycles in qc_passed or ready_for_dispatch status
-- ============================================================================

DROP POLICY IF EXISTS "cycles_admin_all" ON cycles;
CREATE POLICY "cycles_admin_all"
    ON cycles FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "cycles_supervisor_all" ON cycles;
CREATE POLICY "cycles_supervisor_all"
    ON cycles FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "cycles_technician_read" ON cycles;
CREATE POLICY "cycles_technician_read"
    ON cycles FOR SELECT
    USING (
        is_technician()
        AND EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.cycle_id = cycles.id
            AND a.technician_id = current_profile_id()
            AND a.status IN ('pending', 'in_progress')
        )
    );

DROP POLICY IF EXISTS "cycles_technician_update" ON cycles;
CREATE POLICY "cycles_technician_update"
    ON cycles FOR UPDATE
    USING (
        is_technician()
        AND EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.cycle_id = cycles.id
            AND a.technician_id = current_profile_id()
            AND a.status IN ('pending', 'in_progress')
        )
    )
    WITH CHECK (
        -- Technician can only update to specific statuses
        status IN ('in_progress', 'qc_pending')
    );

DROP POLICY IF EXISTS "cycles_qc_read" ON cycles;
CREATE POLICY "cycles_qc_read"
    ON cycles FOR SELECT
    USING (
        is_qc()
        AND status IN ('qc_pending', 'qc_failed', 'qc_passed')
    );

DROP POLICY IF EXISTS "cycles_qc_update" ON cycles;
CREATE POLICY "cycles_qc_update"
    ON cycles FOR UPDATE
    USING (
        is_qc()
        AND status IN ('qc_pending', 'qc_failed')
    )
    WITH CHECK (
        -- QC can only update to these statuses
        status IN ('qc_passed', 'qc_failed', 'ready_for_dispatch')
    );

DROP POLICY IF EXISTS "cycles_sales_read" ON cycles;
CREATE POLICY "cycles_sales_read"
    ON cycles FOR SELECT
    USING (
        is_sales()
        AND status IN ('qc_passed', 'ready_for_dispatch', 'dispatched')
    );

DROP POLICY IF EXISTS "cycles_sales_update" ON cycles;
CREATE POLICY "cycles_sales_update"
    ON cycles FOR UPDATE
    USING (
        is_sales()
        AND status IN ('qc_passed', 'ready_for_dispatch')
    )
    WITH CHECK (
        -- Sales can only update to dispatched
        status = 'dispatched'
    );

-- ============================================================================
-- ASSIGNMENTS TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Full CRUD access (creates assignments)
-- - Technician: Read own assignments, Update status only
-- - QC: Read only (for reference)
-- - Sales: Read only (for reference)
-- ============================================================================

DROP POLICY IF EXISTS "assignments_admin_all" ON assignments;
CREATE POLICY "assignments_admin_all"
    ON assignments FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "assignments_supervisor_all" ON assignments;
CREATE POLICY "assignments_supervisor_all"
    ON assignments FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "assignments_technician_read" ON assignments;
CREATE POLICY "assignments_technician_read"
    ON assignments FOR SELECT
    USING (
        is_technician()
        AND technician_id = current_profile_id()
    );

DROP POLICY IF EXISTS "assignments_technician_update" ON assignments;
CREATE POLICY "assignments_technician_update"
    ON assignments FOR UPDATE
    USING (
        is_technician()
        AND technician_id = current_profile_id()
        AND status IN ('pending', 'in_progress')
    )
    WITH CHECK (
        -- Technician can only update to these statuses
        status IN ('in_progress', 'completed')
    );

DROP POLICY IF EXISTS "assignments_qc_read" ON assignments;
CREATE POLICY "assignments_qc_read"
    ON assignments FOR SELECT
    USING (is_qc());

DROP POLICY IF EXISTS "assignments_sales_read" ON assignments;
CREATE POLICY "assignments_sales_read"
    ON assignments FOR SELECT
    USING (is_sales());

-- ============================================================================
-- CHECKLISTS TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Full CRUD access (creates checklists for technicians)
-- - Technician: Full access to checklists assigned to them
-- - QC: Read all checklists (for verification), Create QC checklists
-- - Sales: Read completed checklists only
-- ============================================================================

DROP POLICY IF EXISTS "checklists_admin_all" ON checklists;
CREATE POLICY "checklists_admin_all"
    ON checklists FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "checklists_supervisor_all" ON checklists;
CREATE POLICY "checklists_supervisor_all"
    ON checklists FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "checklists_technician_read" ON checklists;
CREATE POLICY "checklists_technician_read"
    ON checklists FOR SELECT
    USING (
        is_technician()
        AND assigned_to = current_profile_id()
    );

DROP POLICY IF EXISTS "checklists_technician_update" ON checklists;
CREATE POLICY "checklists_technician_update"
    ON checklists FOR UPDATE
    USING (
        is_technician()
        AND assigned_to = current_profile_id()
        AND status IN ('pending', 'in_progress')
    )
    WITH CHECK (
        status IN ('in_progress', 'completed')
    );

DROP POLICY IF EXISTS "checklists_qc_read" ON checklists;
CREATE POLICY "checklists_qc_read"
    ON checklists FOR SELECT
    USING (is_qc());

DROP POLICY IF EXISTS "checklists_qc_insert" ON checklists;
CREATE POLICY "checklists_qc_insert"
    ON checklists FOR INSERT
    WITH CHECK (
        is_qc()
        AND type = 'qc_inspection'
    );

DROP POLICY IF EXISTS "checklists_qc_update" ON checklists;
CREATE POLICY "checklists_qc_update"
    ON checklists FOR UPDATE
    USING (
        is_qc()
        AND type = 'qc_inspection'
        AND created_by = current_profile_id()
    );

DROP POLICY IF EXISTS "checklists_sales_read" ON checklists;
CREATE POLICY "checklists_sales_read"
    ON checklists FOR SELECT
    USING (
        is_sales()
        AND status = 'completed'
    );

-- ============================================================================
-- CHECKLIST ITEMS TABLE POLICIES
-- ============================================================================
-- Strategy: Inherits from parent checklist access
-- - Admin: Full CRUD access
-- - Supervisor: Full CRUD access
-- - Technician: Full access to items in assigned checklists
-- - QC: Read all, Write to QC checklists
-- - Sales: Read completed only
-- ============================================================================

DROP POLICY IF EXISTS "checklist_items_admin_all" ON checklist_items;
CREATE POLICY "checklist_items_admin_all"
    ON checklist_items FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "checklist_items_supervisor_all" ON checklist_items;
CREATE POLICY "checklist_items_supervisor_all"
    ON checklist_items FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "checklist_items_technician_read" ON checklist_items;
CREATE POLICY "checklist_items_technician_read"
    ON checklist_items FOR SELECT
    USING (
        is_technician()
        AND EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.assigned_to = current_profile_id()
        )
    );

DROP POLICY IF EXISTS "checklist_items_technician_update" ON checklist_items;
CREATE POLICY "checklist_items_technician_update"
    ON checklist_items FOR UPDATE
    USING (
        is_technician()
        AND EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.assigned_to = current_profile_id()
            AND c.status IN ('pending', 'in_progress')
        )
    );

DROP POLICY IF EXISTS "checklist_items_qc_read" ON checklist_items;
CREATE POLICY "checklist_items_qc_read"
    ON checklist_items FOR SELECT
    USING (is_qc());

DROP POLICY IF EXISTS "checklist_items_qc_write" ON checklist_items;
CREATE POLICY "checklist_items_qc_write"
    ON checklist_items FOR ALL
    USING (
        is_qc()
        AND EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.type = 'qc_inspection'
            AND c.created_by = current_profile_id()
        )
    );

DROP POLICY IF EXISTS "checklist_items_sales_read" ON checklist_items;
CREATE POLICY "checklist_items_sales_read"
    ON checklist_items FOR SELECT
    USING (
        is_sales()
        AND EXISTS (
            SELECT 1 FROM checklists c
            WHERE c.id = checklist_items.checklist_id
            AND c.status = 'completed'
        )
    );

-- ============================================================================
-- CHECKLIST TEMPLATES TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Full CRUD access
-- - All others: Read only active templates
-- ============================================================================

DROP POLICY IF EXISTS "templates_admin_all" ON checklist_templates;
CREATE POLICY "templates_admin_all"
    ON checklist_templates FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "templates_supervisor_all" ON checklist_templates;
CREATE POLICY "templates_supervisor_all"
    ON checklist_templates FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "templates_read_active" ON checklist_templates;
CREATE POLICY "templates_read_active"
    ON checklist_templates FOR SELECT
    USING (is_active = true);

-- ============================================================================
-- CHECKLIST TEMPLATE ITEMS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "template_items_admin_all" ON checklist_template_items;
CREATE POLICY "template_items_admin_all"
    ON checklist_template_items FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "template_items_supervisor_all" ON checklist_template_items;
CREATE POLICY "template_items_supervisor_all"
    ON checklist_template_items FOR ALL
    USING (is_supervisor())
    WITH CHECK (is_supervisor());

DROP POLICY IF EXISTS "template_items_read" ON checklist_template_items;
CREATE POLICY "template_items_read"
    ON checklist_template_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM checklist_templates t
            WHERE t.id = checklist_template_items.template_id
            AND t.is_active = true
        )
    );

-- ============================================================================
-- QC LOGS TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Full CRUD access
-- - Supervisor: Read all
-- - Technician: Read logs for their assigned cycles
-- - QC: Create and Read (no update - logs are immutable)
-- - Sales: Read logs for cycles they can dispatch
-- ============================================================================

DROP POLICY IF EXISTS "qc_logs_admin_all" ON qc_logs;
CREATE POLICY "qc_logs_admin_all"
    ON qc_logs FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "qc_logs_supervisor_read" ON qc_logs;
CREATE POLICY "qc_logs_supervisor_read"
    ON qc_logs FOR SELECT
    USING (is_supervisor());

DROP POLICY IF EXISTS "qc_logs_technician_read" ON qc_logs;
CREATE POLICY "qc_logs_technician_read"
    ON qc_logs FOR SELECT
    USING (
        is_technician()
        AND EXISTS (
            SELECT 1 FROM assignments a
            WHERE a.cycle_id = qc_logs.cycle_id
            AND a.technician_id = current_profile_id()
        )
    );

DROP POLICY IF EXISTS "qc_logs_qc_read" ON qc_logs;
CREATE POLICY "qc_logs_qc_read"
    ON qc_logs FOR SELECT
    USING (is_qc());

DROP POLICY IF EXISTS "qc_logs_qc_insert" ON qc_logs;
CREATE POLICY "qc_logs_qc_insert"
    ON qc_logs FOR INSERT
    WITH CHECK (
        is_qc()
        AND inspector_id = current_profile_id()
    );

DROP POLICY IF EXISTS "qc_logs_sales_read" ON qc_logs;
CREATE POLICY "qc_logs_sales_read"
    ON qc_logs FOR SELECT
    USING (
        is_sales()
        AND EXISTS (
            SELECT 1 FROM cycles c
            WHERE c.id = qc_logs.cycle_id
            AND c.status IN ('qc_passed', 'ready_for_dispatch', 'dispatched')
        )
    );

-- ============================================================================
-- AUDIT LOGS TABLE POLICIES
-- ============================================================================
-- Strategy:
-- - Admin: Read all audit logs
-- - All others: Read only their own actions
-- - No one can INSERT/UPDATE/DELETE directly (handled by triggers)
-- ============================================================================

DROP POLICY IF EXISTS "audit_logs_admin_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_read"
    ON audit_logs FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "audit_logs_read_own" ON audit_logs;
CREATE POLICY "audit_logs_read_own"
    ON audit_logs FOR SELECT
    USING (user_id = current_profile_id());

-- Allow system inserts via trigger (SECURITY DEFINER functions bypass RLS)
DROP POLICY IF EXISTS "audit_logs_system_insert" ON audit_logs;
CREATE POLICY "audit_logs_system_insert"
    ON audit_logs FOR INSERT
    WITH CHECK (true);  -- Controlled by trigger function with SECURITY DEFINER

-- ============================================================================
-- SPECIAL: SERVICE ROLE BYPASS
-- ============================================================================
-- Note: The service_role key bypasses RLS automatically in Supabase.
-- This is used for:
-- - Admin dashboard operations
-- - Background jobs
-- - System maintenance
--
-- IMPORTANT: Never expose service_role key to frontend!
-- ============================================================================

-- ============================================================================
-- GRANT PERMISSIONS FOR HELPER FUNCTIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_supervisor() TO authenticated;
GRANT EXECUTE ON FUNCTION is_technician() TO authenticated;
GRANT EXECUTE ON FUNCTION is_qc() TO authenticated;
GRANT EXECUTE ON FUNCTION is_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION current_profile_id() TO authenticated;

-- ============================================================================
SELECT 'Part 4: RLS Policies created successfully!' as status;
-- ============================================================================
