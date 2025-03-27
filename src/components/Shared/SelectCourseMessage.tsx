// src/components/Shared/SelectCourseMessage.tsx
import React from "react";

const SelectCourseMessage: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white rounded-lg shadow-md border border-gray-200">
    {/* Optional: Add an icon/illustration */}
    {/* <svg ... className="w-16 h-16 text-blue-300 mb-4" ...> */}
    <h2 className="text-xl font-semibold text-gray-700 mb-2">Welcome!</h2>
    <p className="text-gray-500 max-w-sm">
      Select a course from the sidebar, or create a new one using the form below
      the list, to start tracking your grades.
    </p>
  </div>
);

export default SelectCourseMessage;
