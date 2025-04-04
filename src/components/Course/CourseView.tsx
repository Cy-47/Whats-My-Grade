// src/components/Course/CourseView.tsx
import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Course,
  Assignment,
  AssignmentGroup,
  GradeCutoff,
  CourseDataForCalc,
} from "../../types";
import {
  calculateOverallGrade,
  getLetterGrade,
} from "../../utils/gradeCalculations";
import { FaInfoCircle, FaTrash } from "react-icons/fa";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import { useCourseData } from "../../hooks/useFirestore";
import AssignmentTable from "./AssignmentTable";
import GradeDisplay from "./GradeDisplay";
import GroupManager from "./GroupManager";
import GradeCutoffsEditor from "./GradeCutoffsEditor";

/**
 * Main course view component that coordinates all course-related features.
 */
const CourseView: React.FC = () => {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isEditingCourseName, setIsEditingCourseName] = useState(false);

  // Use our custom hook for all data operations
  const {
    course,
    assignments,
    groups,
    loading,
    error,
    updateCourse,
    deleteCourse,
    updateGradeCutoffs,
  } = useCourseData(courseId);

  const handleCourseNameBlur = () => {
    setIsEditingCourseName(false);
  };

  // Memoized Calculations
  const courseData: CourseDataForCalc | null = useMemo(() => {
    if (!course) return null;
    const safeCutoffs = course.gradeCutoffs || [];
    return { assignments, groups, gradeCutoffs: safeCutoffs };
  }, [assignments, groups, course]);

  const overallPercentage = useMemo(() => {
    if (!courseData) return null;
    return calculateOverallGrade(courseData.assignments, courseData.groups);
  }, [courseData]);

  const letterGrade = useMemo(() => {
    if (overallPercentage === null || !courseData) return "-";
    return getLetterGrade(overallPercentage, courseData.gradeCutoffs);
  }, [overallPercentage, courseData]);

  const handleSaveCutoffs = useCallback(
    async (newCutoffs: GradeCutoff[]) => {
      const success = await updateGradeCutoffs(newCutoffs);
      if (!success) {
        alert("Failed to save grade cutoffs.");
      }
    },
    [updateGradeCutoffs]
  );

  const handleDeleteCourse = useCallback(async () => {
    if (
      !course ||
      isDeletingCourse ||
      !window.confirm(
        `Are you sure you want to permanently delete the course "${course.name}" and all its data? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeletingCourse(true);

    const success = await deleteCourse();

    if (success) {
      navigate("/", { replace: true });
    } else {
      setIsDeletingCourse(false);
      alert("Failed to delete the course. Please try again.");
    }
  }, [course, isDeletingCourse, deleteCourse, navigate]);

  const handleCourseNameChange = useCallback(
    async (newName: string) => {
      if (!course) return;
      const success = await updateCourse({ name: newName.trim() });
      if (!success) {
        alert("Failed to update course name.");
      }
    },
    [course, updateCourse]
  );

  // Render logic
  if (loading) {
    return (
      <div className="text-center text-gray-500 py-10">
        Loading course data...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!course) {
    return (
      <div
        className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative my-4"
        role="alert"
      >
        Course data not available or invalid ID.
      </div>
    );
  }

  // Tooltip content
  const groupInfoTooltipContent =
    "Assignment groups let you categorize assignments (like Homework, Exams). Each group gets an overall weight towards the final grade. Assignments within a group share that group's weight, either equally or based on manual 'Weight in Group' values.";

  // Main render
  return (
    <div className="space-y-8">
      {/* Course Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-200">
        {isEditingCourseName ? (
          <input
            type="text"
            value={course?.name || ""}
            onChange={(e) => handleCourseNameChange(e.target.value)}
            onBlur={handleCourseNameBlur}
            className="text-xl md:text-2xl font-bold text-gray-800 border border-gray-300 rounded px-2 py-1 flex-grow"
            placeholder="Course name"
            autoFocus
          />
        ) : (
          <div
            className="text-xl md:text-2xl font-bold text-gray-800 cursor-pointer px-2 py-1 hover:bg-gray-100 rounded"
            onClick={() => setIsEditingCourseName(true)}
            title="Click to edit course name"
          >
            {course?.name || "Untitled Course"}
          </div>
        )}
        <button
          onClick={handleDeleteCourse}
          disabled={isDeletingCourse}
          className="button-base button-danger button-small"
        >
          <FaTrash className="-ml-0.5 mr-1 h-4 w-4" />
          {isDeletingCourse ? "Deleting..." : "Delete Course"}
        </button>
      </div>

      {/* Overall Grade Display */}
      <GradeDisplay percentage={overallPercentage} letterGrade={letterGrade} />

      {/* Management Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Groups Section */}
        <div className="bg-white p-5 shadow rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
            Assignment Groups
            <span
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              data-tooltip-id="group-info-tooltip"
              data-tooltip-content={groupInfoTooltipContent}
              data-tooltip-place="top"
            >
              <FaInfoCircle />
            </span>
          </h3>
          <GroupManager
            courseId={courseId}
            groups={groups}
            assignments={assignments}
          />
        </div>

        {/* Grade Cutoffs Section */}
        <div className="bg-white p-5 shadow rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">
            Grade Cutoffs
          </h3>
          <GradeCutoffsEditor
            currentCutoffs={course.gradeCutoffs || []}
            onSave={handleSaveCutoffs}
          />
        </div>
      </div>

      {/* Assignments Table Section */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">
          Assignments
        </h3>
        <AssignmentTable
          courseId={courseId}
          assignments={assignments}
          groups={groups}
        />
      </div>

      {/* Tooltip Component Instance */}
      <Tooltip id="group-info-tooltip" className="z-50 max-w-xs text-sm" />
    </div>
  );
};

export default CourseView;
