
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
          <Nav className="ms-auto">
            <Nav.Link as={NavLink} to="/" end>Dashboard</Nav.Link>
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

