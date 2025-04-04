// src/components/Course/AssignmentTable.tsx
import React, { useState, useEffect, useCallback } from "react";
import { FaPlus } from "react-icons/fa";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableAssignmentRow } from "./SortableAssignmentRow";
import { calculateEffectiveWeight } from "../../utils/gradeCalculations";
import { Assignment, AssignmentGroup } from "../../types";
import { useCourseData } from "../../hooks/useFirestore";
import { useAuth } from "../../contexts/AuthContext";

interface AssignmentTableProps {
  courseId: string;
  assignments: Assignment[];
  groups: AssignmentGroup[];
}

/**
 * Component for displaying and managing course assignments.
 */
const AssignmentTable: React.FC<AssignmentTableProps> = ({
  courseId,
  assignments,
  groups,
}) => {
  const { currentUser } = useAuth();
  const [orderedAssignments, setOrderedAssignments] = useState<Assignment[]>(
    []
  );

  // Use our custom hook for data operations
  const {
    addAssignment,
    updateAssignment,
    deleteAssignment,
    updateAssignmentOrder,
  } = useCourseData(courseId);

  // Update ordered assignments when assignments change
  useEffect(() => {
    // Sort by displayOrder (if exists) or fallback to createdAt
    const sorted = [...assignments].sort((a, b) => {
      if (a.displayOrder !== undefined && b.displayOrder !== undefined) {
        return a.displayOrder - b.displayOrder;
      }
      // Fallback to createdAt if displayOrder is missing
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return aTime - bTime;
    });

    setOrderedAssignments(sorted);
  }, [assignments]);

  /**
   * Handles assignment reordering through drag and drop.
   */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedAssignments.findIndex(
        (item) => item.id === active.id
      );
      const newIndex = orderedAssignments.findIndex(
        (item) => item.id === over.id
      );

      const newOrder = arrayMove(orderedAssignments, oldIndex, newIndex);

      // Update local state immediately for UI responsiveness
      setOrderedAssignments(newOrder);

      // Prepare data for batch update
      const updateData = newOrder.map((assignment, index) => ({
        id: assignment.id,
        displayOrder: index * 10,
      }));

      // Update in Firestore
      const success = await updateAssignmentOrder(updateData);

      if (!success) {
        alert("Failed to update assignment order.");
        // Revert to original order if the update failed
        setOrderedAssignments(assignments);
      }
    }
  };

  /**
   * Adds a new assignment to the course.
   */
  const handleAddAssignment = useCallback(
    async (focusNew = false) => {
      if (!currentUser) return;

      const newAssignmentData = {
        courseId,
        userId: currentUser.uid,
        name: "New Assignment",
        score: null,
        totalScore: 100,
        weight: 0,
        deadline: null,
        isDropped: false,
        isExtraCredit: false,
        groupId: null,
        relativeWeightInGroup: null,
      };

      const newAssignmentId = await addAssignment(newAssignmentData);

      if (!newAssignmentId) {
        alert("Failed to add assignment.");
        return;
      }

      // Focus on the new assignment if requested
      if (focusNew) {
        setTimeout(() => {
          const newRowInput = document.querySelector(
            `[data-assignment-id="${newAssignmentId}"][data-field-name="name"]`
          ) as HTMLInputElement;
          newRowInput?.focus();
          newRowInput?.select();
        }, 150);
      }
    },
    [currentUser, courseId, addAssignment]
  );

  /**
   * Saves changes to an assignment.
   */
  const handleSaveAssignment = async (
    assignmentId: string,
    updatedData: Partial<Assignment>
  ) => {
    const success = await updateAssignment(assignmentId, updatedData);
    if (!success) {
      alert("Failed to save changes.");
    }
  };

  /**
   * Handles assignment deletion.
   */
  const handleDeleteAssignment = async (assignmentId: string) => {
    const success = await deleteAssignment(assignmentId);
    if (!success) {
      alert("Failed to delete assignment.");
      return false;
    }
    return true;
  };

  return (
    <div className="table-container">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={orderedAssignments.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="table-header">
              <tr>
                <th
                  scope="col"
                  className="w-5 px-1"
                  title="Drag to reorder"
                ></th>
                <th scope="col" className="table-header-cell">
                  Name
                </th>
                <th scope="col" className="table-header-cell-center">
                  Score
                </th>
                <th scope="col" className="table-header-cell-center">
                  Out of
                </th>
                <th
                  scope="col"
                  className="table-header-cell-center"
                  title="Assignment's contribution to the final course grade."
                >
                  Weight
                </th>
                <th scope="col" className="table-header-cell-center">
                  Group
                </th>
                <th
                  scope="col"
                  className="table-header-cell-center"
                  title="Weight relative to others in the same group (if manual weighting used)."
                >
                  Weight in Group
                </th>
                <th scope="col" className="table-header-cell-center">
                  Drop
                </th>
                <th
                  scope="col"
                  className="table-header-cell-center"
                  title="Extra Credit"
                >
                  Extra Credit
                </th>
                <th
                  scope="col"
                  className="table-header-cell-center"
                  title="Actions"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {orderedAssignments.map((assignment, index) => (
                <SortableAssignmentRow
                  key={assignment.id}
                  id={assignment.id}
                  rowProps={{
                    assignment,
                    rowIndex: index,
                    totalRows: orderedAssignments.length,
                    groups,
                    onSave: handleSaveAssignment,
                    courseId,
                    onAddRowBelow: () => handleAddAssignment(true),
                    effectiveWeight: calculateEffectiveWeight(
                      assignment,
                      assignments,
                      groups
                    ),
                    groupUsesManualWeight: false,
                    onDelete: handleDeleteAssignment,
                  }}
                />
              ))}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
      <div className="px-4 py-3 text-left bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button
          onClick={() => handleAddAssignment(true)}
          className="add-button"
        >
          <FaPlus className="-ml-0.5 mr-1.5 h-4 w-4" />
          Add Assignment
        </button>
      </div>
    </div>
  );
};

export default AssignmentTable;
