import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';
import ReportDetailModal from '../components/ReportDetailModal';

const DashboardPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/admin/reports');
            setReports(response.data);
        } catch (err) {
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

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const handleReportUpdate = (updatedReport) => {
    setReports(reports.map(r => r.id === updatedReport.id ? updatedReport : r));
  };

  if (loading) return <p>Loading reports...</p>;

  return (
    <>
      <h1 className="mb-4">Reports Dashboard</h1>
      <div className="card shadow-sm">
        <div className="card-body">
          <table className="table table-hover">
            {/* Added full table headers for clarity */}
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
                  {/* Added status badge to the table */}
                  <td>
                    <span className={`badge ${getStatusBadge(report.status)}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="text-center">{new Date(report.created_at).toLocaleString()}</td>
                  <td className="text-center">
                    <button className="btn btn-primary btn-sm" onClick={() => handleViewDetails(report)}>
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ReportDetailModal
        report={selectedReport}
        show={isModalOpen}
        onClose={handleCloseModal}
        onUpdate={handleReportUpdate}
      />
    </>
  );
};

export default DashboardPage;

