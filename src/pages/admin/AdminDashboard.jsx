// src/pages/admin/AdminDashboard.jsx
import { Outlet } from "react-router-dom";
import AdminSidebar from "../../components/admin/AdminSidebar";

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <AdminSidebar />

      {/* main scrollable area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
