// src/components/student/StudentSidebar.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaBook, FaHistory, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const StudentSidebar = () => {
  const { logout } = useAuth();
  const baseClasses = "flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200";
  const activeClasses = "bg-blue-600 text-white shadow-md";
  const inactiveClasses = "text-gray-600 hover:bg-gray-200";

  return (
    <div className="w-64 h-screen bg-white shadow-lg p-6 flex flex-col justify-between">
      <div>
        {/* Logo dan Teks Aplikasi yang Disempurnakan */}
        <div className="text-2xl font-bold text-blue-600 border-b-2 border-gray-200 pb-4 mb-8">
          e-Perpus
        </div>

        {/* Link Navigasi */}
        <nav className="space-y-2">
          <NavLink
            to="/student"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
            end
          >
            <FaTachometerAlt className="text-xl" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/student/books"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <FaBook className="text-xl" />
            <span>Katalog Buku</span>
          </NavLink>

          <NavLink
            to="/student/history"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
            }
          >
            <FaHistory className="text-xl" />
            <span>Riwayat Peminjaman</span>
          </NavLink>
        </nav>
      </div>

      {/* Tombol Logout yang Disempurnakan */}
      <div className="mt-8">
        <button
          onClick={logout}
          className="w-full flex items-center space-x-3 p-3 rounded-lg text-red-500 hover:bg-red-100 transition-colors duration-200"
        >
          <FaSignOutAlt className="text-xl" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default StudentSidebar;