// src/components/Course/AssignmentTable.tsx
import React, { useState, useCallback, useMemo } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Assignment, AssignmentGroup } from "../../types";
import AssignmentRow from "./AssignmentRow";
import { FaPlus } from "react-icons/fa";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableAssignmentRow } from "./SortableAssignmentRow";
import { calculateEffectiveWeight } from "../../utils/gradeCalculations";

// Define the missing interface
interface AssignmentTableProps {
  courseId: string;
  assignments: Assignment[];
  groups: AssignmentGroup[];
}

const AssignmentTable: React.FC<AssignmentTableProps> = ({
  courseId,
  assignments,
  groups,
}) => {
  const { currentUser } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [orderedAssignments, setOrderedAssignments] =
    useState<Assignment[]>(assignments);

  // Effect to update local state when assignments prop changes
  React.useEffect(() => {
    setOrderedAssignments(assignments);
  }, [assignments]);

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event - now with server sync
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Update local state for immediate UI feedback
      let newOrderedItems: Assignment[] = [];

      setOrderedAssignments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        newOrderedItems = arrayMove(items, oldIndex, newIndex);
        return newOrderedItems;
      });

      // Now sync to server
      if (currentUser && courseId) {
        setIsDragging(true);
        try {
          // Create a batch operation to update multiple documents efficiently
          const batch = writeBatch(db);

          // Assign position values (we use multiples of 10 to allow for easy insertion later)
          newOrderedItems.forEach((assignment, index) => {
            const assignmentRef = doc(
              db,
              `users/${currentUser.uid}/courses/${courseId}/assignments/${assignment.id}`
            );
            // Use displayOrder field to track the order
            batch.update(assignmentRef, { displayOrder: (index + 1) * 10 });
          });

          // Commit all updates in a single batch
          await batch.commit();
        } catch (error) {
          console.error("Failed to update assignment order:", error);
          // Optionally, revert to original order on error
          setOrderedAssignments(assignments);
          alert("Failed to save the new order. Please try again.");
        } finally {
          setIsDragging(false);
        }
      }
    }
  };

  // Callback to add a new assignment
  const handleAddAssignment = useCallback(
    async (focusNew = false) => {
      if (!currentUser || !courseId || isAdding) return;
      setIsAdding(true);
      try {
        // Get the highest display order for proper positioning of new item
        const highestOrder =
          orderedAssignments.length > 0
            ? Math.max(...orderedAssignments.map((a) => a.displayOrder || 0)) +
              10
            : 10;

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
          displayOrder: highestOrder, // Add display order for new assignments
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
    [currentUser, courseId, isAdding, orderedAssignments]
  );

  // Helper to identify which assignments need weight recalculation
  const getAffectedAssignments = (
    assignment: Assignment,
    updatedData: Partial<Assignment>
  ) => {
    // If changing group, need to update both old and new group assignments
    if ("groupId" in updatedData) {
      const oldGroupId = assignment.groupId;
      const newGroupId = updatedData.groupId;

      // Get assignments from both groups
      const affectedAssignments = orderedAssignments.filter(
        (a) =>
          !a.isDropped &&
          (a.id === assignment.id ||
            a.groupId === oldGroupId ||
            a.groupId === newGroupId)
      );
      return affectedAssignments;
    }

    // If changing relative weight or dropping status, update all in the same group
    if (
      "relativeWeightInGroup" in updatedData ||
      "isDropped" in updatedData ||
      "isExtraCredit" in updatedData
    ) {
      return orderedAssignments.filter(
        (a) => a.groupId === assignment.groupId && !a.isDropped
      );
    }

    // If changing direct weight, only affect this assignment
    if ("weight" in updatedData) {
      return [assignment];
    }

    // Default: return this assignment only
    return [assignment];
  };

  // Basic implementation of saving edits (called from AssignmentRow)
  const handleSaveAssignment = async (
    assignmentId: string,
    updatedData: Partial<Assignment>
  ) => {
    if (!currentUser || !courseId) return;
    try {
      // Get the assignment being updated
      const assignment = orderedAssignments.find((a) => a.id === assignmentId);
      if (!assignment) return;

      // Get assignments that may need weight recalculation
      const affectedAssignments = getAffectedAssignments(
        assignment,
        updatedData
      );

      // First update the current assignment
      const assignmentRef = doc(
        db,
        `users/${currentUser.uid}/courses/${courseId}/assignments/${assignmentId}`
      );
      await updateDoc(assignmentRef, updatedData);

      // We no longer update effectiveWeight in the database
      // If weights were previously being recalculated, we just don't do that anymore
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("Failed to save changes.");
    }
  };

  // Memoize calculations for performance with sorted assignments
  const assignmentsWithCalculatedData = useMemo(() => {
    // Sort assignments by displayOrder if available
    const sortedAssignments = [...orderedAssignments].sort((a, b) => {
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      return orderA - orderB;
    });

    return sortedAssignments.map((assignment) => {
      // Note: effectiveWeight is calculated on client-side only and never stored in the database
      // This ensures weights are always current with the latest data
      const effectiveWeight = calculateEffectiveWeight(
        assignment,
        orderedAssignments,
        groups
      );
      let groupUsesManualWeight = false;
      if (assignment.groupId) {
        groupUsesManualWeight = orderedAssignments
          .filter((a) => a.groupId === assignment.groupId && !a.isDropped)
          .some(
            (a) =>
              typeof a.relativeWeightInGroup === "number" &&
              a.relativeWeightInGroup > 0
          );
      }
      return { ...assignment, effectiveWeight, groupUsesManualWeight };
    });
  }, [orderedAssignments, groups]); // Recalculate only when inputs change

  return (
    <div className="table-container">
      {isDragging && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-sm text-gray-500">Saving order...</div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="table-header">
            <tr>
              <th scope="col" className="w-5 px-1" title="Drag to reorder"></th>
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
            {assignmentsWithCalculatedData.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={assignmentsWithCalculatedData.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {assignmentsWithCalculatedData.map(
                    (assignmentData, index) => {
                      const matchingAssignment = assignments.find(
                        (a) => a.id === assignmentData.id
                      );
                      if (!matchingAssignment) return null;

                      return (
                        <SortableAssignmentRow
                          key={assignmentData.id}
                          id={assignmentData.id}
                          rowProps={{
                            assignment: matchingAssignment,
                            rowIndex: index,
                            totalRows: assignmentsWithCalculatedData.length,
                            groups: groups,
                            onSave: handleSaveAssignment,
                            courseId: courseId,
                            onAddRowBelow: () => handleAddAssignment(true),
                            effectiveWeight: assignmentData.effectiveWeight,
                            groupUsesManualWeight:
                              assignmentData.groupUsesManualWeight,
                          }}
                        />
                      );
                    }
                  )}
                </SortableContext>
              </DndContext>
            ) : (
              <tr>
                <td colSpan={10} className="empty-state">
                  No assignments added yet. Click button below to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 text-left bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <button
          onClick={() => handleAddAssignment(true)}
          disabled={isAdding}
          className="add-button"
        >
          <FaPlus className="-ml-0.5 mr-1.5 h-4 w-4" />
          {isAdding ? "Adding..." : "Add Assignment"}
        </button>
      </div>
    </div>
  );
};

export default AssignmentTable;
