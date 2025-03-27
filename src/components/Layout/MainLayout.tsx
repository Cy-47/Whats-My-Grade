// src/components/Layout/MainLayout.tsx
import React, { ReactNode } from "react";
import CourseList from "../Sidebar/CourseList";
import { useAuth } from "../../contexts/AuthContext";
import { FaSignOutAlt } from "react-icons/fa";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentUser, signOut } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      <aside className="w-60 md:w-64 flex-shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col shadow-sm relative">
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
        <div className="flex-grow overflow-y-auto -mr-4 pr-4">
          {" "}
          {/* Scroll container */}
          <CourseList />
        </div>
      </aside>
      <main className="flex-grow p-5 sm:p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {" "}
          {/* Content max width */}
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
