// src/App.tsx
import React, { JSX } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Auth/Login";
import MainLayout from "./components/Layout/MainLayout";
import CourseView from "./components/Course/CourseView";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CourseView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SelectCourseMessage />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

const ProtectedRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: JSX.Element }> = ({ children }) => {
  const { currentUser } = useAuth();
  return !currentUser ? children : <Navigate to="/" replace />;
};

const SelectCourseMessage: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg shadow-md border border-gray-200">
    <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome!</h2>
    <p className="text-gray-500 max-w-sm">
      Select a course from the sidebar, or create a new one using the form below
      the list, to start tracking your grades.
    </p>
  </div>
);

export default App;
