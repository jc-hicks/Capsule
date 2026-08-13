import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Spinner from "react-bootstrap/Spinner";

import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/palette.css";

import AppLayout from "./components/AppLayout.jsx";

const IndexPage = lazy(() => import("./pages/IndexPage.jsx"));
const CapsuleDetailPage = lazy(() => import("./pages/CapsuleDetailPage.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));

const RouteFallback = () => (
  <div className="route-fallback">
    <Spinner animation="border" role="status">
      <span className="visually-hidden">Loading…</span>
    </Spinner>
  </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<IndexPage />} />
            <Route path="/capsules/:id" element={<CapsuleDetailPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
