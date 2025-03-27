// src/components/Course/AssignmentTable.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Assignment, AssignmentGroup } from "../../types";
import AssignmentRow from "./AssignmentRow";
import { FaPlus } from "react-icons/fa";

interface AssignmentTableProps {
  courseId: string;
  assignments: Assignment[];
  groups: AssignmentGroup[];
}

// Helper function to calculate effective weight contribution
const calculateEffectiveWeight = (
  assignment: Assignment,
  allAssignments: Assignment[],
  groups: AssignmentGroup[]
): number | null => {
  if (assignment.isDropped) return 0; // Dropped items have 0 effective weight

  if (!assignment.groupId) {
    // Not grouped
    return typeof assignment.weight === "number" ? assignment.weight : null;
  }

  // Grouped assignment logic
  const group = groups.find((g) => g.id === assignment.groupId);
  if (!group || typeof group.weight !== "number" || group.weight <= 0) return 0;

  const groupAssignments = allAssignments.filter(
    (a) => a.groupId === group.id && !a.isDropped
  );
  const numberOfAssignmentsInGroup = groupAssignments.length;
  if (numberOfAssignmentsInGroup === 0) return 0;

  const groupUsesManualWeight = groupAssignments.some(
    (a) =>
      typeof a.relativeWeightInGroup === "number" && a.relativeWeightInGroup > 0
  );

  if (groupUsesManualWeight) {
    // Manual relative weighting
    let totalRelativeWeightInGroup = 0;
    groupAssignments.forEach((a) => {
      const relWeight =
        typeof a.relativeWeightInGroup === "number"
          ? a.relativeWeightInGroup
          : 0;
      if (relWeight > 0) {
        totalRelativeWeightInGroup += relWeight;
      }
    });
    if (totalRelativeWeightInGroup === 0) return 0; // Avoid division by zero

    const assignmentRelativeWeight =
      typeof assignment.relativeWeightInGroup === "number"
        ? assignment.relativeWeightInGroup
        : 0;
    return (
      group.weight * (assignmentRelativeWeight / totalRelativeWeightInGroup)
    );
  } else {
    // Equal weighting
    return group.weight / numberOfAssignmentsInGroup;
  }
};

const AssignmentTable: React.FC<AssignmentTableProps> = ({
  courseId,
  assignments,
  groups,
}) => {
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);

  // Callback to add a new assignment
  const handleAddAssignment = useCallback(
    async (focusNew = false) => {
      if (!currentUser || !courseId || isAdding) return;
      setIsAdding(true);
      try {
        const assignmentsCol = collection(
          db,
          `users/${currentUser.uid}/courses/${courseId}/assignments`
        );
        const newDocRef = await addDoc(assignmentsCol, {
          // Default values for new assignment
          courseId: courseId,
          userId: currentUser.uid,
          name: "New Assignment",
          score: null,
          totalScore: 100,
          weight: 0,
          deadline: null,
          isDropped: false,
          groupId: null,
          relativeWeightInGroup: null,
          createdAt: serverTimestamp(),
        });

        if (focusNew) {
          // Focus name input of new row
          setTimeout(() => {
            const newRowInput = document.querySelector(
              `[data-assignment-id="${newDocRef.id}"] [data-field-name="name"]`
            ) as HTMLInputElement;
            newRowInput?.focus();
            newRowInput?.select();
          }, 150);
        }
      } catch (error) {
        console.error("Error adding assignment:", error);
        alert("Failed to add assignment.");
      } finally {
        setIsAdding(false);
      }
    },
    [currentUser, courseId, isAdding]
  );

  // Basic implementation of saving edits (called from AssignmentRow)
  // Consider debouncing or batching updates for better performance
  const handleSaveAssignment = async (
    assignmentId: string,
    updatedData: Partial<Assignment>
  ) => {
    if (!currentUser || !courseId) return;
    try {
      const assignmentRef = doc(
        db,
        `users/${currentUser.uid}/courses/${courseId}/assignments/${assignmentId}`
      );
      await updateDoc(assignmentRef, updatedData);
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("Failed to save changes.");
      // TODO: Implement rollback or retry logic if needed
    }
  };

  // Memoize calculations for performance
  const assignmentsWithCalculatedData = useMemo(() => {
    return assignments.map((assignment) => {
      const effectiveWeight = calculateEffectiveWeight(
        assignment,
        assignments,
        groups
      );
      let groupUsesManualWeight = false;
      if (assignment.groupId) {
        groupUsesManualWeight = assignments
          .filter((a) => a.groupId === assignment.groupId && !a.isDropped)
          .some(
            (a) =>
              typeof a.relativeWeightInGroup === "number" &&
              a.relativeWeightInGroup > 0
          );
      }
      return { ...assignment, effectiveWeight, groupUsesManualWeight };
    });
  }, [assignments, groups]); // Recalculate only when inputs change

  return (
    <div className="overflow-x-auto bg-white shadow border border-gray-200 rounded-lg">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          {" "}
          {/* Sticky header */}
          <tr>
            <th
              scope="col"
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap"
            >
              Score
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-20 whitespace-nowrap"
            >
              Out of
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 whitespace-nowrap"
              title="Assignment's contribution to the final course grade."
            >
              Weight (%)
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40 whitespace-nowrap"
            >
              Group
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 whitespace-nowrap"
              title="Weight relative to others in the same group (if manual weighting used)."
            >
              Weight in Group
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
            >
              Drop
            </th>
            <th
              scope="col"
              className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {assignmentsWithCalculatedData.length > 0 ? (
            assignmentsWithCalculatedData.map((assignmentData, index) => (
              <AssignmentRow
                key={assignmentData.id}
                // Pass original assignment data to row for local state management
                assignment={
                  assignments.find((a) => a.id === assignmentData.id)!
                }
                rowIndex={index}
                totalRows={assignmentsWithCalculatedData.length}
                groups={groups}
                onSave={handleSaveAssignment}
                courseId={courseId}
                onAddRowBelow={() => handleAddAssignment(true)}
                // Pass calculated data needed for display
                effectiveWeight={assignmentData.effectiveWeight}
                groupUsesManualWeight={assignmentData.groupUsesManualWeight}
              />
            ))
          ) : (
            <tr>
              <td
                colSpan={8}
                className="px-6 py-10 text-center text-sm text-gray-500 italic"
              >
                No assignments added yet. Click button below to add one.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {/* Add Button - Placed after the table for better flow */}
      <div className="px-4 py-3 text-left bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button
          onClick={() => handleAddAssignment(true)}
          disabled={isAdding}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition"
        >
          <FaPlus className="-ml-0.5 mr-1.5 h-4 w-4" />
          {isAdding ? "Adding..." : "Add Assignment"}
        </button>
      </div>
    </div>
  );
};

export default AssignmentTable;
