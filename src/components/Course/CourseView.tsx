// src/components/Course/CourseView.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  doc,
  collection,
  query,
  onSnapshot,
  orderBy,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
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
import "react-tooltip/dist/react-tooltip.css"; // Tooltip CSS

import AssignmentTable from "./AssignmentTable";
import GradeDisplay from "./GradeDisplay";
import GroupManager from "./GroupManager";
import GradeCutoffsEditor from "./GradeCutoffsEditor";

const CourseView: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isEditingCourseName, setIsEditingCourseName] = useState(false);

  const handleCourseNameBlur = () => {
    setIsEditingCourseName(false);
  };

  // --- Data Fetching Effect ---
  useEffect(() => {
    if (!currentUser || !courseId) {
      setLoading(false);
      setError("Invalid user or course ID.");
      return; // Exit if user/courseId invalid
    }

    setLoading(true); // Start loading
    setError(null); // Clear previous errors
    const coursePath = `users/${currentUser.uid}/courses/${courseId}`;
    let listeners: (() => void)[] = []; // To store unsubscribe functions

    try {
      // Listener for Course Details (name, cutoffs)
      const courseUnsub = onSnapshot(
        doc(db, coursePath),
        (docSnap) => {
          // Success callback
          if (docSnap.exists()) {
            setCourse({ id: docSnap.id, ...docSnap.data() } as Course);
          } else {
            // Course not found or user doesn't have access
            console.warn(
              `Course ${courseId} not found for user ${currentUser.uid}`
            );
            setError("Course not found or access denied.");
            setCourse(null);
            setAssignments([]);
            setGroups([]); // Clear data
            navigate("/", { replace: true }); // Redirect to home
          }
        },
        (err) => {
          // Error callback
          console.error("Error fetching course details:", err);
          setError("Failed to load course details.");
          // Potentially set loading false here if this is critical path
        }
      );
      listeners.push(courseUnsub); // Add unsubscribe function to array

      // Listener for Assignments subcollection
      const assignmentsCol = collection(db, coursePath, "assignments");
      const assignmentsQuery = query(
        assignmentsCol,
        orderBy("createdAt", "asc")
      ); // Order assignments
      const assignmentsUnsub = onSnapshot(
        assignmentsQuery,
        (snapshot) => {
          // Success callback
          setAssignments(
            snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as Assignment)
            )
          );
          setLoading(false); // Mark loading as complete *after* assignments load (or primary data)
        },
        (err) => {
          // Error callback
          console.error("Error fetching assignments:", err);
          setError("Failed to load assignments.");
          setLoading(false); // Stop loading on error too
        }
      );
      listeners.push(assignmentsUnsub);

      // Listener for Assignment Groups subcollection
      const groupsCol = collection(db, coursePath, "assignmentGroups");
      const groupsQuery = query(groupsCol, orderBy("createdAt", "asc")); // Order groups
      const groupsUnsub = onSnapshot(
        groupsQuery,
        (snapshot) => {
          // Success callback
          setGroups(
            snapshot.docs.map(
              (doc) => ({ id: doc.id, ...doc.data() } as AssignmentGroup)
            )
          );
        },
        (err) => {
          // Error callback
          console.error("Error fetching assignment groups:", err);
          setError((prev) =>
            prev ? `${prev}\nFailed to load groups.` : "Failed to load groups."
          ); // Append error if one exists
          // Don't necessarily stop loading here, depends if groups are optional display
        }
      );
      listeners.push(groupsUnsub);
    } catch (err) {
      // Catch errors during listener setup itself
      console.error("Error setting up Firestore listeners:", err);
      setError("An unexpected error occurred while loading course data.");
      setLoading(false);
    }

    // Cleanup function: Unsubscribe from all listeners when component unmounts or dependencies change
    return () => {
      console.log(
        "Unsubscribing from Firestore listeners for course:",
        courseId
      );
      listeners.forEach((unsub) => unsub());
    };
  }, [currentUser, courseId, navigate]); // Effect dependencies

  // --- Memoized Calculations ---
  const courseData: CourseDataForCalc | null = useMemo(() => {
    if (!course) return null;
    const safeCutoffs = course.gradeCutoffs || []; // Ensure cutoffs array exists
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

  // --- Callback for Saving Grade Cutoffs ---
  const handleSaveCutoffs = useCallback(
    async (newCutoffs: GradeCutoff[]) => {
      if (!currentUser || !courseId || !course) {
        console.error(
          "Cannot save cutoffs: Missing user, courseId, or course data."
        );
        alert("Could not save cutoffs. Please try again.");
        return;
      }
      const courseRef = doc(db, `users/${currentUser.uid}/courses/${courseId}`);
      try {
        await updateDoc(courseRef, { gradeCutoffs: newCutoffs });
        // Firestore listener will update local state automatically
      } catch (err) {
        console.error("Error updating grade cutoffs:", err);
        alert("Failed to save grade cutoffs.");
      }
    },
    [currentUser, courseId, course]
  ); // Dependencies for the callback

  // --- Callback for Deleting Course ---
  const handleDeleteCourse = useCallback(async () => {
    // Guards and confirmation
    if (
      !currentUser ||
      !courseId ||
      !course ||
      isDeletingCourse ||
      !window.confirm(
        `Are you sure you want to permanently delete the course "${course.name}" and all its data? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeletingCourse(true); // Indicate deletion in progress
    setError(null); // Clear previous errors
    try {
      // Get reference to the course document
      const courseRef = doc(db, `users/${currentUser.uid}/courses/${courseId}`);

      // WARNING: Direct client-side deletion of subcollections is often discouraged for large datasets
      // as it can be slow, hit rate limits, or fail partially.
      // A Firebase Cloud Function triggered by the course document deletion is the robust solution.
      // For simplicity here, we only delete the main course document. Subcollections become orphaned.
      /*
            // --- Optional: Client-side subcollection delete (use with caution) ---
            console.log("Attempting to delete subcollections (assignments, groups)...");
            const batch = writeBatch(db);
            const assignmentsCol = collection(db, courseRef.path, 'assignments');
            const groupsCol = collection(db, courseRef.path, 'assignmentGroups');
            const assignmentsSnapshot = await getDocs(assignmentsCol); // Fetch docs to delete
            const groupsSnapshot = await getDocs(groupsCol);       // Fetch docs to delete
            assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));
            groupsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit(); // Commit batch deletion of subcollections
            console.log("Subcollections deleted (if any).");
            // --- End Optional Subcollection Delete ---
            */

      // Delete the main course document
      await deleteDoc(courseRef);
      console.log("Course document deleted:", courseId);

      // Navigate user away after successful deletion
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error deleting course:", err);
      setError("Failed to delete the course. Please try again.");
      setIsDeletingCourse(false); // Reset deletion state only on error
    }
    // No need to setLoading(false) on success, as navigation occurs.
  }, [currentUser, courseId, course, navigate, isDeletingCourse]); // Dependencies for the callback

  // Add a new callback for updating the course name
  const handleCourseNameChange = useCallback(
    async (newName: string) => {
      if (!currentUser || !courseId || !course) return;
      try {
        const courseRef = doc(
          db,
          `users/${currentUser.uid}/courses/${courseId}`
        );
        await updateDoc(courseRef, { name: newName.trim() });
      } catch (err) {
        console.error("Error updating course name:", err);
        alert("Failed to update course name.");
      }
    },
    [currentUser, courseId, course]
  );

  // --- Render Logic ---
  if (loading)
    return (
      <div className="text-center text-gray-500 py-10">
        Loading course data...
      </div>
    );
  if (error)
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4"
        role="alert"
      >
        {error}
      </div>
    );
  if (!course || !courseId) {
    return (
      <div
        className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative my-4"
        role="alert"
      >
        Course data not available or invalid ID.
      </div>
    );
  }

  // Tooltip content string
  const groupInfoTooltipContent =
    "Assignment groups let you categorize assignments (like Homework, Exams). Each group gets an overall weight towards the final grade. Assignments within a group share that group's weight, either equally or based on manual 'Weight in Group' values.";

  // Main component render
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
            {" "}
            Assignment Groups
            <span
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              data-tooltip-id="group-info-tooltip"
              data-tooltip-content={groupInfoTooltipContent}
              data-tooltip-place="top"
            >
              {" "}
              <FaInfoCircle />{" "}
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
            {" "}
            Grade Cutoffs{" "}
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
