import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Container from "react-bootstrap/Container";

import AppFooter from "./AppFooter.jsx";
import AppNavbar from "./AppNavbar.jsx";
import "./AppLayout.css";

// The auth screens are self-contained full-height cards, so the navbar would
// have nothing to navigate to and would fight their centered layout.
const CHROMELESS_ROUTES = ["/login", "/register"];

export default function AppLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState(null);

  const showChrome = !CHROMELESS_ROUTES.includes(pathname);

  useEffect(() => {
    // Nothing to show when the navbar is hidden, so skip the request entirely.
    if (!showChrome) return;

    let active = true;
    fetch("/api/auth/user", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data) setUser(data.user);
      })
      .catch(() => {
        // The pages themselves handle redirecting an unauthenticated visitor.
      });

    return () => {
      active = false;
    };
  }, [showChrome, pathname]);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    setUser(null);
    navigate("/login");
  }, [navigate]);

  return (
    <div className="app-shell">
      {showChrome && <AppNavbar user={user} onLogout={handleLogout} />}
      <Container className="app-main">
        <Outlet />
      </Container>
      {showChrome && <AppFooter />}
    </div>
  );
}
