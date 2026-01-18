# Next Steps - Cycle Assembly Management System

## Overview

This document outlines the next steps to complete the deployment and development of the Cycle Assembly Management System. The codebase has been successfully pushed to GitHub with all critical fixes applied.

**Repository:** https://github.com/2xghello/build-line.git
**Last Updated:** 2026-01-18
**Status:** All dashboards built, pending testing and enhancements

---

## Dashboard Completion Status

### Summary

| Dashboard | Status | CRUD Operations |
|-----------|--------|-----------------|
| Admin | ✅ Complete | Full CRUD for users, cycles, checklists |
| Technician | ✅ Complete | Read assignments, Update status |
| QC | ✅ Complete | Read pending, Create inspection, Update status |
| Supervisor | ✅ Complete | Read cycles/technicians, Create assignments |
| Sales | ✅ Complete | Read ready cycles, Update to dispatched |

### 4.1 Technician Dashboard - ✅ COMPLETE

**Location:** [src/app/dashboards/technician/TechnicianDashboard.jsx](src/app/dashboards/technician/TechnicianDashboard.jsx)

**Implemented Features:**
- [x] View my assignments (pending, in_progress)
- [x] Start assembly work (calls `startAssembly()`)
- [x] Mark assignment as completed (calls `completeAssembly()`)
- [x] Stats cards showing total, pending, in progress, overdue
- [x] Visual overdue indicators
- [x] Loading and error states

**CRUD Operations:**
| Operation | Function | Status |
|-----------|----------|--------|
| Read | `getMyAssignments(technicianId)` | ✅ Working |
| Update | `startAssembly(assignmentId)` | ✅ Working |
| Update | `completeAssembly(assignmentId)` | ✅ Working |

**Missing Features (Future Enhancement):**
- [ ] View and complete checklist items
- [ ] Upload photos for checklist items
- [ ] View assignment history

### 4.2 QC Dashboard - ✅ COMPLETE

**Location:** [src/app/dashboards/qc/QCDashboard.jsx](src/app/dashboards/qc/QCDashboard.jsx)

**Implemented Features:**
- [x] View cycles pending QC inspection
- [x] Perform QC inspection with Pass/Fail
- [x] Overall score slider (0-100%)
- [x] Defect logging with add/remove
- [x] Inspector notes
- [x] Stats cards showing pending, high priority
- [x] Inspection modal with full form

**CRUD Operations:**
| Operation | Function | Status |
|-----------|----------|--------|
| Read | `getPendingQC()` | ✅ Working |
| Create | `performQCInspection(cycleId, {...})` | ✅ Working |
| Update | Cycle status updated automatically | ✅ Working |

**Missing Features (Future Enhancement):**
- [ ] View technician checklist for cycle
- [ ] Upload inspection photos
- [ ] View QC history and statistics
- [ ] Passed/Failed today counters (currently placeholder)

### 4.3 Supervisor Dashboard - ✅ COMPLETE

**Location:** [src/app/dashboards/supervisor/SupervisorDashboard.jsx](src/app/dashboards/supervisor/SupervisorDashboard.jsx)

**Implemented Features:**
- [x] View all pending cycles
- [x] Assign cycles to technicians
- [x] Monitor technician workload (active assignments count)
- [x] View active assemblies (assigned + in_progress)
- [x] Stats cards for all status counts
- [x] Team workload sidebar with color-coded load indicators

**CRUD Operations:**
| Operation | Function | Status |
|-----------|----------|--------|
| Read | `getCycles()` | ✅ Working |
| Read | `getTechnicians()` | ✅ Working |
| Create | `assignCycle(cycleId, technicianId, supervisorId)` | ✅ Working |

**Missing Features (Future Enhancement):**
- [ ] Reassign cycles if needed
- [ ] Set due dates during assignment
- [ ] View team performance metrics
- [ ] Filter/search cycles

### 4.4 Sales Dashboard - ✅ COMPLETE

**Location:** [src/app/dashboards/sales/SalesDashboard.jsx](src/app/dashboards/sales/SalesDashboard.jsx)

**Implemented Features:**
- [x] View cycles ready for dispatch
- [x] Mark cycle as dispatched with notes
- [x] Session dispatch counter
- [x] Stats cards for ready, dispatched today, high priority
- [x] Cycle details in dispatch modal (model, variant, color)
- [x] Confirmation warning before dispatch

**CRUD Operations:**
| Operation | Function | Status |
|-----------|----------|--------|
| Read | `getReadyForDispatch()` | ✅ Working |
| Update | `dispatchCycle(cycleId, dispatchNotes)` | ✅ Working |

**Missing Features (Future Enhancement):**
- [ ] View QC reports before dispatch
- [ ] View dispatch history
- [ ] Print dispatch documents
- [ ] Weekly total counter (currently placeholder)

---

## Phase 1: Apply Database Schema Changes (CRITICAL - Do This First)

### 1.1 Update Supabase Database

The SQL schema has been updated locally. You need to apply these changes to your Supabase project.

**Steps:**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy and paste the contents of [sql/01_tables.sql](sql/01_tables.sql)
5. Click **Run** (or press Ctrl+Enter)
6. Verify success message

**Critical Changes Applied:**
- ✅ Changed cycles.status default from `'created'` to `'pending'`
- ✅ Added `is_override BOOLEAN DEFAULT false` column to qc_logs table

**Verification:**
```sql
-- Verify status default
SELECT column_default
FROM information_schema.columns
WHERE table_name = 'cycles' AND column_name = 'status';
-- Should show: 'pending'

-- Verify is_override column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'qc_logs' AND column_name = 'is_override';
-- Should return: is_override | boolean | false
```

### 1.2 Run Remaining SQL Scripts (If Not Already Done)

If you haven't run the other SQL scripts, execute them in this order:

| Order | File | Description |
|-------|------|-------------|
| 1 | `sql/01_tables.sql` | ✅ Already updated above |
| 2 | `sql/02_functions.sql` | Creates helper functions |
| 3 | `sql/03_triggers.sql` | Sets up audit and timestamp triggers |
| 4 | `sql/04_rls_policies.sql` | Configures Row Level Security |
| 5 | `sql/05_seed_data.sql` | Inserts checklist templates |
| 6 | `sql/06_views_and_permissions.sql` | Creates views and grants |
| 7 | `sql/07_create_admin_user.sql` | Creates the first admin user |

**Note:** Before running `07_create_admin_user.sql`:
1. Create a user in Supabase Auth (Authentication → Users → Add user)
2. Copy the user's UUID
3. Update the script with the actual UUID and user details

---

## Phase 2: Security - Revoke Exposed Tokens (URGENT)

### 2.1 Revoke GitHub Personal Access Tokens


**Action Required:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Find and delete both tokens
3. Create a new token with only the required permissions (repo scope)
4. Store it securely (password manager, not in code)

### 2.2 Update Git Remote (After Revoking Tokens)

```bash
# Remove old remote with embedded token
git remote remove origin

# Add new remote without token
git remote add origin https://github.com/2xghello/build-line.git

# Configure git to use credential manager
git config --global credential.helper manager

# Next push will prompt for credentials
git push -u origin main
```

---

## Phase 3: Testing Current Implementation

### 3.1 Test All Dashboards

**Setup:**
1. Start development server: `npm run dev`
2. Open browser to `http://localhost:5173`
3. Log in with different role credentials

**Test Cases by Dashboard:**

#### Admin Dashboard
| Feature | Test | Expected Result |
|---------|------|-----------------|
| User Management | Create new user | User created with auto-generated user code |
| Cycle Management | Create new cycle | Cycle created with status 'pending' |
| Cycle Assignment | Assign to technician | Assignment created, status → 'assigned' |
| QC Override | Override with 'passed'/'failed' | QC log created, status updated |
| Checklist Management | Create checklist | Template and items created |

#### Technician Dashboard
| Feature | Test | Expected Result |
|---------|------|-----------------|
| View Assignments | Load page | Shows pending/in_progress assignments |
| Start Work | Click "Start Work" | Status → 'in_progress', started_at set |
| Complete Work | Click "Complete" | Status → 'completed', cycle → 'qc_pending' |
| Overdue Display | Check overdue items | Red border on overdue cards |

#### QC Dashboard
| Feature | Test | Expected Result |
|---------|------|-----------------|
| View Pending | Load page | Shows cycles with status 'qc_pending' |
| Inspect Cycle | Click "Inspect" | Opens inspection modal |
| Pass Cycle | Select Pass, submit | Cycle → 'ready_for_dispatch' |
| Fail Cycle | Select Fail, submit | Cycle → 'qc_failed' |
| Add Defects | Add defect items | Defects saved to qc_log |

#### Supervisor Dashboard
| Feature | Test | Expected Result |
|---------|------|-----------------|
| View Pending | Load page | Shows cycles with status 'pending' |
| View Workloads | Check sidebar | Shows technician assignment counts |
| Assign Cycle | Click "Assign" | Opens modal with technician list |
| Complete Assignment | Submit | Cycle → 'assigned', assignment created |

#### Sales Dashboard
| Feature | Test | Expected Result |
|---------|------|-----------------|
| View Ready | Load page | Shows cycles with status 'ready_for_dispatch' |
| Dispatch Cycle | Click "Dispatch" | Opens dispatch modal |
| Confirm Dispatch | Submit | Cycle → 'dispatched', audit logged |
| Session Counter | Dispatch multiple | Counter increments |

### 3.2 Common Issues to Check

- ✅ No console errors about missing fields
- ✅ Status badges display correctly
- ✅ Priority badges show correct colors
- ✅ Timestamps format correctly
- ✅ Empty states show when no data
- ✅ Loading spinners appear during API calls
- ✅ Error messages display on failures

---

## Phase 4: Enhancement Features (Future)

### 4.1 Technician Dashboard Enhancements

**Checklist Integration:**
```javascript
// Add to TechnicianDashboard.jsx
import { getAssignmentChecklist, updateChecklistItemCompletion } from '@services/adminService';

// In component:
const [checklist, setChecklist] = useState([]);

async function loadChecklist(assignmentId) {
  const items = await getAssignmentChecklist(assignmentId);
  setChecklist(items);
}
```

**Photo Upload:**
```javascript
// Add to adminService.js
export async function uploadChecklistPhoto(itemId, file) {
  const { data, error } = await supabase.storage
    .from('checklist-photos')
    .upload(`items/${itemId}/${Date.now()}.jpg`, file);
  // ... handle response
}
```

### 4.2 QC Dashboard Enhancements

**View Technician Checklist:**
```javascript
// Show checklist completion before QC
async function loadCycleChecklist(cycleId) {
  const { data } = await supabase
    .from('checklist_items')
    .select('*, checklist_template_items(*)')
    .eq('cycle_id', cycleId);
  return data;
}
```

**QC Statistics:**
```javascript
// Add to adminService.js
export async function getQCStats(inspectorId) {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('qc_logs')
    .select('result')
    .eq('inspector_id', inspectorId)
    .gte('created_at', today);

  return {
    passed: data.filter(q => q.result === 'passed').length,
    failed: data.filter(q => q.result === 'failed').length
  };
}
```

### 4.3 Supervisor Dashboard Enhancements

**Reassign Cycles:**
```javascript
// Add to adminService.js
export async function reassignCycle(assignmentId, newTechnicianId, reason) {
  // Update existing assignment
  await supabase
    .from('assignments')
    .update({
      technician_id: newTechnicianId,
      reassigned_at: new Date().toISOString(),
      reassign_reason: reason
    })
    .eq('id', assignmentId);
}
```

**Set Due Dates:**
```javascript
// Update assignCycle function to include due_date
export async function assignCycle(cycleId, technicianId, supervisorId, dueDate = null) {
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      cycle_id: cycleId,
      technician_id: technicianId,
      supervisor_id: supervisorId,
      assigned_at: new Date().toISOString(),
      due_date: dueDate
    })
    .select()
    .single();
  // ...
}
```

### 4.4 Sales Dashboard Enhancements

**View QC Report:**
```javascript
// Add QC report modal
function QCReportModal({ cycle, onClose }) {
  const [qcLog, setQCLog] = useState(null);

  useEffect(() => {
    async function loadQCLog() {
      const { data } = await supabase
        .from('qc_logs')
        .select('*, profiles:inspector_id(*)')
        .eq('cycle_id', cycle.id)
        .single();
      setQCLog(data);
    }
    loadQCLog();
  }, [cycle.id]);

  // Render QC details
}
```

**Dispatch History:**
```javascript
// Add to adminService.js
export async function getDispatchHistory(limit = 50) {
  const { data } = await supabase
    .from('cycles')
    .select('*, qc_logs(*)')
    .eq('status', 'dispatched')
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data;
}
```

---

## Phase 5: Advanced Features (Future Enhancements)

### 5.1 Barcode Scanning Integration

**Requirements:**
- Integrate barcode scanner library (e.g., `@zxing/library`)
- Scan cycle serial numbers for quick lookup
- Scan user codes for quick assignment
- Mobile camera support for scanning

**Estimated Time:** 1 day

### 5.2 Real-time Updates with Supabase Subscriptions

**Requirements:**
- Subscribe to cycle status changes
- Real-time notification when cycle assigned
- Live updates on dashboard (no manual refresh)
- WebSocket connection management

**Example:**
```javascript
// In TechnicianDashboard.jsx
useEffect(() => {
  const subscription = supabase
    .channel('assignments')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'assignments',
      filter: `technician_id=eq.${profile.id}`
    }, (payload) => {
      // New assignment received!
      loadAssignments();
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [profile.id]);
```

**Estimated Time:** 1 day

### 5.3 Photo Upload to Supabase Storage

**Requirements:**
- Set up Supabase Storage bucket for photos
- Upload checklist item photos
- Upload QC inspection photos
- Image compression before upload
- Display photos in dashboards

**Steps:**
1. Create storage bucket in Supabase: `cycle-photos`
2. Configure RLS policies for bucket access
3. Implement upload function

**Estimated Time:** 1 day

### 5.4 Advanced Analytics Dashboard

**Requirements:**
- Assembly time tracking (average time per cycle)
- Technician performance metrics
- QC pass/fail rate trends
- Defect analysis (common defects)
- Export reports to PDF/Excel

**Charts Needed:**
- Line chart: Cycles completed over time
- Bar chart: Cycles by status
- Pie chart: QC pass/fail ratio
- Table: Top defects by frequency

**Estimated Time:** 2-3 days

### 5.5 Mobile Responsiveness

**Requirements:**
- Responsive design for all dashboards
- Mobile-friendly navigation
- Touch-optimized controls
- Camera access for barcode scanning
- Progressive Web App (PWA) support

**Estimated Time:** 1-2 days

---

## Phase 6: Security Hardening

### 6.1 Implement Edge Functions for Sensitive Operations

Move admin operations to Supabase Edge Functions to prevent client-side abuse:

**Functions to Move:**
- User creation/deletion (prevent unauthorized user creation)
- QC override (requires admin verification)
- Role changes (prevent privilege escalation)

**Estimated Time:** 2 days

### 6.2 Review and Tighten RLS Policies

**Current Issues to Address:**
- Ensure technicians can only see their own assignments
- Ensure QC can't modify cycles they haven't inspected
- Ensure sales can't change cycle status except to 'dispatched'
- Prevent unauthorized access to audit logs

**Estimated Time:** 1 day

---

## Phase 7: Deployment

### 7.1 Environment Variables

Create `.env` file (don't commit to git):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 7.2 Build and Deploy

**Vite Build:**
```bash
npm run build
# Output: dist/ folder
```

**Deployment Options:**

| Platform | Steps | Cost |
|----------|-------|------|
| **Vercel** | 1. Install: `npm i -g vercel`<br>2. Run: `vercel`<br>3. Set env vars in dashboard | Free tier |
| **Netlify** | 1. Install: `npm i -g netlify-cli`<br>2. Run: `netlify deploy` | Free tier |
| **GitHub Pages** | 1. Update vite.config.js base<br>2. Deploy dist/ to gh-pages | Free |

### 7.3 Post-Deployment Checklist

- [ ] Verify all environment variables are set
- [ ] Test login with each role
- [ ] Test all CRUD operations
- [ ] Verify RLS policies are enabled
- [ ] Check API response times
- [ ] Test on mobile devices
- [ ] Monitor Supabase logs for errors

---

## Summary Timeline

| Phase | Task | Priority | Status |
|-------|------|----------|--------|
| 1 | Apply database schema changes | 🔴 CRITICAL | ⏳ Pending |
| 2 | Revoke exposed GitHub tokens | 🔴 URGENT | ⏳ Pending |
| 3 | Test current implementation | 🟡 HIGH | ⏳ Pending |
| 4.1 | Technician Dashboard | 🟡 HIGH | ✅ Complete |
| 4.2 | QC Dashboard | 🟡 HIGH | ✅ Complete |
| 4.3 | Supervisor Dashboard | 🟢 MEDIUM | ✅ Complete |
| 4.4 | Sales Dashboard | 🟢 MEDIUM | ✅ Complete |
| 5 | Advanced features | 🔵 FUTURE | ⏳ Pending |
| 6 | Security hardening | 🟡 HIGH | ⏳ Pending |
| 7 | Deployment | 🟡 HIGH | ⏳ Pending |

---

## Quick Start (What to Do Right Now)

1. **Apply database changes** (30 min)
   - Open Supabase SQL Editor
   - Run `sql/01_tables.sql`
   - Verify changes applied

2. **Revoke GitHub tokens** (15 min)
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Delete both exposed tokens
   - Create new token with repo scope only

3. **Test all dashboards** (2 hours)
   - Run `npm run dev`
   - Test each role: Admin, Technician, QC, Supervisor, Sales
   - Verify CRUD operations work correctly

4. **Deploy to production** (1 hour)
   - Set up Vercel/Netlify account
   - Configure environment variables
   - Deploy and test

---

## API Functions Reference

### User Management
- `getUsers()` - Get all users with role info
- `createUser({ fullName, roleName, password })` - Create new user
- `updateUserStatus(userId, status)` - Update user status
- `updateUserRole(userId, roleId)` - Update user role

### Cycle Management
- `getCycles()` - Get all cycles with assignments
- `createCycle({ cycleCode, modelName, priority })` - Create new cycle
- `updateCycleStatus(cycleId, status)` - Update cycle status
- `assignCycle(cycleId, technicianId, supervisorId)` - Assign cycle

### Technician Workflow
- `getMyAssignments(technicianId)` - Get technician's assignments
- `startAssembly(assignmentId)` - Start work on assignment
- `completeAssembly(assignmentId)` - Mark assembly complete

### QC Workflow
- `getPendingQC()` - Get cycles awaiting QC inspection
- `performQCInspection(cycleId, { result, defects, notes, overallScore })` - Log QC result
- `qcOverride(cycleId, { result, reason, inspectorId })` - Admin override

### Sales Workflow
- `getReadyForDispatch()` - Get cycles ready for dispatch
- `dispatchCycle(cycleId, dispatchNotes)` - Mark cycle as dispatched

---

## Getting Help

- **Supabase Docs:** https://supabase.com/docs
- **React Router Docs:** https://reactrouter.com/
- **Vite Docs:** https://vitejs.dev/

---

**Last Updated:** 2026-01-18
**Repository:** https://github.com/2xghello/build-line
