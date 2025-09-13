import React, { useEffect, useState } from 'react';
import { Modal, Button, Row, Col, Form, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/client';

// MENTOR FIX APPLIED: More reliable icon configuration
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// MENTOR FIX APPLIED: Using the reliable map resize handler
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    // A small delay ensures the modal's animation is complete and the container is sized.
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

const ReportDetailModal = ({ report, show, onClose, onUpdate }) => {
    const [status, setStatus] = useState('');
    const [updateError, setUpdateError] = useState('');

    useEffect(() => {
        if (report) {
            setStatus(report.status);
            setUpdateError(''); // Reset error when a new report is loaded
        }
    }, [report]);

    // MENTOR FIX APPLIED: Data validation before rendering
    if (!report) {
        return null;
    }
    const hasValidCoordinates = report &&
                              report.location &&
                              Array.isArray(report.location.coordinates) &&
                              report.location.coordinates.length >= 2;

    const handleUpdate = async () => {
        setUpdateError('');
        try {
            const response = await apiClient.put(`/admin/reports/${report.id}`, { status });
            onUpdate(response.data);
            onClose();
        } catch (error) {
            console.error("Failed to update report", error);
            // MENTOR FIX APPLIED: Better error state management
            setUpdateError(error.response?.data?.message || "Failed to update report.");
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'resolved': return 'success';
            case 'in_progress': return 'warning';
            default: return 'secondary';
        }
    };

    return (
        <Modal show={show} onHide={onClose} size="xl" centered>
            <Modal.Header closeButton>
                <Modal.Title>Report Details - {report.problem_type}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col md={6}>
                        <h5>Location</h5>
                        <div style={{ height: '300px', width: '100%' }}>
                            {hasValidCoordinates ? (
                                <MapContainer 
                                    center={[report.location.coordinates[1], report.location.coordinates[0]]} 
                                    zoom={15} 
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[report.location.coordinates[1], report.location.coordinates[0]]}>
                                        <Popup>{report.problem_type}</Popup>
                                    </Marker>
                                    <MapResizeHandler />
                                </MapContainer>
                            ) : (
                                <div className="d-flex align-items-center justify-content-center h-100 bg-light text-muted">
                                    No valid location data available.
                                </div>
                            )}
                        </div>
                    </Col>
                    <Col md={6}>
                        <h5>Submitted Image</h5>
                        <img src={report.image_url} alt={report.problem_type} className="img-fluid rounded" />
                    </Col>
                </Row>
                <hr />
                <h5>Details</h5>
                <p><strong>Description:</strong> {report.description || 'No description provided.'}</p>
                <p><strong>Current Status:</strong> <Badge bg={getStatusBadge(report.status)}>{report.status}</Badge></p>
                <p><strong>Submitted At:</strong> {new Date(report.created_at).toLocaleString()}</p>
            </Modal.Body>
            <Modal.Footer className="justify-content-between">
                <div>
                    <Form.Group as={Row} className="align-items-center">
                        <Form.Label column sm="auto" className="mb-0">Update Status:</Form.Label>
                        <Col sm="auto">
                            <Form.Select value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option value="submitted">Submitted</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="rejected">Rejected</option>
                            </Form.Select>
                        </Col>
                    </Form.Group>
                </div>
                <div>
                    {updateError && <span className="text-danger me-3">{updateError}</span>}
                    <Button variant="secondary" onClick={onClose} className="me-2">
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleUpdate}>
                        Save Changes
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ReportDetailModal;

