import React, { useContext } from 'react'; // MODIFIED: Import useContext
import { NavLink } from 'react-router-dom';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { AuthContext } from '../context/AuthContext'; // MODIFIED: Import AuthContext

const AdminLayout = ({ children }) => {
  // MODIFIED: Get user and logout function from context
  const { user, logout } = useContext(AuthContext); 

  const handleLogout = () => {
    logout();
    // Redirect to login or home page after logout
    window.location.href = '/login'; // Or your login page route
  };

  return (
    <div className="d-flex flex-column vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand href="/">NagarSeva Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {/* MODIFIED: Conditional navigation links */}
            {user?.role === 'state_admin' ? (
              <>
                <Nav.Link as={NavLink} to="/" end>Escalated Reports</Nav.Link>
                <Nav.Link as={NavLink} to="/analytics">Analytics</Nav.Link>
              </>
            ) : (
              <Nav.Link as={NavLink} to="/" end>Dashboard</Nav.Link>
            )}
          </Nav>
          <Nav className="ms-auto">
            {user && (
              <NavDropdown title={user.name || 'Admin'} id="basic-nav-dropdown">
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            )}
          </Nav>
        </Navbar.Collapse>
      </Navbar>
      <main className="flex-grow-1 p-4 bg-light" style={{ overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;