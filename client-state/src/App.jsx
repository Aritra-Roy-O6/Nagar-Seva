
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EscalatedReportsPage from './pages/DashboardPage';
import AdminLayout from './components/AdminLayout';


function App() {
  return (
    <AdminLayout>
      <Routes>
  <Route path="/" element={<EscalatedReportsPage />} />
      </Routes>
    </AdminLayout>
  );
}

export default App;

