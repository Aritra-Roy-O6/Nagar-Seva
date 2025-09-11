import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
// AdminLayout is no longer imported or used here

const DashboardPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/admin/reports');
        setReports(response.data);
      } catch (err) {
        setError('Failed to fetch reports.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved': return 'bg-success';
      case 'in_progress': return 'bg-warning text-dark';
      default: return 'bg-secondary';
    }
  };

  if (loading) return <p>Loading reports...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  // The component now only returns the content, not the layout
  return (
    <>
      <h1 className="mb-4">Reports Dashboard</h1>
      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th scope="col">Problem Type</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-center">Submitted At</th>
                <th scope="col" className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>{report.problem_type}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="text-center">{new Date(report.created_at).toLocaleString()}</td>
                  <td className="text-center">
                    <button className="btn btn-primary btn-sm">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;

