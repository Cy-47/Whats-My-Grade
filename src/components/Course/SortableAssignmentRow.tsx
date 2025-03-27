import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AssignmentRow from "./AssignmentRow";
import { Assignment, AssignmentGroup } from "../../types";
import { FaGripVertical } from "react-icons/fa";

interface RowProps {
  assignment: Assignment;
  rowIndex: number;
  totalRows: number;
  groups: AssignmentGroup[];
  onSave: (assignmentId: string, updatedData: Partial<Assignment>) => void;
  courseId: string;
  onAddRowBelow: () => void;
  effectiveWeight: number | null;
  groupUsesManualWeight: boolean;
}

interface SortableRowProps {
  id: string;
  rowProps: RowProps;
}

export function SortableAssignmentRow({ id, rowProps }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  // Ensure assignment exists to prevent errors
  if (!rowProps.assignment) {
    return null; // Don't render anything if assignment is undefined
  }

  const isDropped = rowProps.assignment.isDropped;
  const isDroppedClass = isDropped ? "opacity-60 line-through bg-gray-50" : "";

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 transition-colors duration-150 ${isDroppedClass} ${
        isDragging ? "bg-blue-50" : ""
      }`}
    >
      {/* Add a drag handle before the first cell */}
      <td className="w-5 px-1 border-r border-gray-200">
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-full cursor-grab"
          title="Drag to reorder"
        >
          <FaGripVertical className="text-gray-400 h-4 w-4" />
        </div>
      </td>

      {/* Render AssignmentRow cells */}
      <AssignmentRow {...rowProps} />
    </tr>
  );
}
