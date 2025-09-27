// ──────────────────────────────────────────────
// src/App.jsx
// ──────────────────────────────────────────────
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

/* ---------- AUTH ---------- */
import LoginPage from "./pages/auth/LoginPage";

/* ---------- DASHBOARD WRAPPERS ---------- */
import AdminDashboard from "./pages/admin/AdminDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import PrivateRoute from "./routes/PrivateRoute";

/* ---------- ADMIN PAGES ---------- */
import Home from "./pages/admin/Home";
import BookList from "./pages/admin/BookList";
import StudentList from "./pages/admin/StudentList";
import RecommendationPage from "./pages/admin/RecommendationPage";
import BorrowList from "./pages/admin/BorrowList";
import BorrowHistory from "./pages/admin/BorrowHistory";
import RecommendationBatchesPage from "./pages/admin/RecommendationBatchesPage";

/* ---------- STUDENT PAGES ---------- */
import DashboardContent from "./pages/student/DashboardContent"; // Import DashboardContent
import StudentBooksPage from "./pages/student/StudentBooksPage"; // Buat komponen ini
import StudentHistoryPage from "./pages/student/StudentHistoryPage"; // Buat komponen ini

const App = () => (
  <>
    {/* ------------------ ROUTING ------------------ */}
    <Routes>
      {/* PUBLIC */}
      <Route path="/" element={<LoginPage />} />

      {/* ADMIN */}
      <Route
        path="/admin"
        element={
          <PrivateRoute role="admin">
            <AdminDashboard />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="books" element={<BookList />} />
        <Route path="students" element={<StudentList />} />
        <Route path="recommendation" element={<RecommendationPage />} />
        <Route path="borrows" element={<BorrowList />} />
        <Route path="history" element={<BorrowHistory />} />
        <Route path="recommendation-batches" element={<RecommendationBatchesPage />} />
      </Route>

      {/* STUDENT */}
      <Route
        path="/student"
        element={
          <PrivateRoute role="student">
            <StudentDashboard />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardContent />} />
        <Route path="books" element={<StudentBooksPage />} />
        <Route path="history" element={<StudentHistoryPage />} />
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="p-8 text-red-500">
            404 – Halaman tidak ditemukan
          </div>
        }
      />
    </Routes>

    {/* ------------------ GLOBAL TOAST ------------------ */}
    <Toaster
      position="top-right"
      toastOptions={{ duration: 3000 }}
    />
  </>
);

export default App;