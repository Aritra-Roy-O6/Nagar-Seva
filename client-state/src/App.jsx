import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Page and Component Imports
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage'; // Import the new Login Page
import DashboardPage from './pages/DashboardPage';
import EscalatedReportsPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import StateAdminRegisterPage from './pages/RegisterPage';

// A component to protect routes that require authentication
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useContext(AuthContext);
    if (loading) return <div>Loading...</div>; // Or a spinner component
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const App = () => {
    const { user, isAuthenticated } = useContext(AuthContext);

    return (
        <Routes>
            {/* Public routes like login and registration */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-state-admin" element={<StateAdminRegisterPage />} />

            {/* Protected Admin Routes */}
            <Route 
                path="/*" 
                element={
                    <ProtectedRoute>
                        <AdminLayout>
                            <Routes>
                                {isAuthenticated && user?.role === 'state_admin' ? (
                                    <>
                                        <Route path="/" element={<EscalatedReportsPage />} />
                                        <Route path="/analytics" element={<AnalyticsPage />} />
                                    </>
                                ) : (
                                    <>
                                        <Route path="/" element={<DashboardPage />} />
                                    </>
                                )}
                                {/* Redirect any unknown protected path to the default dashboard */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </AdminLayout>
                    </ProtectedRoute>
                } 
            />
        </Routes>
    );
}

export default App;