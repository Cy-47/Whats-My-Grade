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

// Define the missing interface
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

  // Memoize calculations for performance with sorted assignments
  const assignmentsWithCalculatedData = useMemo(() => {
    // Sort assignments by displayOrder if available
    const sortedAssignments = [...orderedAssignments].sort((a, b) => {
      const orderA = a.displayOrder || 0;
      const orderB = b.displayOrder || 0;
      return orderA - orderB;
    });

    return sortedAssignments.map((assignment) => {
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
    <div className="overflow-x-hidden w-full bg-white shadow border border-gray-200 rounded-lg">
      {/* Show a loading indicator during drag operations */}
      {isDragging && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-sm text-gray-500">Saving order...</div>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table className="divide-y min-w-full divide-gray-200 text-sm ">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {/* Add column for drag handle */}
              <th scope="col" className="w-5 px-1" title="Drag to reorder"></th>
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
              {/* New Extra Credit header */}
              <th
                scope="col"
                className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
                title="Extra Credit"
              >
                Extra Credit
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16 whitespace-nowrap"
                title="Actions"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
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
                    (assignmentData, index) => (
                      <SortableAssignmentRow
                        key={assignmentData.id}
                        id={assignmentData.id}
                        rowProps={{
                          assignment: assignments.find(
                            (a: Assignment) => a.id === assignmentData.id
                          )!,
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
                    )
                  )}
                </SortableContext>
              </DndContext>
            ) : (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-10 text-center text-sm text-gray-500 italic"
                >
                  No assignments added yet. Click button below to add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
