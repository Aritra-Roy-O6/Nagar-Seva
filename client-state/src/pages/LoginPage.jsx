import React, { useState, useContext } from 'react';
import { Form, Button, Container, Card, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        identifier: '',
        password: '',
        userType: 'admin', // Default to 'admin' (District Admin)
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
            login(token); // Use the login function from AuthContext
            navigate('/'); // Redirect to the appropriate dashboard
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
                    <h3 className="text-center mb-4">Admin Portal Login</h3>
                    {error && <Alert variant="danger">{error}</Alert>}
                    
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label><strong>Login As</strong></Form.Label>
                            <div>
                                <Form.Check
                                    inline
                                    type="radio"
                                    label="District Admin"
                                    name="userType"
                                    value="admin"
                                    id="userType-admin"
                                    checked={formData.userType === 'admin'}
                                    onChange={handleChange}
                                />
                                <Form.Check
                                    inline
                                    type="radio"
                                    label="State Admin"
                                    name="userType"
                                    value="state_admin"
                                    id="userType-state_admin"
                                    checked={formData.userType === 'state_admin'}
                                    onChange={handleChange}
                                />
                            </div>
                        </Form.Group>

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
                </Card.Body>
            </Card>
        </Container>
    );
};

export default LoginPage;