import { useState, useEffect } from 'react';
import {
  ClipboardList,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Check
} from 'lucide-react';
import {
  getChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem
} from '@services/adminService';
import './AdminPages.css';

// ============================================================================
// CHECKLIST MANAGEMENT PAGE
// ============================================================================

function ChecklistManagement() {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);

  useEffect(() => {
    loadChecklists();
  }, []);

  async function loadChecklists() {
    try {
      setLoading(true);
      const data = await getChecklists();
      setChecklists(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter checklists
  const filteredChecklists = checklists.filter(cl => {
    if (filterType === 'all') return true;
    return cl.type === filterType;
  });

  async function handleDelete(checklistId) {
    if (!confirm('Are you sure you want to delete this checklist?')) return;

    try {
      await deleteChecklist(checklistId);
      loadChecklists();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleActive(checklist) {
    try {
      await updateChecklist(checklist.id, {
        name: checklist.name,
        description: checklist.description,
        isActive: !checklist.is_active
      });
      loadChecklists();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading checklists...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <ClipboardList size={28} />
          <div>
            <h1>Checklist Management</h1>
            <p>Manage technician and supervisor checklists</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          Create Checklist
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={18} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="technician_assembly">Technician</option>
          <option value="supervisor_review">Supervisor</option>
          <option value="qc_inspection">QC</option>
        </select>
      </div>

      {/* Checklists */}
      <div className="checklists-container">
        {filteredChecklists.length === 0 ? (
          <div className="empty-state-card">
            <ClipboardList size={48} />
            <p>No checklists found</p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Create First Checklist
            </button>
          </div>
        ) : (
          filteredChecklists.map(checklist => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              isExpanded={expandedId === checklist.id}
              onToggle={() => setExpandedId(expandedId === checklist.id ? null : checklist.id)}
              onEdit={() => setEditingChecklist(checklist)}
              onDelete={() => handleDelete(checklist.id)}
              onToggleActive={() => handleToggleActive(checklist)}
              onItemsChange={loadChecklists}
            />
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingChecklist) && (
        <ChecklistModal
          checklist={editingChecklist}
          onClose={() => {
            setShowCreateModal(false);
            setEditingChecklist(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingChecklist(null);
            loadChecklists();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// CHECKLIST CARD
// ============================================================================

function ChecklistCard({
  checklist,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  onItemsChange
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setLoading(true);
      const order = (checklist.checklist_template_items?.length || 0) + 1;
      await addChecklistItem(checklist.id, {
        name: newItemName,
        order,
        isRequired: true
      });
      setNewItemName('');
      setAddingItem(false);
      onItemsChange();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteItem(itemId) {
    try {
      await deleteChecklistItem(itemId);
      onItemsChange();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className={`checklist-card ${!checklist.is_active ? 'inactive' : ''}`}>
      <div className="checklist-header" onClick={onToggle}>
        <div className="checklist-info">
          <h3>{checklist.name}</h3>
          <div className="checklist-meta">
            <span className={`type-badge type-${checklist.type}`}>
              {checklist.type}
            </span>
            <span className="item-count">
              {checklist.checklist_template_items?.length || 0} items
            </span>
            {!checklist.is_active && (
              <span className="status-badge status-inactive">Inactive</span>
            )}
          </div>
        </div>
        <div className="checklist-actions">
          <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Edit2 size={18} />
          </button>
          <button className="btn-icon btn-danger" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={18} />
          </button>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="checklist-body">
          {checklist.description && (
            <p className="checklist-description">{checklist.description}</p>
          )}

          <div className="checklist-items">
            {checklist.checklist_template_items?.sort((a, b) => a.item_order - b.item_order).map(item => (
              <div key={item.id} className="checklist-item">
                <GripVertical size={16} className="drag-handle" />
                <span className="item-order">{item.item_order}</span>
                <span className="item-name">{item.item_name}</span>
                {item.is_required && <span className="required-badge">Required</span>}
                <button
                  className="btn-icon btn-danger"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            {addingItem ? (
              <form className="add-item-form" onSubmit={handleAddItem}>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Enter item name..."
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                  {loading ? <Loader2 className="spinner" size={16} /> : <Check size={16} />}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setAddingItem(false)}
                >
                  <X size={16} />
                </button>
              </form>
            ) : (
              <button className="btn btn-secondary add-item-btn" onClick={() => setAddingItem(true)}>
                <Plus size={16} />
                Add Item
              </button>
            )}
          </div>

          <div className="checklist-footer">
            <button
              className={`btn ${checklist.is_active ? 'btn-warning' : 'btn-success'}`}
              onClick={onToggleActive}
            >
              {checklist.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CHECKLIST MODAL
// ============================================================================

function ChecklistModal({ checklist, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: checklist?.name || '',
    description: checklist?.description || '',
    roleType: checklist?.type || 'technician_assembly',
    items: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Checklist name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (checklist) {
        await updateChecklist(checklist.id, {
          name: formData.name,
          description: formData.description,
          isActive: checklist.is_active
        });
      } else {
        await createChecklist({
          name: formData.name,
          description: formData.description,
          roleType: formData.roleType,
          items: formData.items
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{checklist ? 'Edit Checklist' : 'Create Checklist'}</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">{error}</div>
            )}

            <div className="form-group">
              <label>Checklist Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter checklist name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            {!checklist && (
              <div className="form-group">
                <label>Role Type</label>
                <select
                  value={formData.roleType}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleType: e.target.value }))}
                >
                  <option value="technician_assembly">Technician</option>
                  <option value="supervisor_review">Supervisor</option>
                  <option value="qc_inspection">QC</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <Loader2 className="spinner" size={20} /> : null}
              {checklist ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChecklistManagement;
