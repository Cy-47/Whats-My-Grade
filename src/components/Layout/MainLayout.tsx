import React, { ReactNode, useState } from "react";
import CourseList from "../Sidebar/CourseList";
import { useAuth } from "../../contexts/AuthContext";
import { FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentUser, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 relative">
      {/* Mobile header with toggle */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open courses">
          <FaBars className="text-xl" />
        </button>
        {/* Removed Courses text */}
        <div />
        {currentUser && (
          <button onClick={signOut} aria-label="Sign Out">
            <FaSignOutAlt className="text-xl" />
          </button>
        )}
      </header>
      {/* Add padding for fixed header on mobile */}
      <div className="md:hidden h-16"></div>

      {/* Mobile bottom sheet for courses */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black opacity-50"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white p-4 shadow-lg rounded-t-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Courses</h4>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close courses"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-60">
              <CourseList />
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0 w-60 xl:w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-sm ">
        <div className="mb-4 pb-3 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-800">Courses</h4>
          {currentUser && (
            <div className="mt-1.5 text-xs text-gray-500 flex justify-between items-center gap-1">
              <span
                className="truncate flex-grow mr-2"
                title={currentUser.displayName || currentUser.email || "User"}
              >
                {currentUser.displayName || currentUser.email || "User"}
              </span>
              <button
                onClick={signOut}
                className="flex-shrink-0 p-1 text-gray-500 hover:text-red-600 rounded hover:bg-red-50 transition focus:outline-none focus:ring-1 focus:ring-red-400"
                title="Sign Out"
              >
                <FaSignOutAlt className="h-4 w-4" />
                <span className="sr-only">Sign Out</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex-grow overflow-y-auto">
          <CourseList />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-grow p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
