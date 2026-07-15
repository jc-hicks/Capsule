import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import Container from "react-bootstrap/Container";

import IndexPage from "./pages/IndexPage.jsx";
import CapsuleDetailPage from "./pages/CapsuleDetailPage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Container>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="/capsules/:id" element={<CapsuleDetailPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Container>
    </BrowserRouter>
  </React.StrictMode>
);
