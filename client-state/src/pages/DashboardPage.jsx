import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

const EscalatedReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEscalatedReports = async () => {
      try {
        setLoading(true);
        // MODIFIED: This endpoint is now secured by stateAdminAuth middleware
        const response = await apiClient.get('/state-admin/escalated-reports');
        setReports(response.data);
      } catch (err) {
        console.error("Failed to fetch escalated reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEscalatedReports();
  }, []);

  if (loading) return <p>Loading escalated reports...</p>;

  return (
    <>
      <h3 className="mb-4">Escalated (SLA) Reports Dashboard</h3>
      <div className="alert alert-warning">
        The following reports have breached the Service Level Agreement (SLA) due to high submission volume (&gt;100) and being unresolved for over 4 months.
      </div>
      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-hover table-sm">
            <thead className="table-light">
              <tr>
                <th>Problem</th>
                <th>District</th>
                <th>Ward</th>
                <th className="text-center">Total Submissions (NOS)</th>
                <th>Assigned Department</th>
                <th>First Reported On</th>
              </tr>
            </thead>
            <tbody>
              {reports.length > 0 ? reports.map((report) => (
                <tr key={report.id} className="table-danger">
                  <td>{report.problem}</td>
                  <td>{report.district}</td>
                  <td>{report.ward}</td>
                  <td className="text-center fw-bold">{report.nos}</td>
                  <td>{report.department_name || 'Unassigned'}</td>
                  <td>{new Date(report.created_at).toLocaleDateString()}</td>
                </tr>
              )) : (
                <tr>
                    <td colSpan="6" className="text-center text-muted">No escalated reports found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default EscalatedReportsPage;