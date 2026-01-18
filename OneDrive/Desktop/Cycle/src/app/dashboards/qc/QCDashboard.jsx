// ============================================================================
// QC DASHBOARD - Placeholder
// ============================================================================

function QCDashboard() {
  return (
    <div className="dashboard-page">
      <h1>QC Dashboard</h1>
      <p>Quality control inspections and approvals.</p>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Pending Inspections</h3>
          <p>Cycles awaiting QC</p>
        </div>
        <div className="card">
          <h3>Passed Today</h3>
          <p>Approved cycles</p>
        </div>
        <div className="card">
          <h3>Failed</h3>
          <p>Requires rework</p>
        </div>
      </div>
    </div>
  );
}

export default QCDashboard;
