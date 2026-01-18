import { supabase } from './supabase';

// ============================================================================
// ADMIN SERVICE - Supabase CRUD Operations
// ============================================================================

// ----------------------------------------------------------------------------
// USER MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Get all users with their roles
 */
export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      auth_id,
      full_name,
      user_code,
      status,
      created_at,
      roles (
        id,
        name,
        description
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get all roles
 */
export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Generate user code based on role
 */
export async function generateUserCode(roleName) {
  const { data, error } = await supabase
    .rpc('generate_user_code', { p_role_name: roleName });

  if (error) throw error;
  return data;
}

/**
 * Create a new user
 */
export async function createUser({ fullName, roleName, password }) {
  // 1. Generate user code
  const userCode = await generateUserCode(roleName);

  // 2. Create email from user code (convention: usercode@cycle.local)
  const email = `${userCode.toLowerCase()}@cycle.local`;

  // 3. Create auth user using admin API (requires service role key)
  // For now, we'll use the signup method
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_code: userCode,
      }
    }
  });

  if (authError) throw authError;

  // 4. Get role ID
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', roleName)
    .single();

  if (roleError) throw roleError;

  // 5. Create profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .insert({
      auth_id: authData.user.id,
      full_name: fullName,
      user_code: userCode,
      role_id: roleData.id,
      status: 'active'
    })
    .select()
    .single();

  if (profileError) throw profileError;

  return {
    ...profileData,
    email,
    tempPassword: password
  };
}

/**
 * Update user status
 */
export async function updateUserStatus(userId, status) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update user role
 */
export async function updateUserRole(userId, roleId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role_id: roleId })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// CHECKLIST MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Get all checklist templates with items
 */
export async function getChecklists() {
  const { data, error } = await supabase
    .from('checklist_templates')
    .select(`
      id,
      name,
      type,
      model,
      is_active,
      created_at,
      checklist_template_items (
        id,
        item_name,
        item_order,
        is_required
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new checklist template
 */
export async function createChecklist({ name, description, roleType, items }) {
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  // 1. Create checklist template
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .insert({
      name,
      type: roleType,
      model: null,
      is_active: true,
      created_by: profile?.id
    })
    .select()
    .single();

  if (templateError) throw templateError;

  // 2. Create template items
  if (items && items.length > 0) {
    const templateItems = items.map((item, index) => ({
      template_id: template.id,
      item_order: index + 1,
      item_name: item.name,
      description: item.description || null,
      is_required: item.isRequired ?? true
    }));

    const { error: itemsError } = await supabase
      .from('checklist_template_items')
      .insert(templateItems);

    if (itemsError) throw itemsError;
  }

  return template;
}

/**
 * Update a checklist template
 */
export async function updateChecklist(checklistId, { name, description, isActive }) {
  const { data, error } = await supabase
    .from('checklist_templates')
    .update({ name, is_active: isActive })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a checklist template
 */
export async function deleteChecklist(checklistId) {
  // Items will be cascade deleted due to FK constraint
  const { error } = await supabase
    .from('checklist_templates')
    .delete()
    .eq('id', checklistId);

  if (error) throw error;
}

/**
 * Add item to checklist template
 */
export async function addChecklistItem(checklistId, { name, order, isRequired }) {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .insert({
      template_id: checklistId,
      item_name: name,
      item_order: order,
      is_required: isRequired ?? true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update checklist template item
 */
export async function updateChecklistItem(itemId, { name, order, isRequired }) {
  const { data, error } = await supabase
    .from('checklist_template_items')
    .update({
      item_name: name,
      item_order: order,
      is_required: isRequired
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete checklist template item
 */
export async function deleteChecklistItem(itemId) {
  const { error } = await supabase
    .from('checklist_template_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

// ----------------------------------------------------------------------------
// CYCLE MANAGEMENT
// ----------------------------------------------------------------------------

/**
 * Get all cycles with assignments
 */
export async function getCycles() {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      serial_number,
      model,
      status,
      priority,
      created_at,
      assignments (
        id,
        assigned_at,
        completed_at,
        profiles:technician_id (
          id,
          full_name,
          user_code
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Create a new cycle
 */
export async function createCycle({ cycleCode, modelName, priority }) {
  // Get current user profile for created_by
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  const { data, error } = await supabase
    .from('cycles')
    .insert({
      serial_number: cycleCode,
      model: modelName,
      status: 'pending',
      priority: priority || 'normal',
      created_by: profile.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update cycle status
 */
export async function updateCycleStatus(cycleId, status) {
  const { data, error } = await supabase
    .from('cycles')
    .update({ status })
    .eq('id', cycleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assign cycle to technician
 */
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

  if (error) throw error;

  // Update cycle status
  await updateCycleStatus(cycleId, 'assigned');

  return data;
}

/**
 * Get technicians (for assignment dropdown)
 */
export async function getTechnicians() {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      user_code,
      status,
      roles!inner (name)
    `)
    .eq('roles.name', 'technician')
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// TECHNICIAN WORKFLOW
// ----------------------------------------------------------------------------

/**
 * Get assignments for a specific technician
 */
export async function getMyAssignments(technicianId) {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id,
      cycle_id,
      assigned_at,
      due_date,
      started_at,
      completed_at,
      status,
      cycles (
        id,
        serial_number,
        model,
        priority,
        status
      )
    `)
    .eq('technician_id', technicianId)
    .in('status', ['pending', 'in_progress'])
    .order('assigned_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Start assembly work on an assignment
 */
export async function startAssembly(assignmentId) {
  const { data, error } = await supabase
    .from('assignments')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  // Also update cycle status
  const assignment = data;
  await updateCycleStatus(assignment.cycle_id, 'in_progress');

  return data;
}

/**
 * Complete assembly work
 */
export async function completeAssembly(assignmentId) {
  const { data, error } = await supabase
    .from('assignments')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  // Update cycle status to pending QC
  const assignment = data;
  await updateCycleStatus(assignment.cycle_id, 'qc_pending');

  return data;
}

/**
 * Update a checklist item completion status
 */
export async function updateChecklistItemCompletion(itemId, isCompleted, notes = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  const updateData = {
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null,
    completed_by: isCompleted ? profile.id : null
  };

  if (notes) {
    updateData.notes = notes;
  }

  const { data, error } = await supabase
    .from('checklist_items')
    .update(updateData)
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// QC WORKFLOW
// ----------------------------------------------------------------------------

/**
 * Get cycles pending QC inspection
 */
export async function getPendingQC() {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      serial_number,
      model,
      variant,
      color,
      priority,
      created_at,
      assignments (
        id,
        completed_at,
        profiles:technician_id (
          id,
          full_name,
          user_code
        )
      )
    `)
    .eq('status', 'qc_pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Perform QC inspection
 */
export async function performQCInspection(cycleId, { result, defects, notes, photos, overallScore }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  // Normalize result
  const normalizedResult = result === 'pass' ? 'passed' :
                          result === 'fail' ? 'failed' : result;

  // Create QC log
  const { data: qcLog, error: qcError } = await supabase
    .from('qc_logs')
    .insert({
      cycle_id: cycleId,
      inspector_id: profile.id,
      result: normalizedResult,
      overall_score: overallScore || null,
      defects_found: defects || [],
      notes: notes || null,
      photos: photos || [],
      is_override: false
    })
    .select()
    .single();

  if (qcError) throw qcError;

  // Update cycle status
  const newStatus = normalizedResult === 'passed' ? 'qc_passed' : 'qc_failed';
  await updateCycleStatus(cycleId, newStatus);

  // If passed, mark as ready for dispatch
  if (normalizedResult === 'passed') {
    await updateCycleStatus(cycleId, 'ready_for_dispatch');
  }

  return qcLog;
}

// ----------------------------------------------------------------------------
// SALES WORKFLOW
// ----------------------------------------------------------------------------

/**
 * Get cycles ready for dispatch
 */
export async function getReadyForDispatch() {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      serial_number,
      model,
      variant,
      color,
      created_at,
      qc_logs (
        id,
        result,
        inspected_at,
        profiles:inspector_id (
          full_name,
          user_code
        )
      )
    `)
    .eq('status', 'ready_for_dispatch')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Mark cycle as dispatched
 */
export async function dispatchCycle(cycleId, dispatchNotes = null) {
  const { data, error } = await supabase
    .from('cycles')
    .update({
      status: 'dispatched',
      notes: dispatchNotes
    })
    .eq('id', cycleId)
    .select()
    .single();

  if (error) throw error;

  // Log dispatch action
  await logAudit({
    action: 'UPDATE',
    tableName: 'cycles',
    recordId: cycleId,
    details: { action: 'dispatch', notes: dispatchNotes }
  });

  return data;
}

// ----------------------------------------------------------------------------
// QC OVERRIDE
// ----------------------------------------------------------------------------

/**
 * Get QC logs for a cycle
 */
export async function getQCLogs(cycleId) {
  const { data, error } = await supabase
    .from('qc_logs')
    .select(`
      id,
      result,
      notes,
      created_at,
      profiles:inspector_id (
        id,
        full_name,
        user_code
      )
    `)
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Admin QC override
 */
export async function qcOverride(cycleId, { result, reason, inspectorId }) {
  // Normalize result values: 'pass' → 'passed', 'fail' → 'failed'
  const normalizedResult = result === 'pass' ? 'passed' :
                          result === 'fail' ? 'failed' : result;

  // 1. Create QC log with override
  const { data: qcLog, error: qcError } = await supabase
    .from('qc_logs')
    .insert({
      cycle_id: cycleId,
      inspector_id: inspectorId,
      result: normalizedResult,
      notes: `ADMIN OVERRIDE: ${reason}`,
      is_override: true
    })
    .select()
    .single();

  if (qcError) throw qcError;

  // 2. Update cycle status based on result
  const newStatus = normalizedResult === 'passed' ? 'qc_passed' : 'qc_failed';
  await updateCycleStatus(cycleId, newStatus);

  // 3. Log to audit
  await logAudit({
    action: 'UPDATE',
    tableName: 'cycles',
    recordId: cycleId,
    details: { action: 'qc_override', result: normalizedResult, reason }
  });

  return qcLog;
}

// ----------------------------------------------------------------------------
// AUDIT LOGS
// ----------------------------------------------------------------------------

/**
 * Get audit logs
 */
export async function getAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      created_at,
      profiles:user_id (
        id,
        full_name,
        user_code
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Create audit log entry
 */
export async function logAudit({ action, tableName, recordId, oldValues, newValues, details }) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: profile?.id,
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues || details
    });

  if (error) console.error('Audit log error:', error);
}

// ----------------------------------------------------------------------------
// DASHBOARD STATS
// ----------------------------------------------------------------------------

/**
 * Get admin dashboard statistics
 */
export async function getDashboardStats() {
  const [users, cycles, pendingQC] = await Promise.all([
    supabase.from('profiles').select('id, status', { count: 'exact' }),
    supabase.from('cycles').select('id, status', { count: 'exact' }),
    supabase.from('cycles').select('id', { count: 'exact' }).eq('status', 'pending_qc')
  ]);

  const activeUsers = users.data?.filter(u => u.status === 'active').length || 0;
  const cyclesByStatus = cycles.data?.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    totalUsers: users.count || 0,
    activeUsers,
    totalCycles: cycles.count || 0,
    pendingQC: pendingQC.count || 0,
    cyclesByStatus
  };
}

// ----------------------------------------------------------------------------
// TECHNICIAN - CHECKLIST FEATURES
// ----------------------------------------------------------------------------

/**
 * Get checklist for an assignment/cycle
 */
export async function getAssignmentChecklist(cycleId) {
  const { data, error } = await supabase
    .from('checklists')
    .select(`
      id,
      type,
      status,
      started_at,
      completed_at,
      notes,
      checklist_items (
        id,
        item_order,
        item_name,
        description,
        is_completed,
        is_required,
        completed_at,
        notes,
        photo_url,
        profiles:completed_by (
          full_name,
          user_code
        )
      )
    `)
    .eq('cycle_id', cycleId)
    .eq('type', 'technician_assembly')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Create checklist for a cycle from template
 */
export async function createChecklistForCycle(cycleId, templateId, assignedTo) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  // Get template with items
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .select(`
      id,
      type,
      checklist_template_items (
        item_order,
        item_name,
        description,
        is_required
      )
    `)
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;

  // Create checklist
  const { data: checklist, error: checklistError } = await supabase
    .from('checklists')
    .insert({
      cycle_id: cycleId,
      type: template.type,
      template_id: templateId,
      created_by: profile.id,
      assigned_to: assignedTo,
      status: 'pending'
    })
    .select()
    .single();

  if (checklistError) throw checklistError;

  // Create checklist items from template
  if (template.checklist_template_items?.length > 0) {
    const items = template.checklist_template_items.map(item => ({
      checklist_id: checklist.id,
      item_order: item.item_order,
      item_name: item.item_name,
      description: item.description,
      is_required: item.is_required,
      is_completed: false
    }));

    const { error: itemsError } = await supabase
      .from('checklist_items')
      .insert(items);

    if (itemsError) throw itemsError;
  }

  return checklist;
}

/**
 * Update checklist item with photo URL
 */
export async function updateChecklistItemPhoto(itemId, photoUrl) {
  const { data, error } = await supabase
    .from('checklist_items')
    .update({ photo_url: photoUrl })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Start checklist (mark as in_progress)
 */
export async function startChecklist(checklistId) {
  const { data, error } = await supabase
    .from('checklists')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString()
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Complete checklist
 */
export async function completeChecklist(checklistId) {
  const { data, error } = await supabase
    .from('checklists')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get technician's assignment history
 */
export async function getAssignmentHistory(technicianId, limit = 50) {
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id,
      assigned_at,
      started_at,
      completed_at,
      status,
      cycles (
        id,
        serial_number,
        model,
        status
      )
    `)
    .eq('technician_id', technicianId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// QC - STATS AND HISTORY
// ----------------------------------------------------------------------------

/**
 * Get QC stats for today (passed/failed counts)
 */
export async function getQCStats(inspectorId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let query = supabase
    .from('qc_logs')
    .select('id, result')
    .gte('inspected_at', today.toISOString());

  if (inspectorId) {
    query = query.eq('inspector_id', inspectorId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return {
    passed: data?.filter(q => q.result === 'passed').length || 0,
    failed: data?.filter(q => q.result === 'failed').length || 0,
    total: data?.length || 0
  };
}

/**
 * Get cycle's checklist for QC review
 */
export async function getCycleChecklist(cycleId) {
  const { data, error } = await supabase
    .from('checklists')
    .select(`
      id,
      type,
      status,
      started_at,
      completed_at,
      notes,
      profiles:assigned_to (
        full_name,
        user_code
      ),
      checklist_items (
        id,
        item_order,
        item_name,
        description,
        is_completed,
        is_required,
        completed_at,
        notes,
        photo_url
      )
    `)
    .eq('cycle_id', cycleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get QC history for an inspector
 */
export async function getQCHistory(inspectorId = null, limit = 50) {
  let query = supabase
    .from('qc_logs')
    .select(`
      id,
      result,
      overall_score,
      defects_found,
      notes,
      is_override,
      inspected_at,
      cycles (
        id,
        serial_number,
        model,
        status
      ),
      profiles:inspector_id (
        full_name,
        user_code
      )
    `)
    .order('inspected_at', { ascending: false })
    .limit(limit);

  if (inspectorId) {
    query = query.eq('inspector_id', inspectorId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

// ----------------------------------------------------------------------------
// SUPERVISOR - REASSIGN AND DUE DATES
// ----------------------------------------------------------------------------

/**
 * Reassign cycle to a different technician
 */
export async function reassignCycle(assignmentId, newTechnicianId, reason = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_id', user.id)
    .single();

  // Get current assignment
  const { data: currentAssignment, error: fetchError } = await supabase
    .from('assignments')
    .select('cycle_id, technician_id')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  // Update existing assignment to reassigned status
  const { error: updateError } = await supabase
    .from('assignments')
    .update({
      status: 'reassigned',
      notes: reason ? `Reassigned: ${reason}` : 'Reassigned to another technician'
    })
    .eq('id', assignmentId);

  if (updateError) throw updateError;

  // Create new assignment for the new technician
  const { data: newAssignment, error: insertError } = await supabase
    .from('assignments')
    .insert({
      cycle_id: currentAssignment.cycle_id,
      technician_id: newTechnicianId,
      supervisor_id: profile.id,
      assigned_at: new Date().toISOString(),
      status: 'pending',
      notes: reason ? `Reassigned from previous technician: ${reason}` : null
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Update cycle status back to assigned
  await updateCycleStatus(currentAssignment.cycle_id, 'assigned');

  // Log to audit
  await logAudit({
    action: 'UPDATE',
    tableName: 'assignments',
    recordId: assignmentId,
    details: {
      action: 'reassign',
      old_technician: currentAssignment.technician_id,
      new_technician: newTechnicianId,
      reason
    }
  });

  return newAssignment;
}

/**
 * Update assignment due date
 */
export async function updateDueDate(assignmentId, dueDate) {
  const { data, error } = await supabase
    .from('assignments')
    .update({ due_date: dueDate })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get team performance metrics for supervisor
 */
export async function getTeamPerformance(supervisorId = null, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let query = supabase
    .from('assignments')
    .select(`
      id,
      technician_id,
      assigned_at,
      started_at,
      completed_at,
      status,
      profiles:technician_id (
        full_name,
        user_code
      )
    `)
    .gte('assigned_at', startDate.toISOString());

  if (supervisorId) {
    query = query.eq('supervisor_id', supervisorId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate metrics per technician
  const technicianStats = {};
  data?.forEach(assignment => {
    const techId = assignment.technician_id;
    if (!technicianStats[techId]) {
      technicianStats[techId] = {
        technician: assignment.profiles,
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        avgCompletionTime: []
      };
    }

    technicianStats[techId].total++;

    if (assignment.status === 'completed') {
      technicianStats[techId].completed++;
      if (assignment.started_at && assignment.completed_at) {
        const startTime = new Date(assignment.started_at);
        const endTime = new Date(assignment.completed_at);
        const hours = (endTime - startTime) / (1000 * 60 * 60);
        technicianStats[techId].avgCompletionTime.push(hours);
      }
    } else if (assignment.status === 'in_progress') {
      technicianStats[techId].inProgress++;
    } else if (assignment.status === 'pending') {
      technicianStats[techId].pending++;
    }
  });

  // Calculate average completion time
  Object.values(technicianStats).forEach(stat => {
    if (stat.avgCompletionTime.length > 0) {
      const avg = stat.avgCompletionTime.reduce((a, b) => a + b, 0) / stat.avgCompletionTime.length;
      stat.avgCompletionTimeHours = Math.round(avg * 10) / 10;
    } else {
      stat.avgCompletionTimeHours = null;
    }
    delete stat.avgCompletionTime;
  });

  return Object.values(technicianStats);
}

// ----------------------------------------------------------------------------
// SALES - QC REPORTS AND DISPATCH HISTORY
// ----------------------------------------------------------------------------

/**
 * Get full QC report for a cycle
 */
export async function getQCReport(cycleId) {
  const { data, error } = await supabase
    .from('qc_logs')
    .select(`
      id,
      result,
      overall_score,
      defects_found,
      notes,
      photos,
      is_override,
      inspected_at,
      profiles:inspector_id (
        id,
        full_name,
        user_code
      )
    `)
    .eq('cycle_id', cycleId)
    .order('inspected_at', { ascending: false });

  if (error) throw error;

  // Also get the cycle details
  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select(`
      id,
      serial_number,
      model,
      variant,
      color,
      status,
      priority,
      created_at,
      assignments (
        id,
        assigned_at,
        completed_at,
        profiles:technician_id (
          full_name,
          user_code
        )
      )
    `)
    .eq('id', cycleId)
    .single();

  if (cycleError) throw cycleError;

  return {
    cycle,
    qcLogs: data
  };
}

/**
 * Get dispatch history
 */
export async function getDispatchHistory(limit = 50) {
  const { data, error } = await supabase
    .from('cycles')
    .select(`
      id,
      serial_number,
      model,
      variant,
      color,
      status,
      notes,
      updated_at,
      qc_logs (
        id,
        result,
        overall_score,
        inspected_at,
        profiles:inspector_id (
          full_name,
          user_code
        )
      )
    `)
    .eq('status', 'dispatched')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get dispatch stats
 */
export async function getDispatchStats(days = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('cycles')
    .select('id, updated_at')
    .eq('status', 'dispatched')
    .gte('updated_at', startDate.toISOString());

  if (error) throw error;

  // Group by day
  const byDay = {};
  data?.forEach(cycle => {
    const day = new Date(cycle.updated_at).toLocaleDateString();
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    total: data?.length || 0,
    byDay
  };
}
