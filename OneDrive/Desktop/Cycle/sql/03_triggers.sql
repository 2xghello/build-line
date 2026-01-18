-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 3: TRIGGERS
-- ============================================================================
-- Run this script THIRD in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 Updated_at Triggers
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
-- 3.2 Audit Triggers
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
SELECT 'Part 3: Triggers created successfully!' as status;
-- ============================================================================
