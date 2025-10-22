// src/pages/student/StudentDashboard.jsx (HANYA MENGUBAH BARIS INI)
import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../../components/student/StudentSidebar';

const StudentDashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <StudentSidebar />
      
      {/* ❌ Hapus 'p-8' dari sini */}
      {/* ✅ PERBAIKAN: Hanya pertahankan pl-64 (untuk mengimbangi sidebar) */}
      <div className="flex-1 pl-64 overflow-y-auto"> 
        <Outlet />
      </div>
      
    </div>
  );
};

export default StudentDashboard;