// src/components/Sidebar/CourseList.tsx
import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Course, GradeCutoff } from "../../types";
import { Link, useParams, useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

const defaultGradeCutoffs: GradeCutoff[] = [
  { id: "cutoff-a", grade: "A", minPercentage: 90 },
  { id: "cutoff-b", grade: "B", minPercentage: 80 },
  { id: "cutoff-c", grade: "C", minPercentage: 70 },
  { id: "cutoff-d", grade: "D", minPercentage: 60 },
  { id: "cutoff-f", grade: "F", minPercentage: 0 },
];

/**
 * CourseList Component
 *
 * Sidebar component that displays a list of the user's courses
 * and provides functionality to add new courses.
 *
 * Features:
 * - Real-time course listing from Firestore
 * - Add new courses
 * - Navigate between courses
 * - Default grade cutoffs for new courses
 */

/**
 * Component for displaying and managing the user's course list.
 */
const CourseList: React.FC = () => {
  const { currentUser } = useAuth();
  const { courseId: activeCourseId } = useParams<{ courseId?: string }>();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCourseName, setNewCourseName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    const coursesCol = collection(db, "users", currentUser.uid, "courses");
    const q = query(coursesCol, orderBy("name", "asc")); // Order by name

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedCourses: Course[] = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Course)
        );
        setCourses(fetchedCourses);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching courses:", err);
        setError("Failed to load courses.");
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [currentUser]);

  /**
   * Handles the form submission to add a new course.
   * Creates a new course document in Firestore and navigates to it.
   */
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newCourseName.trim() || isAdding) return;
    setIsAdding(true);
    setAddError(null);
    try {
      const coursesCol = collection(db, "users", currentUser.uid, "courses");
      const newCourseRef = await addDoc(coursesCol, {
        name: newCourseName.trim(),
        userId: currentUser.uid,
        gradeCutoffs: defaultGradeCutoffs,
        createdAt: serverTimestamp(),
      });
      setNewCourseName("");
      navigate(`/courses/${newCourseRef.id}`);
    } catch (err) {
      console.error("Error adding course:", err);
      setAddError("Failed to add course.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col">
      {loading && (
        <div className="text-sm text-gray-500 px-2 py-1 animate-pulse">
          Loading courses...
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-100 border border-red-300 rounded p-2 my-1">
          {error}
        </div>
      )}
      <ul className="space-y-1 mb-3">
        {!loading && courses.length === 0 && !error && (
          <p className="text-sm text-gray-500 italic px-2 py-1">
            No courses yet.
          </p>
        )}
        {courses.map((course) => (
          <li key={course.id}>
            <Link
              to={`/courses/${course.id}`}
              title={course.name}
              className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-100 truncate ${
                course.id === activeCourseId
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              {" "}
              {course.name}{" "}
            </Link>
          </li>
        ))}
      </ul>
      <form
        onSubmit={handleAddCourse}
        className="mt-auto pt-3 border-t border-gray-200"
      >
        <label htmlFor="new-course-name" className="sr-only">
          New Course Name
        </label>
        <div className="flex items-center space-x-2">
          <input
            id="new-course-name"
            type="text"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="New Course Name"
            required
            disabled={isAdding}
            className="flex-grow px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!newCourseName.trim() || isAdding}
            className="flex-shrink-0 inline-flex items-center justify-center p-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title="Add Course"
          >
            {isAdding ? (
              <svg className="animate-spin h-4 w-4 text-white" /*...*/>
                {" "}
                {/* Spinner SVG */}{" "}
              </svg>
            ) : (
              <FaPlus className="h-4 w-4" />
            )}
            <span className="sr-only">Add Course</span>
          </button>
        </div>
        {addError && <p className="text-xs text-red-600 mt-1">{addError}</p>}
      </form>
    </div>
  );
};

export default CourseList;
