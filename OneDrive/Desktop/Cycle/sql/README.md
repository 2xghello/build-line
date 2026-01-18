# Cycle Assembly Management System - SQL Scripts

## Overview

These SQL scripts set up the complete database schema for the Cycle Assembly Management System in Supabase.

## Execution Order

Run the scripts in the Supabase SQL Editor in this exact order:

| Order | File | Description |
|-------|------|-------------|
| 1 | `01_tables.sql` | Creates all tables with indexes |
| 2 | `02_functions.sql` | Creates helper functions |
| 3 | `03_triggers.sql` | Sets up audit and timestamp triggers |
| 4 | `04_rls_policies.sql` | Configures Row Level Security |
| 5 | `05_seed_data.sql` | Inserts checklist templates |
| 6 | `06_views_and_permissions.sql` | Creates views and grants |
| 7 | `07_create_admin_user.sql` | Creates the first admin user |

## Optional Scripts

| File | Description |
|------|-------------|
| `00_cleanup.sql` | **DANGER**: Drops all tables and data. Use only for reset. |

## How to Run

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste the contents of each file
5. Click **Run** (or press Ctrl+Enter)
6. Verify "Success" message before proceeding to next file

## Creating the First Admin User

After running scripts 01-06:

1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add user** > **Create new user**
3. Enter email and password
4. Copy the UUID from the "UID" column
5. Open `07_create_admin_user.sql`
6. Replace `'00000000-0000-0000-0000-000000000000'` with the actual UUID
7. Update the `full_name` and `email` values
8. Run the script

## Tables Created

| Table | Purpose |
|-------|---------|
| `roles` | System roles (admin, supervisor, technician, qc, sales) |
| `user_code_sequences` | Sequential ID generation |
| `profiles` | User profiles linked to Supabase Auth |
| `cycles` | Cycle inventory and status tracking |
| `assignments` | Cycle-to-technician assignments |
| `checklist_templates` | Reusable checklist structures |
| `checklist_template_items` | Template line items |
| `checklists` | Active checklist instances |
| `checklist_items` | Checklist line items |
| `qc_logs` | Quality control inspection records |
| `audit_logs` | System-wide change tracking |

## Troubleshooting

### Error: "relation already exists"
The table was already created. This is safe to ignore, or run `00_cleanup.sql` first for a fresh start.

### Error: "function does not exist"
Run the scripts in order. Functions must exist before triggers can use them.

### Error: "permission denied"
Make sure you're using the SQL Editor in the Supabase Dashboard with proper credentials.

### RLS blocking all data
After enabling RLS, you need a user with a profile to access data. Create the admin user first.
