// src/pages/student/StudentDashboard.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../../components/student/StudentSidebar';

const StudentDashboard = () => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <StudentSidebar />
      
      {/* Tambahkan padding di sini */}
      <div className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};

export default StudentDashboard;