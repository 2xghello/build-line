// ============================================================================
// TECHNICIAN DASHBOARD - Placeholder
// ============================================================================

function TechnicianDashboard() {
  return (
    <div className="dashboard-page">
      <h1>Technician Dashboard</h1>
      <p>View and complete your assigned tasks.</p>

      <div className="dashboard-cards">
        <div className="card">
          <h3>My Tasks</h3>
          <p>Assigned cycles</p>
        </div>
        <div className="card">
          <h3>In Progress</h3>
          <p>Currently working on</p>
        </div>
        <div className="card">
          <h3>Completed</h3>
          <p>Finished assemblies</p>
        </div>
      </div>
    </div>
  );
}

export default TechnicianDashboard;
