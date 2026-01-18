-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 6: VIEWS & PERMISSIONS
-- ============================================================================
-- Run this script SIXTH in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 6.1 Cycle Status Summary View
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
-- 6.2 Technician Workload View
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
-- 6.3 QC Performance View
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

-- ----------------------------------------------------------------------------
-- 6.4 Cycle Details View (for dashboards)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW cycle_details AS
SELECT
    c.id,
    c.serial_number,
    c.model,
    c.variant,
    c.color,
    c.status,
    c.priority,
    c.notes,
    c.created_at,
    c.updated_at,
    creator.user_code as created_by_code,
    creator.full_name as created_by_name,
    a.id as assignment_id,
    a.status as assignment_status,
    a.due_date,
    tech.user_code as technician_code,
    tech.full_name as technician_name,
    sup.user_code as supervisor_code,
    sup.full_name as supervisor_name
FROM cycles c
LEFT JOIN profiles creator ON c.created_by = creator.id
LEFT JOIN assignments a ON c.id = a.cycle_id AND a.status IN ('pending', 'in_progress')
LEFT JOIN profiles tech ON a.technician_id = tech.id
LEFT JOIN profiles sup ON a.supervisor_id = sup.id;

-- ----------------------------------------------------------------------------
-- 6.5 Assignment Details View
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW assignment_details AS
SELECT
    a.id,
    a.cycle_id,
    c.serial_number,
    c.model,
    c.status as cycle_status,
    a.status as assignment_status,
    a.assigned_at,
    a.due_date,
    a.started_at,
    a.completed_at,
    a.notes,
    tech.id as technician_id,
    tech.user_code as technician_code,
    tech.full_name as technician_name,
    sup.id as supervisor_id,
    sup.user_code as supervisor_code,
    sup.full_name as supervisor_name
FROM assignments a
JOIN cycles c ON a.cycle_id = c.id
JOIN profiles tech ON a.technician_id = tech.id
JOIN profiles sup ON a.supervisor_id = sup.id;

-- ----------------------------------------------------------------------------
-- 6.6 GRANT PERMISSIONS
-- ----------------------------------------------------------------------------

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION generate_user_code(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION create_checklist_from_template(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_cycle_serial() TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION is_valid_user_code(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION preview_next_user_code(VARCHAR) TO authenticated;

-- ============================================================================
SELECT 'Part 6: Views & Permissions created successfully!' as status;
-- ============================================================================
