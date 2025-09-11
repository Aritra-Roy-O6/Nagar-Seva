import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AdminLayout = ({ children }) => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // The parent container is now fixed to the viewport height to prevent the whole page from scrolling.
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div className="d-flex flex-column flex-shrink-0 p-3 text-white bg-dark" style={{ width: '280px' }}>
        <a href="/" className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
          <span className="fs-4">NagarSeva Admin</span>
        </a>
        <hr />
        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <NavLink to="/" className="nav-link text-white" end>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/map" className="nav-link text-white">
              Live Map
            </NavLink>
          </li>
        </ul>
        <hr />
        <button className="btn btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Main Content */}
      {/* This main area is now independently scrollable if its content overflows. */}
      <main className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;

