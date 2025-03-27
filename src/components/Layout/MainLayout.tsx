import React, { ReactNode, useState } from "react";
import CourseList from "../Sidebar/CourseList";
import { useAuth } from "../../contexts/AuthContext";
import {
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { currentUser, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 relative">
      {/* Mobile header with toggle */}
      <header className="sm:hidden fixed top-0 left-0 right-0 z-40 w-full flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open courses"
          className="p-2"
        >
          <FaBars className="text-xl" />
        </button>
        <div />
        {currentUser && (
          <button onClick={signOut} aria-label="Sign Out" className="p-2">
            <FaSignOutAlt className="text-xl" />
          </button>
        )}
      </header>
      {/* Add padding for fixed header on mobile */}
      <div className="sm:hidden h-16"></div>

      {/* Mobile bottom sheet for courses */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black opacity-50 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="fixed bottom-0 left-0 right-0 z-50 w-full bg-white p-5 shadow-lg rounded-t-lg sm:hidden">
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-semibold">Courses</h4>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close courses"
                className="p-2"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-60 px-2">
              <CourseList />
            </div>
          </div>
        </>
      )}

      {/* Desktop sidebar */}
      <div
        className={`hidden sm:flex flex-col transition-all duration-300 ease-in-out 
          ${sidebarOpen ? "w-64" : "w-16"} 
          h-screen bg-white border-r border-gray-200 shadow-sm`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          {sidebarOpen && <h2 className="text-xl font-bold">Courses</h2>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`text-gray-500 hover:text-gray-700 p-2 rounded-md hover:bg-gray-100 ${
              !sidebarOpen ? "mx-auto" : ""
            }`}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        </div>
        <div
          className={`flex-grow overflow-y-auto ${
            !sidebarOpen ? "hidden" : "px-3 py-4"
          }`}
        >
          <CourseList />
        </div>
        {currentUser && !sidebarOpen && (
          <button
            onClick={signOut}
            className="mx-auto my-5 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Sign Out"
          >
            <FaSignOutAlt />
          </button>
        )}
        {currentUser && sidebarOpen && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 p-4 my-2 mx-3 text-gray-500 hover:text-gray-700 border-t border-gray-200 hover:bg-gray-100 rounded-md"
          >
            <FaSignOutAlt />
            <span>Sign Out</span>
          </button>
        )}
      </div>

      {/* Main content */}
      <main
        className={`flex-grow transition-all duration-300 ease-in-out overflow-auto p-6 sm:p-8`}
      >
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
