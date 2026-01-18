-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 5: SEED DATA
-- ============================================================================
-- Run this script FIFTH in Supabase SQL Editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 Technician Assembly Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Standard Cycle Assembly Checklist', 'technician_assembly', NULL, true)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (template_id, item_order) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5.2 QC Inspection Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Quality Control Inspection Checklist', 'qc_inspection', NULL, true)
ON CONFLICT (id) DO NOTHING;

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
ON CONFLICT (template_id, item_order) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5.3 Supervisor Review Checklist Template
-- ----------------------------------------------------------------------------
INSERT INTO checklist_templates (id, name, type, model, is_active) VALUES
    ('33333333-3333-3333-3333-333333333333', 'Supervisor Review Checklist', 'supervisor_review', NULL, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO checklist_template_items (template_id, item_order, item_name, description, is_required) VALUES
    ('33333333-3333-3333-3333-333333333333', 1, 'Assembly Checklist Review', 'Verify technician completed all required items', true),
    ('33333333-3333-3333-3333-333333333333', 2, 'Time Compliance', 'Check if assembly was completed within expected time', true),
    ('33333333-3333-3333-3333-333333333333', 3, 'Parts Usage', 'Verify correct parts were used', true),
    ('33333333-3333-3333-3333-333333333333', 4, 'Workmanship Quality', 'Assess overall workmanship standard', true),
    ('33333333-3333-3333-3333-333333333333', 5, 'Ready for QC', 'Confirm cycle is ready for QC inspection', true)
ON CONFLICT (template_id, item_order) DO NOTHING;

-- ============================================================================
SELECT 'Part 5: Seed Data inserted successfully!' as status;
-- ============================================================================
