import React from 'react';
import { NavLink } from 'react-router-dom';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';

const AdminLayout = ({ children }) => {
  // AuthContext and logout removed for demo/no-auth mode
  const handleLogout = () => {
    // No-op for logout in demo mode
    window.location.reload();
  };

  return (
    <div className="d-flex flex-column vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand href="/">NagarSeva Admin</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto"> {/* MODIFIED: Changed ms-auto to me-auto */}
            <Nav.Link as={NavLink} to="/" end>Escalated Reports</Nav.Link>
            {/* ADDED: Link to the new Analytics Page */}
            <Nav.Link as={NavLink} to="/analytics">Analytics</Nav.Link>
          </Nav>
          <Nav className="ms-auto"> {/* ADDED: New Nav for the dropdown */}
            <NavDropdown title="Admin" id="basic-nav-dropdown">
              <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
            </NavDropdown>
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