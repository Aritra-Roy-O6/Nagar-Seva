import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EscalatedReportsPage from './pages/DashboardPage';
import AdminLayout from './components/AdminLayout';
// ADDED: Import the new AnalyticsPage component
import AnalyticsPage from './pages/AnalyticsPage'; 

function App() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<EscalatedReportsPage />} />
        {/* ADDED: Route for the new Analytics Page */}
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default App;