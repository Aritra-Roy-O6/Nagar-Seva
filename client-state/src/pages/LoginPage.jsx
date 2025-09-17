import React, { useState, useContext } from 'react';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom'; // MODIFIED: Imported Link
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        userType: 'state_admin', // MODIFIED: Hardcoded to 'state_admin'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post('/auth/login', formData);
            const { token } = response.data;
            login(token); 
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <Card style={{ width: '400px' }} className="shadow-sm">
                <Card.Body>
                    <h3 className="text-center mb-4">State Admin Portal</h3> {/* MODIFIED: Title changed */}
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form onSubmit={handleSubmit}>
                        {/* REMOVED: The radio button selection for user type has been removed */}

                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control
                                type="email"
                                name="identifier"
                                value={formData.identifier}
                                onChange={handleChange}
                                required
                                placeholder="Enter your email"
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="Enter your password"
                            />
                        </Form.Group>

                        <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                            {loading ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                                    {' '}Logging In...
                                </>
                            ) : (
                                'Log In'
                            )}
                        </Button>
                    </Form>
                    
                    {/* ADDED: Link to the registration page */}
                    <div className="text-center mt-3">
                        <small className="text-muted">
                            Need to create an account?{' '}
                            <Link to="/register-state-admin">Register here</Link>
                        </small>
                    </div>

                </Card.Body>
            </Card>
        </Container>
    );
};

export default LoginPage;