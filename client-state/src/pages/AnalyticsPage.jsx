import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { Row, Col, Form, Spinner, Card } from 'react-bootstrap';
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const AnalyticsPage = () => {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch the list of districts on initial component mount
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const response = await apiClient.get('/districts');
        setDistricts(response.data);
        // Automatically select the first district if available
        if (response.data.length > 0) {
          setSelectedDistrict(response.data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch districts:", err);
        setError('Could not load districts.');
      }
    };
    fetchDistricts();
  }, []);

  // Fetch analytics data whenever the selected district changes
  useEffect(() => {
    if (!selectedDistrict) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError('');
      setAnalyticsData(null);
      try {
        const response = await apiClient.get(`/state-admin/analytics?districtId=${selectedDistrict}`);
        setAnalyticsData(response.data);
      } catch (err) {
        console.error(`Failed to fetch analytics for district ${selectedDistrict}:`, err);
        setError('Failed to load analytics data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedDistrict]);

  // --- Chart Data and Options ---

  const pieChartData = {
    labels: ['Submitted', 'In Progress', 'Resolved', 'Rejected'],
    datasets: [
      {
        label: '# of Reports',
        data: analyticsData ? [
          analyticsData.statusData.submitted,
          analyticsData.statusData.in_progress,
          analyticsData.statusData.resolved,
          analyticsData.statusData.rejected
        ] : [0, 0, 0, 0],
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const lineChartData = {
    labels: analyticsData?.frequencyData?.labels || [],
    datasets: [
      {
        label: 'Reports per Week',
        data: analyticsData?.frequencyData?.data || [],
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  return (
    <>
      <h3 className="mb-4">State-Level Analytics Dashboard</h3>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <Form.Group>
                <Form.Label><strong>Select a District to Analyze</strong></Form.Label>
                <Form.Select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={districts.length === 0}
                >
                  {districts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {loading && (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p>Loading analytics...</p>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {analyticsData && !loading && (
        <Row>
          <Col md={5}>
            <Card className="shadow-sm">
              <Card.Header>Report Status Breakdown</Card.Header>
              <Card.Body>
                <Pie data={pieChartData} />
              </Card.Body>
            </Card>
          </Col>
          <Col md={7}>
            <Card className="shadow-sm">
              <Card.Header>Weekly Report Frequency</Card.Header>
              <Card.Body>
                <Line data={lineChartData} />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
};

export default AnalyticsPage;