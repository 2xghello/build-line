// ============================================================================
// SUPERVISOR DASHBOARD - Placeholder
// ============================================================================

function SupervisorDashboard() {
  return (
    <div className="dashboard-page">
      <h1>Supervisor Dashboard</h1>
      <p>Manage cycle assignments and monitor progress.</p>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Pending Assignments</h3>
          <p>Cycles waiting to be assigned</p>
        </div>
        <div className="card">
          <h3>In Progress</h3>
          <p>Active assemblies</p>
        </div>
        <div className="card">
          <h3>Technicians</h3>
          <p>Team workload overview</p>
        </div>
      </div>
    </div>
  );
}

export default SupervisorDashboard;
