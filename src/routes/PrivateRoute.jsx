import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  // Saat auth masih loading, tampilkan loader
  if (loading) {
    return <div className="text-center p-8 text-gray-600">Loading...</div>;
  }

  // Belum login
  if (!user) {
    return <Navigate to="/" />;
  }

  // Role tidak sesuai
  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;
