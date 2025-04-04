import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { FirebaseService } from "../services/firebaseService";
import { Course, Assignment, AssignmentGroup, GradeCutoff } from "../types";

/**
 * Custom hook for course data management
 */
export function useCourseData(courseId: string) {
  const { currentUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load course data when component mounts
  useEffect(() => {
    if (!currentUser || !courseId) {
      setLoading(false);
      setError("Invalid user or course ID");
      return;
    }

    setLoading(true);
    setError(null);

    const userId = currentUser.uid;
    const unsubscribers: (() => void)[] = [];

    try {
      // Subscribe to course document
      const courseUnsubscribe = FirebaseService.subscribeToCourse(
        userId,
        courseId,
        (courseData) => {
          setCourse(courseData);
          if (!courseData) {
            setError("Course not found");
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error loading course:", error);
          setError("Failed to load course");
          setLoading(false);
        }
      );
      unsubscribers.push(courseUnsubscribe);

      // Subscribe to assignments collection
      const assignmentsUnsubscribe = FirebaseService.subscribeToAssignments(
        userId,
        courseId,
        (assignmentsData) => {
          setAssignments(assignmentsData);
          setLoading(false); // Consider data loaded after assignments are fetched
        },
        (error) => {
          console.error("Error loading assignments:", error);
          setError("Failed to load assignments");
          setLoading(false);
        }
      );
      unsubscribers.push(assignmentsUnsubscribe);

      // Subscribe to assignment groups collection
      const groupsUnsubscribe = FirebaseService.subscribeToAssignmentGroups(
        userId,
        courseId,
        (groupsData) => {
          setGroups(groupsData);
        },
        (error) => {
          console.error("Error loading groups:", error);
          setError((prev) =>
            prev
              ? `${prev}. Also failed to load groups.`
              : "Failed to load assignment groups"
          );
        }
      );
      unsubscribers.push(groupsUnsubscribe);
    } catch (error) {
      console.error("Error setting up data subscriptions:", error);
      setError("An unexpected error occurred");
      setLoading(false);
    }

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser, courseId]);

  // Course operations
  const updateCourse = useCallback(
    async (data: Partial<Course>) => {
      if (!currentUser || !courseId) return;
      try {
        await FirebaseService.updateCourse(currentUser.uid, courseId, data);
        return true;
      } catch (error) {
        console.error("Error updating course:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  const deleteCourse = useCallback(async () => {
    if (!currentUser || !courseId) return false;
    try {
      await FirebaseService.deleteCourse(currentUser.uid, courseId);
      return true;
    } catch (error) {
      console.error("Error deleting course:", error);
      return false;
    }
  }, [currentUser, courseId]);

  const updateGradeCutoffs = useCallback(
    async (cutoffs: GradeCutoff[]) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.updateGradeCutoffs(
          currentUser.uid,
          courseId,
          cutoffs
        );
        return true;
      } catch (error) {
        console.error("Error updating grade cutoffs:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  // Assignment group operations
  const addAssignmentGroup = useCallback(
    async (groupData: Omit<AssignmentGroup, "id" | "createdAt">) => {
      if (!currentUser || !courseId) return null;
      try {
        const groupId = await FirebaseService.addAssignmentGroup(
          currentUser.uid,
          courseId,
          groupData
        );
        return groupId;
      } catch (error) {
        console.error("Error adding assignment group:", error);
        return null;
      }
    },
    [currentUser, courseId]
  );

  const updateAssignmentGroup = useCallback(
    async (groupId: string, data: Partial<AssignmentGroup>) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.updateAssignmentGroup(
          currentUser.uid,
          courseId,
          groupId,
          data
        );
        return true;
      } catch (error) {
        console.error("Error updating assignment group:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  const deleteAssignmentGroup = useCallback(
    async (groupId: string) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.deleteAssignmentGroup(
          currentUser.uid,
          courseId,
          groupId
        );
        return true;
      } catch (error) {
        console.error("Error deleting assignment group:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  // Assignment operations
  const addAssignment = useCallback(
    async (
      assignmentData: Omit<Assignment, "id" | "createdAt" | "displayOrder">
    ) => {
      if (!currentUser || !courseId) return null;
      try {
        const assignmentId = await FirebaseService.addAssignment(
          currentUser.uid,
          courseId,
          assignmentData
        );
        return assignmentId;
      } catch (error) {
        console.error("Error adding assignment:", error);
        return null;
      }
    },
    [currentUser, courseId]
  );

  const updateAssignment = useCallback(
    async (assignmentId: string, data: Partial<Assignment>) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.updateAssignment(
          currentUser.uid,
          courseId,
          assignmentId,
          data
        );
        return true;
      } catch (error) {
        console.error("Error updating assignment:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  const deleteAssignment = useCallback(
    async (assignmentId: string) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.deleteAssignment(
          currentUser.uid,
          courseId,
          assignmentId
        );
        return true;
      } catch (error) {
        console.error("Error deleting assignment:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  const updateAssignmentOrder = useCallback(
    async (orderedAssignments: { id: string; displayOrder: number }[]) => {
      if (!currentUser || !courseId) return false;
      try {
        await FirebaseService.updateAssignmentOrder(
          currentUser.uid,
          courseId,
          orderedAssignments
        );
        return true;
      } catch (error) {
        console.error("Error updating assignment order:", error);
        return false;
      }
    },
    [currentUser, courseId]
  );

  return {
    // Data
    course,
    assignments,
    groups,
    loading,
    error,

    // Course operations
    updateCourse,
    deleteCourse,
    updateGradeCutoffs,

    // Assignment group operations
    addAssignmentGroup,
    updateAssignmentGroup,
    deleteAssignmentGroup,

    // Assignment operations
    addAssignment,
    updateAssignment,
    deleteAssignment,
    updateAssignmentOrder,
  };
}
