import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AssignmentRow, { AssignmentRowProps } from "./AssignmentRow"; // Import AssignmentRowProps
import { FaGripVertical } from "react-icons/fa";

interface RowProps extends Omit<AssignmentRowProps, "id"> {} // Remove `id` from RowProps

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
      className={`table-row ${isDroppedClass} ${
        isDragging ? "table-row-dragging" : ""
      }`}
    >
      {/* Add a drag handle before the first cell */}
      <td className="table-cell w-5">
        <div
          {...attributes}
          {...listeners}
          className="drag-handle"
          title="Drag to reorder"
        >
          <FaGripVertical className="h-4 w-4" />
        </div>
      </td>

      {/* Render AssignmentRow cells */}
      <AssignmentRow {...rowProps} />
    </tr>
  );
}
