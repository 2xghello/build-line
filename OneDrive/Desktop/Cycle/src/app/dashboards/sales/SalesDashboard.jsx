// ============================================================================
// SALES DASHBOARD - Placeholder
// ============================================================================

function SalesDashboard() {
  return (
    <div className="dashboard-page">
      <h1>Sales Dashboard</h1>
      <p>Handle cycle dispatch and delivery.</p>

      <div className="dashboard-cards">
        <div className="card">
          <h3>Ready for Dispatch</h3>
          <p>QC approved cycles</p>
        </div>
        <div className="card">
          <h3>Dispatched Today</h3>
          <p>Delivered cycles</p>
        </div>
        <div className="card">
          <h3>Total Dispatched</h3>
          <p>All time deliveries</p>
        </div>
      </div>
    </div>
  );
}

export default SalesDashboard;
