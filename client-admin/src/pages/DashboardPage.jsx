import React, { useEffect, useState, useMemo, useContext } from 'react';
import apiClient from '../api/client';
import ReportDetailModal from '../components/ReportDetailModal';
import { AuthContext } from '../context/AuthContext';

// ADDED: Import socket.io-client
import { io } from 'socket.io-client';

// ADDED: Initialize socket connection (it will be undefined until connected)
let socket;

const DashboardPage = () => {
  const { user, token } = useContext(AuthContext); // MODIFIED: Get token from context
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ADDED: State to track socket connection status
  const [isConnected, setIsConnected] = useState(false);

  // --- State for filters and sorting ---
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [sortByStatus, setSortByStatus] = useState('');
  const [sortByNOS, setSortByNOS] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [reportsResponse, deptsResponse] = await Promise.all([
          apiClient.get('/admin/reports'),
          apiClient.get('/departments')
        ]);
        setReports(Array.isArray(reportsResponse.data) ? reportsResponse.data : []);
        setDepartments(deptsResponse.data);
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

    // ADDED: Set up Socket.IO connection and listeners
    if (token) {
        // Connect to the server with the auth token
        socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
            auth: {
                token: token
            }
        });

        socket.on('connect', () => {
            console.log('Successfully connected to real-time server!');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from real-time server.');
            setIsConnected(false);
        });

        // Listener for new or updated reports from citizen submissions
        socket.on('new_or_updated_report', (incomingReport) => {
            console.log('Real-time: Received new or updated report', incomingReport);
            setReports(prevReports => {
                const existingReportIndex = prevReports.findIndex(r => r.id === incomingReport.id);
                // If report exists, update it
                if (existingReportIndex !== -1) {
                    const updatedReports = [...prevReports];
                    updatedReports[existingReportIndex] = incomingReport;
                    return updatedReports;
                }
                // If it's a new report, add it to the top
                return [incomingReport, ...prevReports];
            });
        });

        // Listener for reports updated by other admins
        socket.on('report_updated', (updatedReport) => {
            console.log('Real-time: Received report update from another admin', updatedReport);
            handleReportUpdate(updatedReport); // Reuse existing update logic
        });
    }

    // Cleanup function to disconnect socket and remove listeners on component unmount
    return () => {
        if (socket) {
            console.log('Disconnecting socket...');
            socket.disconnect();
        }
    };
  }, [user, token]); // MODIFIED: Re-run effect if user or token changes

  // --- Filtering and sorting logic ---
  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports.filter(report => {
      const departmentMatch = selectedDepartment ? report.department_name === selectedDepartment : true;
      const wardMatch = selectedWard ? report.ward === selectedWard : true;
      return departmentMatch && wardMatch;
    });
    if (sortByStatus) {
      const statusPriority = { 'submitted': 1, 'pending': 2, 'in_progress': 3, 'resolved': 4, 'rejected': 5 };
      filtered = filtered.sort((a, b) => {
        const statusA = a.status || 'pending';
        const statusB = b.status || 'pending';
        if (sortByStatus === 'priority') {
          return (statusPriority[statusA] || 5) - (statusPriority[statusB] || 5);
        } else if (sortByStatus === 'alphabetical') {
          return statusA.localeCompare(statusB);
        }
        return 0;
      });
    }
    if (sortByNOS) {
      filtered = filtered.slice().sort((a, b) => {
        const nosA = typeof a.nos === 'number' ? a.nos : (parseInt(a.nos) || 1);
        const nosB = typeof b.nos === 'number' ? b.nos : (parseInt(b.nos) || 1);
        if (sortByNOS === 'asc') return nosA - nosB;
        if (sortByNOS === 'desc') return nosB - nosA;
        return 0;
      });
    }
    return filtered;
  }, [reports, selectedDepartment, selectedWard, sortByStatus, sortByNOS]);

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
      
      {/* ADDED: Connection status indicator */}
      <div className="d-flex align-items-center mb-3">
          <span className={`me-2 p-1 border border-2 rounded-circle ${isConnected ? 'bg-success' : 'bg-danger'}`} style={{width: '10px', height: '10px'}}></span>
          <span>Real-time Connection: <strong>{isConnected ? 'Connected' : 'Disconnected'}</strong></span>
      </div>

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
            {/* --- Sort by Status --- */}
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
            {/* --- NEW: Sort by NOS --- */}
            <div className="col-md-3">
              <label htmlFor="nosSort" className="form-label">Sort by NOS</label>
              <select
                id="nosSort"
                className="form-select form-select-sm"
                value={sortByNOS}
                onChange={(e) => setSortByNOS(e.target.value)}
              >
                <option value="">No Sorting</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
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