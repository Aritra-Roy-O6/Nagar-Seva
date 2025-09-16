import React, { useState, useEffect, useCallback } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box, CircularProgress, Alert } from '@mui/material';
import ReportDetailModal from '../components/ReportDetailModal';
import apiClient from '../api/client';

function DashboardPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [departments, setDepartments] = useState([]);

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
    const fetchInitialData = async () => {
        await fetchReports();
        try {
            const deptsResponse = await apiClient.get('/departments');
            setDepartments(deptsResponse.data);
        } catch (err) {
            setError('Failed to fetch departments.');
            console.error(err);
        }
    };
    fetchInitialData();
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Problem</TableCell>
              <TableCell align="right">District</TableCell>
              <TableCell align="right">Ward</TableCell>
              <TableCell align="right">Reports Count</TableCell>
              <TableCell align="right">Status</TableCell>
              <TableCell align="right">Department</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell component="th" scope="row">{report.problem}</TableCell>
                <TableCell align="right">{report.district}</TableCell>
                <TableCell align="right">{report.ward}</TableCell>
                <TableCell align="right">{report.nos}</TableCell>
                <TableCell align="right">{report.status}</TableCell>
                <TableCell align="right">{report.department_name || 'N/A'}</TableCell>
                <TableCell align="right">
                  <Button variant="contained" onClick={() => handleOpenModal(report)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedReport && (
        <ReportDetailModal
          open={isModalOpen}
          handleClose={handleCloseModal}
          report={selectedReport}
          departments={departments}
          onUpdate={handleUpdateReport}
        />
      )}
    </Container>
  );
}

export default DashboardPage;