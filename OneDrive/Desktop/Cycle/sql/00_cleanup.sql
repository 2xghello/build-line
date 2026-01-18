-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - CLEANUP SCRIPT
-- ============================================================================
-- WARNING: This will DELETE ALL DATA! Only use for fresh setup or reset.
-- Run this ONLY if you want to completely reset the database.
-- ============================================================================

-- Drop Triggers first
DROP TRIGGER IF EXISTS audit_cycles ON cycles;
DROP TRIGGER IF EXISTS audit_assignments ON assignments;
DROP TRIGGER IF EXISTS audit_checklists ON checklists;
DROP TRIGGER IF EXISTS audit_qc_logs ON qc_logs;
DROP TRIGGER IF EXISTS audit_profiles ON profiles;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_cycles_updated_at ON cycles;
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
DROP TRIGGER IF EXISTS update_checklists_updated_at ON checklists;
DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_checklist_templates_updated_at ON checklist_templates;

-- Drop Views
DROP VIEW IF EXISTS cycle_status_summary CASCADE;
DROP VIEW IF EXISTS technician_workload CASCADE;
DROP VIEW IF EXISTS qc_performance CASCADE;
DROP VIEW IF EXISTS cycle_details CASCADE;
DROP VIEW IF EXISTS assignment_details CASCADE;

-- Drop Functions
DROP FUNCTION IF EXISTS audit_trigger_function() CASCADE;
DROP FUNCTION IF EXISTS generate_user_code(VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role() CASCADE;
DROP FUNCTION IF EXISTS get_current_profile_id() CASCADE;
DROP FUNCTION IF EXISTS create_checklist_from_template(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_cycle_serial() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop Tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS qc_logs CASCADE;
DROP TABLE IF EXISTS checklist_items CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;
DROP TABLE IF EXISTS checklist_template_items CASCADE;
DROP TABLE IF EXISTS checklist_templates CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS cycles CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_code_sequences CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================================
SELECT 'Database cleanup completed! All tables, functions, and triggers removed.' as status;
-- ============================================================================
