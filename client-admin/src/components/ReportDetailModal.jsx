import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Row, Col, Form, Badge, Image, Carousel } from 'react-bootstrap';
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
    const mapRef = useRef(null);

    // Effect to fetch the departments list
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const { data } = await apiClient.get('/departments');
                setDepartments(data);
            } catch (error) {
                console.error("Failed to fetch departments", error);
            }
        };
        fetchDepartments();
    }, []);

    // Effect to update the modal's state when a new report is selected
    useEffect(() => {
        if (report) {
            setStatus(report.status || 'submitted');
            setDepartmentId(report.department_id || '');
            setUpdateError('');

            // Recenter the map when the report changes
            if (mapRef.current && report.latitude && report.longitude) {
                mapRef.current.setView([report.latitude, report.longitude], 15);
            }
        }
    }, [report]);

    const handleUpdate = async () => {
        if (!departmentId) {
            setUpdateError('Please assign a department.');
            return;
        }
        try {
            const { data } = await apiClient.put(`/admin/reports/${report.id}`, {
                status,
                department_id: departmentId,
            });
            onUpdate(data);
            onClose();
        } catch (error) {
            console.error("Failed to update report", error);
            setUpdateError('Update failed. Please try again.');
        }
    };
    
    if (!report) return null;

    const statusVariant = (status) => {
        switch (status) {
            case 'submitted': return 'primary';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            case 'rejected': return 'danger';
            default: return 'secondary';
        }
    };
    
    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton>
                <Modal.Title>Report #{report.id} - {report.problem}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row>
                    <Col md={6}>
                        <h5>Details</h5>
                        <p><strong>Problem:</strong> {report.problem}</p>
                        <p><strong>District:</strong> {report.district}</p>
                        <p><strong>Ward:</strong> {report.ward || 'N/A'}</p>
                        <p><strong>Department:</strong> {report.department_name || 'Not Assigned'}</p>
                        <p><strong>Status:</strong> <Badge bg={statusVariant(report.status)}>{report.status}</Badge></p>
                        <p><strong>No. of Reports:</strong> {report.nos}</p>
                        <p><strong>Last Updated:</strong> {new Date(report.updated_at).toLocaleString()}</p>
                        
                        {report.image_urls && report.image_urls.length > 0 && (
                            <div className="mt-3">
                                <h5>Images</h5>
                                <Carousel>
                                    {report.image_urls.map((url, index) => (
                                        <Carousel.Item key={index}>
                                            <Image src={url} alt={`Report Image ${index + 1}`} fluid thumbnail />
                                        </Carousel.Item>
                                    ))}
                                </Carousel>
                            </div>
                        )}
                    </Col>
                    <Col md={6}>
                        <h5>Location</h5>
                         {report.latitude && report.longitude ? (
                            <MapContainer 
                                center={[report.latitude, report.longitude]} 
                                zoom={15} 
                                style={{ height: '300px', width: '100%' }}
                                whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                <Marker position={[report.latitude, report.longitude]}>
                                    <Popup>
                                        Report Location
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        ) : (
                            <p>Location data is not available for this report.</p>
                        )}
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                 <div className="d-flex justify-content-between align-items-center w-100">
                    <div className="d-flex flex-grow-1">
                        <Form.Group as={Row} className="align-items-center flex-grow-1">
                            <Form.Label column sm="auto" className="pe-2">Department:</Form.Label>
                            <Col>
                                <Form.Select size="sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                                    <option value="">Select Department</option>
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