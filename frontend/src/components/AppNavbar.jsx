import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";

import "./AppNavbar.css";

export default function AppNavbar({ user, onLogout }) {
  return (
    <Navbar className="app-navbar" expand="sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="app-navbar-brand">
          Capsule
        </Navbar.Brand>
        {user && (
          <div className="app-navbar-user">
            <span className="app-navbar-name">Welcome, {user.name}</span>
            <Button variant="outline-secondary" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        )}
      </Container>
    </Navbar>
  );
}

AppNavbar.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string
  }),
  onLogout: PropTypes.func.isRequired
};
