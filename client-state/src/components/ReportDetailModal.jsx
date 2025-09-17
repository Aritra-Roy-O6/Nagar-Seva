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
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [updateError, setUpdateError] = useState('');
    const [imageError, setImageError] = useState(false);
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
            setImageError(false); // Reset image error when new report loads
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

    const handleImageError = () => {
        setImageError(true);
    };

    // Data validation check
    if (!report) {
        return null;
    }
    const hasValidCoordinates = report && report.location && Array.isArray(report.location.coordinates) && report.location.coordinates.length >= 2;
    const hasValidImage = report.image_url && !imageError;

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

    const formatImageTimestamp = (timestamp) => {
        if (!timestamp) return '';
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return '';
        }
    };

    return (
        <Modal show={show} onHide={onClose} size="xl" centered onEntered={handleMapResize}>
            <Modal.Header closeButton>
                <Modal.Title>Report Details - {report.problem_type || report.problem}</Modal.Title>
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
                                        <Popup>{report.problem_type || report.problem}</Popup>
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
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0">Submitted Image</h5>
                            {hasValidImage && report.image_created_at && (
                                <small className="text-muted">
                                    Image from: {formatImageTimestamp(report.image_created_at)}
                                </small>
                            )}
                        </div>
                        <div style={{ height: '300px', width: '100%' }} className="border rounded">
                            {hasValidImage ? (
                                <img 
                                    src={report.image_url} 
                                    alt={report.problem_type || report.problem} 
                                    className="img-fluid rounded h-100 w-100" 
                                    style={{ objectFit: 'cover' }}
                                    onError={handleImageError}
                                />
                            ) : (
                                <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-light text-muted">
                                    <i className="bi bi-image" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                                    <span>
                                        {report.image_url ? 'Failed to load image' : 'No image available'}
                                    </span>
                                    {report.nos > 1 && !report.image_url && (
                                        <small className="mt-2 text-center">
                                            This merged report contains {report.nos} submissions,<br />
                                            but none included an image.
                                        </small>
                                    )}
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>
                <hr />
                <h5>Details</h5>
                <Row>
                    <Col md={6}>
                        <p><strong>Current Status:</strong> <Badge bg={getStatusBadge(report.status)}>{report.status}</Badge></p>
                        <p><strong>Report Created:</strong> {new Date(report.created_at).toLocaleString()}</p>
                        <p><strong>Last Updated:</strong> {new Date(report.updated_at).toLocaleString()}</p>
                    </Col>
                    <Col md={6}>
                        <p><strong>Department:</strong> {departmentName}</p>
                        <p><strong>Ward No.:</strong> {report.ward || 'N/A'}</p>
                        <p><strong>Number of Submissions:</strong> 
                            <Badge bg="info" className="ms-2">{report.nos || 1}</Badge>
                            
                        </p>
                    </Col>
                </Row>
                
                {/* Description section */}
                {report.description && (
                    <>
                        <hr />
                        <h6>Description</h6>
                        <p className="text-muted">{report.description}</p>
                    </>
                )}
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