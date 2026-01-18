-- ============================================================================
-- CYCLE ASSEMBLY MANAGEMENT SYSTEM - PART 7: CREATE FIRST ADMIN USER
-- ============================================================================
-- Run this script LAST after creating a user in Supabase Auth Dashboard
-- ============================================================================

-- ============================================================================
-- INSTRUCTIONS:
-- ============================================================================
--
-- STEP 1: Create user in Supabase Authentication
--   1. Go to Supabase Dashboard > Authentication > Users
--   2. Click "Add user" > "Create new user"
--   3. Enter email (e.g., admin@yourcompany.com) and password
--   4. Click "Create user"
--   5. Copy the UUID shown in the "UID" column
--
-- STEP 2: Replace 'YOUR-AUTH-USER-UUID-HERE' below with the actual UUID
--
-- STEP 3: Update the email and full_name as needed
--
-- STEP 4: Run this script
--
-- ============================================================================

-- Temporarily disable the audit trigger to avoid errors during first insert
ALTER TABLE profiles DISABLE TRIGGER audit_profiles;

-- Insert the first admin profile
-- IMPORTANT: Replace the UUID below with the actual auth.users UUID!
INSERT INTO profiles (
    auth_id,
    user_code,
    full_name,
    email,
    role_id,
    status,
    created_by
)
VALUES (
    '00000000-0000-0000-0000-000000000000',  -- << REPLACE THIS with actual auth user UUID
    (SELECT generate_user_code('admin')),
    'System Administrator',                   -- << Change this to actual name
    'admin@example.com',                      -- << Change this to actual email
    (SELECT id FROM roles WHERE name = 'admin'),
    'active',
    NULL  -- First admin has no creator
);

-- Re-enable the audit trigger
ALTER TABLE profiles ENABLE TRIGGER audit_profiles;

-- Verify the admin was created
SELECT
    p.id,
    p.user_code,
    p.full_name,
    p.email,
    r.name as role,
    p.status,
    p.created_at
FROM profiles p
JOIN roles r ON p.role_id = r.id
WHERE r.name = 'admin';

-- ============================================================================
SELECT 'Admin user created successfully! You can now log in.' as status;
-- ============================================================================
