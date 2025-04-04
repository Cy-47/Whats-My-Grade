// src/components/Course/AssignmentRow.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Assignment, AssignmentGroup } from "../../types";
import { FaTrash } from "react-icons/fa";

// Utility: Throttle function to limit frequency of Firestore writes
function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: ThisParameterType<T>, ...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
      func.apply(this, args);
    }
  };
}

// Props definition for the AssignmentRow component
export interface AssignmentRowProps {
  assignment: Assignment;
  rowIndex: number;
  totalRows: number;
  groups: AssignmentGroup[];
  onSave: (assignmentId: string, updatedData: Partial<Assignment>) => void;
  courseId: string;
  onAddRowBelow: () => void;
  groupUsesManualWeight: boolean;
  effectiveWeight: number | null;
  onDelete: (assignmentId: string) => void; // Notify parent about deletion
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
  onDelete,
}) => {
  const { currentUser } = useAuth();

  // --- State Management ---
  const [localAssignment, setLocalAssignment] =
    useState<Assignment>(assignment);
  const [isDeleting, setIsDeleting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  useEffect(() => {
    setLocalAssignment(assignment);
  }, [assignment]);

  // --- Utility Functions ---
  const throttledSave = useCallback(
    throttle((field: keyof Assignment, value: any) => {
      if (value !== assignment[field]) {
        let valueToSave = value;
        if (
          ["score", "totalScore", "weight", "relativeWeightInGroup"].includes(
            field
          )
        ) {
          valueToSave = value === null || value === "" ? null : Number(value);
          if (isNaN(valueToSave as number)) valueToSave = null;
        }
        const updateData: Partial<Assignment> = { [field]: valueToSave };
        if (field === "groupId") {
          if (valueToSave) updateData.weight = 0;
          else updateData.relativeWeightInGroup = null;
        }
        onSave(assignment.id, updateData);
      }
    }, 600),
    [onSave, assignment]
  );

  const focusCell = (rowIndex: number, fieldName: string | undefined) => {
    if (!fieldName) return;
    const targetInput = document.querySelector(
      `[data-row-index="${rowIndex}"][data-field-name="${fieldName}"]`
    ) as HTMLElement;
    targetInput?.focus();
    if (targetInput?.tagName === "INPUT") {
      (targetInput as HTMLInputElement).select();
    }
  };

  // --- Handlers ---
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean | null | undefined = value;

    if (name === "isDropped") {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      processedValue = value === "" ? "" : parseFloat(value);
      if (isNaN(processedValue as number) && value.trim() !== "") {
        processedValue = value;
      }
    } else if (name === "groupId" && value === "") {
      processedValue = null;
    }

    setLocalAssignment((prev) => ({ ...prev, [name]: processedValue }));

    // Immediately save the group change without waiting for blur
    if (name === "groupId") {
      const valueToSave = value === "" ? null : value;
      const updateData: Partial<Assignment> = {
        groupId: valueToSave,
      };

      // // If assigned to a group, reset direct weight
      // if (valueToSave) {
      //   updateData.weight = 0;
      // } else {
      //   // If removed from group, clear the relative weight
      //   updateData.relativeWeightInGroup = null;
      // }

      onSave(assignment.id, updateData);
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const field = e.target.name as keyof Assignment;
    let currentValue = localAssignment[field];
    if (e.target.type === "number" && currentValue === "") {
      currentValue = null;
    }
    throttledSave(field, currentValue);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const currentFieldName = (e.target as HTMLElement).dataset.fieldName;
    const nextRowIndex = rowIndex + 1;
    const prevRowIndex = rowIndex - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (nextRowIndex < totalRows) focusCell(nextRowIndex, currentFieldName);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (prevRowIndex >= 0) focusCell(prevRowIndex, currentFieldName);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextField = (e.target as HTMLElement)
        .closest("td")
        ?.nextElementSibling?.querySelector("[data-field-name]") as HTMLElement;
      nextField?.focus();
      if (nextField?.tagName === "INPUT")
        (nextField as HTMLInputElement).select();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevField = (e.target as HTMLElement)
        .closest("td")
        ?.previousElementSibling?.querySelector(
          "[data-field-name]"
        ) as HTMLElement;
      prevField?.focus();
      if (prevField?.tagName === "INPUT")
        (prevField as HTMLInputElement).select();
    } else if (e.key === "Enter") {
      e.preventDefault();
      (e.target as HTMLElement).blur();
      if (nextRowIndex < totalRows) {
        focusCell(nextRowIndex, currentFieldName);
      } else if (nextRowIndex === totalRows && currentFieldName !== "actions") {
        onAddRowBelow();
      }
    }
  };

  const toggleDrop = () => {
    const newDroppedState = !localAssignment.isDropped;
    setLocalAssignment((prev) => ({ ...prev, isDropped: newDroppedState }));
    onSave(assignment.id, { isDropped: newDroppedState });
  };

  const toggleExtraCredit = () => {
    const newExtraCredit = !localAssignment.isExtraCredit;
    setLocalAssignment((prev) => ({ ...prev, isExtraCredit: newExtraCredit }));
    onSave(assignment.id, { isExtraCredit: newExtraCredit });
  };

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
      onDelete(assignment.id); // Notify parent about the deletion
    } catch (error) {
      console.error("Error deleting assignment:", error);
      alert("Failed to delete.");
      setIsDeleting(false);
    }
  };

  const getInputProps = (
    fieldName: keyof Assignment,
    type: string = "text",
    alignmentClass: string = ""
  ) => {
    let value = localAssignment[fieldName];
    if (type === "number" && (value === null || typeof value === "undefined")) {
      value = "";
    }
    return {
      name: fieldName,
      "data-assignment-id": assignment.id,
      "data-row-index": rowIndex,
      "data-field-name": fieldName,
      value: value as string | number,
      onChange: handleInputChange,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      type: type,
      disabled: isDeleting,
      className: `w-full text-sm bg-transparent border-none text-center focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-50 disabled:opacity-50 ${alignmentClass}`,
    };
  };

  // --- Render ---
  const isGrouped = !!localAssignment.groupId;

  return (
    <>
      {/* Name Input */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-left">
        <input
          ref={nameInputRef}
          {...getInputProps("name", "text")}
          placeholder="Assignment Name"
          aria-label="Assignment Name"
          className="w-full text-sm bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-50 disabled:opacity-50"
        />
      </td>
      {/* Score Input */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        <input
          {...getInputProps("score", "number")}
          placeholder="-"
          step="any"
          min="0"
          aria-label="Score"
        />
      </td>
      {/* Total Score Input */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        <input
          {...getInputProps("totalScore", "number")}
          placeholder="e.g. 100"
          step="any"
          min="0"
          aria-label="Total Score"
        />
      </td>
      {/* Weight (%) Display/Input */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        {isGrouped ? (
          <span className="block w-full text-sm text-gray-500 italic text-center">
            {effectiveWeight !== null ? `${effectiveWeight}` : "N/A"}
          </span>
        ) : (
          <input
            {...getInputProps("weight", "number")}
            placeholder={"0"}
            title="Assignment weight"
            step="any"
            min="0"
            max="100"
            aria-label="Direct weight"
          />
        )}
      </td>
      {/* Group Select Dropdown */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300">
        <select
          {...getInputProps("groupId", "select")}
          value={localAssignment.groupId || ""}
          className="w-full text-sm bg-transparent border-none text-center focus:outline-none focus:ring-1 focus:ring-blue-400 focus:bg-blue-50 disabled:opacity-50"
          aria-label="Assignment Group"
          title="Assign to a group..."
        >
          <option value="">-- No Group --</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.weight}%)
            </option>
          ))}
        </select>
      </td>
      {/* Weight in Group Input */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        <input
          {...getInputProps("relativeWeightInGroup", "number")}
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
        />
      </td>
      {/* Drop Checkbox */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        <input
          type="checkbox"
          name="isDropped"
          checked={!!localAssignment.isDropped}
          onChange={toggleDrop}
          disabled={isDeleting}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          title="Drop assignment"
          aria-label="Drop assignment"
        />
      </td>
      {/* Extra Credit Checkbox */}
      <td className="px-3 py-1.5 align-middle border-r border-gray-300 text-center">
        <input
          type="checkbox"
          name="isExtraCredit"
          checked={!!localAssignment.isExtraCredit}
          onChange={toggleExtraCredit}
          disabled={isDeleting}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
          title="Mark as extra credit"
          aria-label="Extra credit"
        />
      </td>
      {/* Actions (Delete) Button */}
      <td className="px-3 py-1.5 align-middle text-center">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className={`inline-flex items-center justify-center h-7 w-7 rounded transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 text-red-500 hover:bg-red-100 hover:text-red-700 focus:ring-red-500 ${
            isDeleting ? "cursor-not-allowed" : ""
          }`}
          title="Delete assignment"
          aria-label="Delete assignment"
        >
          <span className="sr-only">Delete</span>
          {isDeleting ? (
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            <FaTrash className="h-4 w-4" />
          )}
        </button>
      </td>
    </>
  );
};

export default AssignmentRow;
