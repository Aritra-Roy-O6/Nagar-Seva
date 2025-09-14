import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

const RegisterPage = () => {
  const { districts } = useContext(AuthContext); // Get districts from context
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password || !districtId || !secretKey) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/auth/admin/register', {
        name: fullName,
        email,
        password,
        districtId: parseInt(districtId), // Send the ID, not the name
        secretKey,
        role: 'general', // Default role for new admins
      });
      alert('Admin user created successfully! Please proceed to login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card p-4 shadow" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="card-body">
          <h2 className="card-title text-center mb-4">Create Admin Account</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="district" className="form-label">District</label>
              <select id="district" className="form-select" value={districtId} onChange={(e) => setDistrictId(e.target.value)} required>
                <option value="" disabled>Select a District</option>
                {districts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="fullName" className="form-label">Full Name</label>
              <input id="fullName" type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input id="email" type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label htmlFor="secretKey" className="form-label">Admin Secret Key</label>
              <input id="secretKey" type="password" className="form-control" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} required />
            </div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button type="submit" className="btn btn-primary w-100" disabled={loading}>
              {loading ? 'Registering...' : 'Create Account'}
            </button>
            <p className="text-center mt-3">
              Already have an account? <Link to="/login">Login here</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

