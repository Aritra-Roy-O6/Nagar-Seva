import React, { useState, useEffect, useCallback } from 'react';
import { Container, Table, Button, Spinner, Alert } from 'react-bootstrap';
import ReportDetailModal from '../components/ReportDetailModal';
import apiClient from '../api/client';

function DashboardPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/admin/reports');
      setReports(response.data);
    } catch (err) {
      setError('Failed to fetch reports. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleOpenModal = (report) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReport(null);
  };

  const handleUpdateReport = async (reportId, updateData) => {
    try {
        await apiClient.put(`/admin/reports/${reportId}`, updateData);
        handleCloseModal();
        await fetchReports(); 
    } catch (error) {
        console.error("Failed to update report:", error);
        setError("Failed to update report. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Container className="mt-4 mb-4">
      <h1 className="mb-4">Admin Dashboard</h1>

      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Problem</th>
            <th className="text-end">District</th>
            <th className="text-end">Ward</th>
            <th className="text-end">Reports Count</th>
            <th className="text-end">Status</th>
            <th className="text-end">Department</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.problem}</td>
              <td className="text-end">{report.district}</td>
              <td className="text-end">{report.ward}</td>
              <td className="text-end">{report.nos}</td>
              <td className="text-end">{report.status}</td>
              <td className="text-end">{report.department_name || 'N/A'}</td>
              <td className="text-end">
                <Button variant="primary" size="sm" onClick={() => handleOpenModal(report)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {selectedReport && (
        <ReportDetailModal
          show={isModalOpen}
          onClose={handleCloseModal}
          report={selectedReport}
          onUpdate={handleUpdateReport}
        />
      )}
    </Container>
  );
}

export default DashboardPage;