import React, { useEffect, useState, useMemo, useContext } from 'react';
import apiClient from '../api/client';
import ReportDetailModal from '../components/ReportDetailModal';
import { AuthContext } from '../context/AuthContext';

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- NEW: State for filters ---
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(''); // Empty string means "All"
  const [selectedWard, setSelectedWard] = useState(''); // Empty string means "All"

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Use Promise.all to fetch reports and filter data concurrently
        const [reportsResponse, deptsResponse] = await Promise.all([
          apiClient.get('/admin/reports'),
          apiClient.get('/departments')
        ]);

        setReports(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
        setDepartments(deptsResponse.data);

        // Fetch wards specific to the logged-in admin's district
        if (user?.district_id) {
          const wardsResponse = await apiClient.get(`/districts/${user.district_id}/wards`);
          setWards(wardsResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user]); // Re-fetch if the user object changes

  // --- NEW: Filtering logic ---
  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // If a filter is selected, check for a match. Otherwise, it's a pass.
      const departmentMatch = selectedDepartment ? report.department_name === selectedDepartment : true;
      const wardMatch = selectedWard ? report.ward === selectedWard : true;
      return departmentMatch && wardMatch;
    });
  }, [reports, selectedDepartment, selectedWard]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved': return 'bg-success';
      case 'in_progress': return 'bg-warning text-dark';
      case 'rejected': return 'bg-danger';
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
    if (updatedReport.status === 'resolved') {
        setReports(reports.filter(r => r.id !== updatedReport.id));
    } else {
        setReports(reports.map(r => r.id === updatedReport.id ? updatedReport : r));
    }
  };

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <>
      <h3 className="mb-4">Reports Dashboard - {user?.district_name || 'Your District'}</h3>
      <div className="card shadow-sm">
        <div className="card-body">
          {/* --- NEW: Filter Controls --- */}
          <div className="row mb-3 gx-3">
            <div className="col-md-4">
              <label htmlFor="departmentFilter" className="form-label">Filter by Department</label>
              <select 
                id="departmentFilter" 
                className="form-select form-select-sm"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="wardFilter" className="form-label">Filter by Ward</label>
              <select 
                id="wardFilter" 
                className="form-select form-select-sm"
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
              >
                <option value="">All Wards</option>
                {wards.map(w => (
                  <option key={w.id} value={w.ward_no}>{w.ward_no}</option>
                ))}
              </select>
            </div>
          </div>
          
          <table className="table table-hover table-sm">
            <thead className="table-light">
              <tr>
                <th scope="col">Sl No.</th>
                <th scope="col">Department</th>
                <th scope="col">Problem</th>
                <th scope="col">Ward</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-center">NOS</th>
                <th scope="col" className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, index) => (
                <tr key={report.id || `report-${index}`}>
                  <td>{index + 1}</td>
                  <td>{report.department_name || 'Unassigned'}</td>
                  <td>{report.problem || 'N/A'}</td>
                  <td>{report.ward || 'N/A'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(report.status)}`}>
                      {report.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="text-center">{report.nos || 1}</td>
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

