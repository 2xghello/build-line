-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 2: FUNCTIONS
-- ============================================================================
-- Run this script SECOND in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 Generate User Code Function
-- Purpose: Creates sequential user codes like ADM001, SUP001, TECH001
--
-- Role Prefixes:
--   Admin      → ADM001, ADM002, ADM003...
--   Supervisor → SUP001, SUP002, SUP003...
--   Technician → TECH001, TECH002, TECH003...
--   QC         → QC001, QC002, QC003...
--   Sales      → SLS001, SLS002, SLS003...
--
-- Concurrency Safety:
--   Uses UPDATE...RETURNING with row-level lock to prevent race conditions
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_user_code(p_role_name VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_next_val INTEGER;
    v_result VARCHAR(20);
    v_is_admin BOOLEAN;
BEGIN
    -- Security Check: Only Admin can generate user codes
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid()
        AND r.name = 'admin'
    ) INTO v_is_admin;

    -- Allow if no profiles exist (first admin setup) or if user is admin
    IF NOT v_is_admin AND EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
        RAISE EXCEPTION 'Access denied: Only Admin can generate user codes';
    END IF;

    -- Map role to prefix
    v_prefix := CASE LOWER(p_role_name)
        WHEN 'admin' THEN 'ADM'
        WHEN 'supervisor' THEN 'SUP'
        WHEN 'technician' THEN 'TECH'
        WHEN 'qc' THEN 'QC'
        WHEN 'sales' THEN 'SLS'
        ELSE NULL
    END;

    -- Validate role name
    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Invalid role name: %. Valid roles: admin, supervisor, technician, qc, sales', p_role_name;
    END IF;

    -- Atomic increment with row lock (prevents race conditions)
    -- FOR UPDATE locks the row until transaction commits
    UPDATE user_code_sequences
    SET current_value = current_value + 1,
        updated_at = NOW()
    WHERE prefix = v_prefix
    RETURNING current_value INTO v_next_val;

    -- If prefix doesn't exist, create it
    IF v_next_val IS NULL THEN
        INSERT INTO user_code_sequences (prefix, current_value)
        VALUES (v_prefix, 1)
        ON CONFLICT (prefix) DO UPDATE
        SET current_value = user_code_sequences.current_value + 1,
            updated_at = NOW()
        RETURNING current_value INTO v_next_val;
    END IF;

    -- Format: PREFIX + zero-padded number (3 digits)
    -- Examples: ADM001, SUP001, TECH001, QC001, SLS001
    v_result := v_prefix || LPAD(v_next_val::TEXT, 3, '0');

    RETURN v_result;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.2 Get Current User Role Function
-- Purpose: Returns the role name of the currently authenticated user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role VARCHAR(50);
BEGIN
    SELECT r.name INTO v_role
    FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.auth_id = auth.uid();

    RETURN v_role;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.3 Get Current Profile ID Function
-- Purpose: Returns the profile ID of the currently authenticated user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE auth_id = auth.uid();

    RETURN v_profile_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.4 Audit Trigger Function
-- Purpose: Automatically logs changes to audit_logs table
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Build JSONB values
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
$$;

-- ----------------------------------------------------------------------------
-- 2.5 Update Timestamp Function
-- Purpose: Automatically updates updated_at column
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.6 Create Checklist from Template Function
-- Purpose: Creates a new checklist with items from a template
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_checklist_from_template(
    p_cycle_id UUID,
    p_template_id UUID,
    p_assigned_to UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- 2.7 Generate Cycle Serial Number Function
-- Purpose: Creates unique serial numbers for cycles
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_cycle_serial()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
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
$$;

-- ----------------------------------------------------------------------------
-- 2.8 Create User Profile Function (Admin Only)
-- Purpose: Complete function to create a new user with generated code
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_user_profile(
    p_auth_id UUID,
    p_full_name VARCHAR(100),
    p_email VARCHAR(255),
    p_phone VARCHAR(20),
    p_role_name VARCHAR(50)
)
RETURNS TABLE (
    profile_id UUID,
    user_code VARCHAR(20),
    full_name VARCHAR(100),
    role_name VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role_id INTEGER;
    v_user_code VARCHAR(20);
    v_profile_id UUID;
    v_creator_id UUID;
BEGIN
    -- Verify caller is admin (or first user setup)
    IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
        SELECT id INTO v_creator_id
        FROM profiles p
        JOIN roles r ON p.role_id = r.id
        WHERE p.auth_id = auth.uid() AND r.name = 'admin';

        IF v_creator_id IS NULL THEN
            RAISE EXCEPTION 'Access denied: Only Admin can create users';
        END IF;
    END IF;

    -- Get role ID
    SELECT id INTO v_role_id
    FROM roles
    WHERE name = LOWER(p_role_name);

    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Invalid role: %', p_role_name;
    END IF;

    -- Generate user code
    v_user_code := generate_user_code(p_role_name);

    -- Create profile
    INSERT INTO profiles (
        auth_id,
        user_code,
        full_name,
        email,
        phone,
        role_id,
        status,
        created_by
    )
    VALUES (
        p_auth_id,
        v_user_code,
        p_full_name,
        p_email,
        p_phone,
        v_role_id,
        'active',
        v_creator_id
    )
    RETURNING id INTO v_profile_id;

    -- Return created user info
    RETURN QUERY
    SELECT
        v_profile_id,
        v_user_code,
        p_full_name,
        p_role_name;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.9 Validate User Code Format Function
-- Purpose: Validates that a user code follows the correct format
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_valid_user_code(p_user_code VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check format: PREFIX + 3 digits
    -- Valid: ADM001, SUP001, TECH001, QC001, SLS001
    RETURN p_user_code ~ '^(ADM|SUP|TECH|QC|SLS)[0-9]{3}$';
END;
$$;

-- ----------------------------------------------------------------------------
-- 2.10 Get Next User Code Preview Function
-- Purpose: Shows what the next user code will be (without incrementing)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION preview_next_user_code(p_role_name VARCHAR)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_current_val INTEGER;
    v_result VARCHAR(20);
BEGIN
    -- Map role to prefix
    v_prefix := CASE LOWER(p_role_name)
        WHEN 'admin' THEN 'ADM'
        WHEN 'supervisor' THEN 'SUP'
        WHEN 'technician' THEN 'TECH'
        WHEN 'qc' THEN 'QC'
        WHEN 'sales' THEN 'SLS'
        ELSE NULL
    END;

    IF v_prefix IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current value (don't increment)
    SELECT current_value INTO v_current_val
    FROM user_code_sequences
    WHERE prefix = v_prefix;

    v_current_val := COALESCE(v_current_val, 0) + 1;
    v_result := v_prefix || LPAD(v_current_val::TEXT, 3, '0');

    RETURN v_result;
END;
$$;

-- ============================================================================
SELECT 'Part 2: Functions created successfully!' as status;
-- ============================================================================
