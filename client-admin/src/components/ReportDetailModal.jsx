import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Row, Col, Form, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiClient from '../api/client';

// Using the mentor's reliable icon configuration
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

const ReportDetailModal = ({ report, show, onClose, onUpdate }) => {
    const [status, setStatus] = useState('');
    const [departmentId, setDepartmentId] = useState(''); // Corrected syntax
    const [departments, setDepartments] = useState([]);
    const [updateError, setUpdateError] = useState('');
    const mapRef = useRef(null);

    // Effect to fetch the list of departments
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await apiClient.get('/departments');
                setDepartments(response.data);
            } catch (error) {
                console.error("Failed to fetch departments", error);
            }
        };
        fetchDepartments();
    }, []);

    // Effect to update local state when a new report is passed in
    useEffect(() => {
        if (report) {
            setStatus(report.status || '');
            setDepartmentId(report.department_id || '');
            setUpdateError('');
        }
    }, [report]);

    // The definitive fix for resizing the map inside the modal
    const handleMapResize = () => {
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
        }, 100); // A small delay is necessary for the modal animation
    };

    // Data validation check
    if (!report) {
        return null;
    }
    const hasValidCoordinates = report && report.location && Array.isArray(report.location.coordinates) && report.location.coordinates.length >= 2;

    const handleUpdate = async () => {
        setUpdateError('');
        try {
            const payload = {
                status,
                department_id: departmentId ? parseInt(departmentId) : null,
            };
            const response = await apiClient.put(`/admin/reports/${report.id}`, payload);
            onUpdate(response.data); // Update the parent component's state
            onClose(); // Close the modal
        } catch (error) {
            console.error("Failed to update report", error);
            setUpdateError(error.response?.data?.message || "Failed to update report.");
        }
    };
    
    const getStatusBadge = (status) => {
        switch (status) {
            case 'resolved': return 'success';
            case 'in_progress': return 'warning';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };

    const departmentName = departments.find(d => d.id === report.department_id)?.name || 'Unassigned';

    return (
        <Modal show={show} onHide={onClose} size="xl" centered onEntered={handleMapResize}>
            <Modal.Header closeButton>
                <Modal.Title>Report Details - {report.problem_type}</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
                <Row>
                    <Col md={6}>
                        <h5>Location</h5>
                        <div style={{ height: '300px', width: '100%' }}>
                            {hasValidCoordinates ? (
                                <MapContainer 
                                    center={[report.location.coordinates[1], report.location.coordinates[0]]} 
                                    zoom={15} 
                                    style={{ height: '100%', width: '100%' }}
                                    ref={mapRef}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[report.location.coordinates[1], report.location.coordinates[0]]}>
                                        <Popup>{report.problem_type}</Popup>
                                    </Marker>
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
                        <img src={report.image_url} alt={report.problem_type} className="img-fluid rounded" style={{ maxHeight: '300px', objectFit: 'cover' }} />
                    </Col>
                </Row>
                <hr />
                <h5>Details</h5>
                <p><strong>Description:</strong> {report.description || 'No description provided.'}</p>
                <p><strong>Current Status:</strong> <Badge bg={getStatusBadge(report.status)}>{report.status}</Badge></p>
                <p><strong>Submitted At:</strong> {new Date(report.created_at).toLocaleString()}</p>
                <p><strong>Department:</strong> {departmentName}</p>
                <p><strong>Ward No.:</strong> {report.ward_no || 'N/A'}</p>
                <p><strong>Number of Submissions:</strong> {report.nos || 1}</p>
            </Modal.Body>
            <Modal.Footer>
                <div className="w-100 d-flex flex-wrap justify-content-between align-items-center">
                    <div className="d-flex flex-grow-1 mb-2 mb-md-0 me-md-3">
                         <Form.Group as={Row} className="align-items-center flex-grow-1">
                            <Form.Label column sm="auto" className="pe-2">Department:</Form.Label>
                            <Col>
                                <Form.Select size="sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                                    <option value="">Unassigned</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                        </Form.Group>
                         <Form.Group as={Row} className="align-items-center flex-grow-1 ms-3">
                            <Form.Label column sm="auto" className="pe-2">Status:</Form.Label>
                            <Col>
                                <Form.Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                                    <option value="submitted">Submitted</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="rejected">Rejected</option>
                                </Form.Select>
                            </Col>
                        </Form.Group>
                    </div>
                    <div className="d-flex align-items-center">
                        {updateError && <span className="text-danger me-3">{updateError}</span>}
                        <Button variant="secondary" onClick={onClose} className="me-2">
                            Close
                        </Button>
                        <Button variant="primary" onClick={handleUpdate}>
                            Save Changes
                        </Button>
                    </div>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default ReportDetailModal;

