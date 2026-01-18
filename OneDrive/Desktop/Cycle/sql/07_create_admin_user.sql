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

-- First, check if admin already exists
-- Run this SELECT first to see current state:
-- SELECT * FROM profiles WHERE user_code LIKE 'ADM%';

-- Temporarily disable the audit trigger to avoid errors during first insert
ALTER TABLE profiles DISABLE TRIGGER audit_profiles;

-- OPTION A: If ADM001 exists but has wrong auth_id, UPDATE it:
UPDATE profiles
SET auth_id = '321fbd12-323e-46dc-bae9-5f78169a264c',
    full_name = 'Arsalan Ahmed',
    email = 'arsalan@bch.com'
WHERE user_code = 'ADM001';

-- OPTION B: If you need a NEW admin (ADM002), uncomment below and comment out OPTION A:
/*
INSERT INTO user_code_sequences (prefix, current_value)
VALUES ('ADM', 2)
ON CONFLICT (prefix) DO UPDATE
SET current_value = 2,
    updated_at = NOW();

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
    '321fbd12-323e-46dc-bae9-5f78169a264c',
    'ADM002',
    'Arsalan Ahmed',
    'arsalan@bch.com',
    (SELECT id FROM roles WHERE name = 'admin'),
    'active',
    NULL
);
*/

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
