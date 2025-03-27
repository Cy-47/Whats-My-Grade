// src/components/Course/AssignmentRow.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Assignment, AssignmentGroup } from "../../types";
import { FaTrash } from "react-icons/fa";

// Throttle function to limit frequency of Firestore writes on blur
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
      func.apply(this, args); // Call the function
    }
  };
}

// Props definition for the AssignmentRow component
interface AssignmentRowProps {
  assignment: Assignment; // The core data for this row
  rowIndex: number;
  totalRows: number;
  groups: AssignmentGroup[]; // List of available groups for the dropdown
  onSave: (assignmentId: string, updatedData: Partial<Assignment>) => void; // Callback to save changes
  courseId: string;
  onAddRowBelow: () => void; // Callback to trigger adding a new row
  groupUsesManualWeight: boolean; // Flag indicating weighting type for the group (if any)
  effectiveWeight: number | null; // Calculated effective weight contribution
}

const AssignmentRow: React.FC<AssignmentRowProps> = ({
  assignment,
  rowIndex,
  totalRows,
  groups,
  onSave,
  courseId,
  onAddRowBelow,
  groupUsesManualWeight,
  effectiveWeight,
}) => {
  const { currentUser } = useAuth();
  // Local state to manage edits within the row, initialized from props
  const [localAssignment, setLocalAssignment] =
    useState<Assignment>(assignment);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation visual feedback
  const nameInputRef = useRef<HTMLInputElement>(null); // Ref for potential focus management

  // Effect to sync local state if the parent prop changes (e.g., external Firestore update)
  useEffect(() => {
    setLocalAssignment(assignment);
  }, [assignment]);

  // Memoized throttled save function
  const throttledSave = useCallback(
    throttle((field: keyof Assignment, value: any) => {
      if (value !== assignment[field]) {
        // Only save if value actually changed
        let valueToSave = value;
        // Ensure numeric fields are saved as numbers or null
        if (
          ["score", "totalScore", "weight", "relativeWeightInGroup"].includes(
            field
          )
        ) {
          valueToSave = value === null || value === "" ? null : Number(value);
          if (isNaN(valueToSave as number)) valueToSave = null;
        }
        // Prepare update payload, handling side-effects of group change
        const updateData: Partial<Assignment> = { [field]: valueToSave };
        if (field === "groupId") {
          if (valueToSave) {
            updateData.weight = 0;
          } // Clear direct weight if joining group
          else {
            updateData.relativeWeightInGroup = null;
          } // Clear relative weight if leaving group
        }
        onSave(assignment.id, updateData); // Call parent save function
      }
    }, 600),
    [onSave, assignment]
  ); // Dependencies: Recreate if onSave or assignment ID changes

  // Handler for changes in input/select fields
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | null | undefined = value;

    if (name === "isDropped") {
      // Handle checkbox
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      // Handle number inputs (allow empty string temporarily)
      processedValue = value === "" ? "" : parseFloat(value);
      if (isNaN(processedValue as number) && value.trim() !== "") {
        processedValue = value;
      } // Keep invalid string temporarily
    } else if (name === "groupId" && value === "") {
      // Handle '-- No Group --' selection
      processedValue = null;
    }
    // Update local state immediately for responsive UI
    setLocalAssignment((prev) => ({ ...prev, [name]: processedValue }));
  };

  // Handler for when an input/select loses focus (triggers save)
  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const field = e.target.name as keyof Assignment;
    let currentValue = localAssignment[field];
    const inputType = e.target.type; // Get type from the event target
    // Convert empty string from number input to null before saving
    if (inputType === "number" && currentValue === "") {
      currentValue = null;
    }
    throttledSave(field, currentValue); // Trigger throttled save
  };

  // Handler for keyboard navigation (Enter key)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur(); // Trigger blur (which saves)

      const currentFieldName = (e.target as HTMLElement).dataset.fieldName;
      const nextRowIndex = rowIndex + 1;

      // Focus next row or trigger add
      if (nextRowIndex < totalRows) {
        // Focus same field in next row
        const nextInput = document.querySelector(
          `[data-row-index="${nextRowIndex}"][data-field-name="${currentFieldName}"]`
        ) as HTMLElement;
        nextInput?.focus();
        if (nextInput?.tagName === "INPUT")
          (nextInput as HTMLInputElement).select();
      } else if (nextRowIndex === totalRows && currentFieldName !== "actions") {
        // Add new row if on last row
        onAddRowBelow();
      }
    }
    // Arrow key logic could be added here
  };

  // Handler for 'Drop' checkbox (saves immediately)
  const toggleDrop = () => {
    const newDroppedState = !localAssignment.isDropped;
    setLocalAssignment((prev) => ({ ...prev, isDropped: newDroppedState }));
    onSave(assignment.id, { isDropped: newDroppedState }); // Save checkbox change immediately
  };

  // Handler for delete button
  const handleDelete = async () => {
    if (
      !currentUser ||
      !courseId ||
      isDeleting ||
      !window.confirm(`Delete "${localAssignment.name}"?`)
    )
      return;
    setIsDeleting(true);
    try {
      const assignmentRef = doc(
        db,
        `users/${currentUser.uid}/courses/${courseId}/assignments/${assignment.id}`
      );
      await deleteDoc(assignmentRef);
      // Row disappears via parent listener
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete.");
      setIsDeleting(false);
    }
    // No need to reset isDeleting on success as component will likely unmount/re-render
  };

  // Helper to generate common input/select props using @apply classes
  const getInputProps = (
    fieldName: keyof Assignment,
    type: string = "text",
    alignmentClass: string = ""
  ) => {
    let value = localAssignment[fieldName];
    if (type === "number" && (value === null || typeof value === "undefined")) {
      value = "";
    } // Display empty for null numbers
    return {
      name: fieldName,
      "data-assignment-id": assignment.id,
      "data-row-index": rowIndex,
      "data-field-name": fieldName,
      value: value as string | number, // Value for controlled component
      onChange: handleInputChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      type: type,
      disabled: isDeleting, // Standard attributes
      // Apply base class and any specific alignment/styling class
      className: `assignment-input ${alignmentClass}`,
    };
  };

  // Conditional classes based on state
  const isGrouped = !!localAssignment.groupId;
  const isDroppedClass = localAssignment.isDropped
    ? "opacity-60 line-through bg-gray-50"
    : ""; // Style for dropped rows

  return (
    <tr
      className={`hover:bg-gray-50 transition-colors duration-50 ${isDroppedClass}`}
    >
      {/* Name Input */}
      <td className="assignment-cell">
        {" "}
        <input
          ref={nameInputRef}
          {...getInputProps("name", "text", "font-medium")}
          placeholder="Assignment Name"
          aria-label="Assignment Name"
        />{" "}
      </td>
      {/* Score Input */}
      <td className="assignment-cell assignment-cell-center">
        {" "}
        <input
          {...getInputProps("score", "number", "assignment-input-center")}
          placeholder="-"
          step="any"
          min="0"
          aria-label="Score"
        />{" "}
      </td>
      {/* Total Score Input */}
      <td className="assignment-cell assignment-cell-center">
        {" "}
        <input
          {...getInputProps("totalScore", "number", "assignment-input-center")}
          placeholder="e.g. 100"
          step="any"
          min="0"
          aria-label="Total Score"
        />{" "}
      </td>
      {/* Weight (%) Display/Input */}
      <td className="assignment-cell assignment-cell-center">
        {" "}
        {isGrouped ? (
          <span className="calculated-weight-display">
            {effectiveWeight !== null
              ? `${effectiveWeight.toFixed(2)}%`
              : "N/A"}
          </span>
        ) : (
          <input
            {...getInputProps("weight", "number", "assignment-input-center")}
            placeholder={"0"}
            title="Assignment weight (%)"
            step="any"
            min="0"
            max="100"
            aria-label="Direct weight"
          />
        )}{" "}
      </td>
      {/* Group Select Dropdown */}
      <td className="assignment-cell">
        {" "}
        <select
          {...getInputProps("groupId", "select")}
          value={localAssignment.groupId || ""}
          className="assignment-select"
          aria-label="Assignment Group"
          title="Assign to a group..."
        >
          {" "}
          <option value="">-- No Group --</option>{" "}
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.weight}%)
            </option>
          ))}{" "}
        </select>{" "}
      </td>
      {/* Weight in Group Input */}
      <td className="assignment-cell assignment-cell-center">
        {" "}
        <input
          {...getInputProps(
            "relativeWeightInGroup",
            "number",
            "assignment-input-center"
          )}
          disabled={!isGrouped || isDeleting}
          placeholder={isGrouped ? "-" : "N/A"}
          title={
            isGrouped
              ? groupUsesManualWeight
                ? "Manual weight..."
                : "Using equal weight..."
              : "N/A"
          }
          step="any"
          min="0"
          aria-label="Relative weight"
        />{" "}
      </td>
      {/* Drop Checkbox */}
      <td className="assignment-cell assignment-cell-center">
        {" "}
        <input
          type="checkbox"
          name="isDropped"
          checked={!!localAssignment.isDropped}
          onChange={toggleDrop}
          disabled={isDeleting}
          className="assignment-checkbox"
          title="Drop assignment"
          aria-label="Drop assignment"
        />{" "}
      </td>
      {/* Actions (Delete) Button */}
      <td className="assignment-cell-last assignment-cell-center">
        {" "}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`icon-button icon-button-danger ${
            isDeleting ? "cursor-not-allowed" : ""
          }`}
          title="Delete assignment"
          aria-label="Delete assignment"
        >
          {" "}
          <span className="sr-only">Delete</span>{" "}
          {isDeleting ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              {" "}
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>{" "}
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>{" "}
            </svg>
          ) : (
            <FaTrash className="h-4 w-4" />
          )}{" "}
        </button>{" "}
      </td>
    </tr>
  );
};
export default AssignmentRow;
