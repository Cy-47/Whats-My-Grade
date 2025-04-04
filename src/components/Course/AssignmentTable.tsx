// src/components/Course/AssignmentTable.tsx
import React, { useState, useCallback } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Assignment, AssignmentGroup } from "../../types";
import { FaPlus } from "react-icons/fa";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
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
  const [orderedAssignments, setOrderedAssignments] = useState<Assignment[]>(
    []
  );

  // Load assignments order from the server
  React.useEffect(() => {
    const fetchAssignments = async () => {
      if (!currentUser || !courseId) return;
      try {
        const assignmentsCol = collection(
          db,
          `users/${currentUser.uid}/courses/${courseId}/assignments`
        );
        const q = query(assignmentsCol, orderBy("displayOrder"));
        const querySnapshot = await getDocs(q);
        const fetchedAssignments = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Assignment[];
        setOrderedAssignments(fetchedAssignments);
      } catch (error) {
        console.error("Error fetching assignments:", error);
      }
    };

    fetchAssignments();
  }, [currentUser, courseId]);

  // Handle drag end event
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
      setOrderedAssignments(newOrder);

      // Update the order on the server
      if (!currentUser) return; // Ensure currentUser is not null
      try {
        for (let i = 0; i < newOrder.length; i++) {
          const assignmentRef = doc(
            db,
            `users/${currentUser.uid}/courses/${courseId}/assignments/${newOrder[i].id}`
          );
          await updateDoc(assignmentRef, { displayOrder: i * 10 });
        }
      } catch (error) {
        console.error("Error updating assignment order:", error);
        alert("Failed to update assignment order.");
      }
    }
  };

  // Callback to add a new assignment
  const handleAddAssignment = useCallback(
    async (focusNew = false) => {
      if (!currentUser || !courseId) return;
      try {
        const highestOrder =
          orderedAssignments.length > 0
            ? Math.max(...orderedAssignments.map((a) => a.displayOrder || 0)) +
              10
            : 10;

        const assignmentsCol = collection(
          db,
          `users/${currentUser.uid}/courses/${courseId}/assignments`
        );
        const newAssignment = {
          courseId: courseId,
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
          createdAt: serverTimestamp(),
          displayOrder: highestOrder,
        };
        const newDocRef = await addDoc(assignmentsCol, newAssignment);

        // Update local state with the new assignment
        setOrderedAssignments((prev) => [
          ...prev,
          { id: newDocRef.id, ...newAssignment, createdAt: Timestamp.now() }, // Use Firestore's Timestamp
        ]);

        if (focusNew) {
          setTimeout(() => {
            const newRowInput = document.querySelector(
              `[data-assignment-id="${newDocRef.id}"][data-field-name="name"]`
            ) as HTMLInputElement;
            newRowInput?.focus();
            newRowInput?.select();
          }, 150);
        }
      } catch (error) {
        console.error("Error adding assignment:", error);
        alert("Failed to add assignment.");
      }
    },
    [currentUser, courseId, orderedAssignments]
  );

  // Basic implementation of saving edits (called from AssignmentRow)
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
    }
  };

  // Callback to handle assignment deletion
  const handleDeleteAssignment = (assignmentId: string) => {
    setOrderedAssignments((prevAssignments) =>
      prevAssignments.filter((assignment) => assignment.id !== assignmentId)
    );
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
                  id={assignment.id} // Pass `id` separately
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
