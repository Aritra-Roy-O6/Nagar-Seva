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

  // --- State for filters and sorting ---
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(''); // Empty string means "All"
  const [selectedWard, setSelectedWard] = useState(''); // Empty string means "All"
  const [sortByStatus, setSortByStatus] = useState(''); // NEW: Empty string means no specific sorting

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

  // --- Filtering and sorting logic ---
  const filteredAndSortedReports = useMemo(() => {
    // First, filter the reports
    let filtered = reports.filter(report => {
      const departmentMatch = selectedDepartment ? report.department_name === selectedDepartment : true;
      const wardMatch = selectedWard ? report.ward === selectedWard : true;
      return departmentMatch && wardMatch;
    });

    // Then, sort by status if selected
    if (sortByStatus) {
      const statusPriority = {
        'submitted': 1,
        'pending': 2,
        'in_progress': 3,
        'resolved': 4,
        'rejected': 5
      };

      filtered = filtered.sort((a, b) => {
        const statusA = a.status || 'pending';
        const statusB = b.status || 'pending';
        
        if (sortByStatus === 'priority') {
          // Sort by priority (pending first, resolved last)
          return (statusPriority[statusA] || 5) - (statusPriority[statusB] || 5);
        } else if (sortByStatus === 'alphabetical') {
          // Sort alphabetically
          return statusA.localeCompare(statusB);
        }
        return 0;
      });
    }

    return filtered;
  }, [reports, selectedDepartment, selectedWard, sortByStatus]);

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
          {/* --- Filter and Sort Controls --- */}
          <div className="row mb-3 gx-3">
            <div className="col-md-3">
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
            <div className="col-md-3">
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
            {/* --- NEW: Sort by Status --- */}
            <div className="col-md-3">
              <label htmlFor="statusSort" className="form-label">Sort by Status</label>
              <select 
                id="statusSort" 
                className="form-select form-select-sm"
                value={sortByStatus}
                onChange={(e) => setSortByStatus(e.target.value)}
              >
                <option value="">No Sorting</option>
                <option value="priority">By Priority (Pending → Resolved)</option>
                <option value="alphabetical">Alphabetical</option>
              </select>
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  setSelectedDepartment('');
                  setSelectedWard('');
                  setSortByStatus('');
                }}
              >
                Clear All Filters
              </button>
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
              {filteredAndSortedReports.map((report, index) => (
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
          
          {filteredAndSortedReports.length === 0 && (
            <div className="text-center py-4 text-muted">
              No reports found matching the selected filters.
            </div>
          )}
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