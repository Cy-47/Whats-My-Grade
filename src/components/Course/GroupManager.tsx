// src/components/Course/GroupManager.tsx
import React, { useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { AssignmentGroup, Assignment } from "../../types";
import { FaTrash, FaPlus } from "react-icons/fa";

interface GroupManagerProps {
  courseId: string;
  groups: AssignmentGroup[];
  assignments: Assignment[]; // Needed to check if group is safe to delete
}

const GroupManager: React.FC<GroupManagerProps> = ({
  courseId,
  groups,
  assignments,
}) => {
  const { currentUser } = useAuth();
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState<number | "">(10);
  const [isAdding, setIsAdding] = useState(false);
  const [editingField, setEditingField] = useState<{
    groupId: string;
    field: keyof AssignmentGroup;
  } | null>(null);

  /**
   * Updates a single field of an assignment group.
   * @param groupId - ID of the group to update.
   * @param field - Field name to update.
   * @param value - New value for the field.
   */
  const handleGroupFieldChange = async (
    groupId: string,
    field: keyof AssignmentGroup,
    value: string | number
  ) => {
    if (!currentUser) return;
    const groupRef = doc(
      db,
      `users/${currentUser.uid}/courses/${courseId}/assignmentGroups/${groupId}`
    );
    try {
      await updateDoc(groupRef, { [field]: value });
    } catch (error) {
      console.error(`Error updating group ${field}:`, error);
      alert(`Failed to update group ${field}.`);
    }
  };

  const handleGroupFieldBlur = () => {
    setEditingField(null);
  };

  /**
   * Adds a new assignment group to Firestore.
   */
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Not logged in.");
      return;
    }
    if (
      newGroupName.trim() === "" ||
      newGroupWeight === "" ||
      isNaN(Number(newGroupWeight)) ||
      Number(newGroupWeight) < 0 ||
      isAdding
    ) {
      alert("Valid name & non-negative weight required.");
      return;
    }
    setIsAdding(true);
    const groupsCol = collection(
      db,
      `users/${currentUser.uid}/courses/${courseId}/assignmentGroups`
    );
    try {
      await addDoc(groupsCol, {
        courseId: courseId,
        userId: currentUser.uid,
        name: newGroupName.trim(),
        weight: Number(newGroupWeight),
        createdAt: serverTimestamp(),
      });
      setNewGroupName("");
      setNewGroupWeight(10); // Reset form
    } catch (error) {
      console.error("Error adding group:", error);
      alert("Failed to add group.");
    } finally {
      setIsAdding(false);
    }
  };

  /**
   * Deletes an assignment group from Firestore after validation.
   * @param groupId - ID of the group to delete.
   * @param groupName - Name of the group to delete.
   */
  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!currentUser) {
      alert("Not logged in.");
      return;
    }
    // Check if assignments are linked
    const assignmentsInGroup = assignments.filter((a) => a.groupId === groupId);
    if (assignmentsInGroup.length > 0) {
      alert(
        `Cannot delete "${groupName}" - ${assignmentsInGroup.length} assignment(s) still assigned.`
      );
      return;
    }
    // Confirm deletion
    if (
      !window.confirm(`Delete group "${groupName}"? This cannot be undone.`)
    ) {
      return;
    }
    const groupRef = doc(
      db,
      `users/${currentUser.uid}/courses/${courseId}/assignmentGroups/${groupId}`
    );
    try {
      await deleteDoc(groupRef);
      // Row will vanish via listener
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group.");
    }
  };

  // Render UI
  return (
    <div className="space-y-4">
      {/* Group Table */}
      <div className="overflow-x-auto">
        {groups.length > 0 ? (
          <table className="w-full text-sm border border-gray-200 border-collapse">
            <thead>
              <tr>
                <th className="simple-table-header">Name</th>
                <th className="simple-table-header w-24">Weight</th>
                <th className="simple-table-header w-28 simple-table-cell-actions">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="simple-table-cell p-1.5">
                    {editingField?.groupId === group.id &&
                    editingField.field === "name" ? (
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          handleGroupFieldChange(
                            group.id,
                            "name",
                            e.target.value
                          )
                        }
                        onBlur={handleGroupFieldBlur}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer px-2 py-1 hover:bg-gray-100 rounded"
                        onClick={() =>
                          setEditingField({ groupId: group.id, field: "name" })
                        }
                        title="Click to edit group name"
                      >
                        {group.name}
                      </div>
                    )}
                  </td>
                  <td className="simple-table-cell p-1.5">
                    {editingField?.groupId === group.id &&
                    editingField.field === "weight" ? (
                      <input
                        type="number"
                        value={group.weight}
                        onChange={(e) =>
                          handleGroupFieldChange(
                            group.id,
                            "weight",
                            e.target.value === ""
                              ? 0
                              : parseFloat(e.target.value)
                          )
                        }
                        onBlur={handleGroupFieldBlur}
                        min="0"
                        step="any"
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer px-2 py-1 hover:bg-gray-100 rounded text-right"
                        onClick={() =>
                          setEditingField({
                            groupId: group.id,
                            field: "weight",
                          })
                        }
                        title="Click to edit group weight"
                      >
                        {group.weight}%
                      </div>
                    )}
                  </td>
                  <td className="simple-table-cell simple-table-cell-actions p-1.5">
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="icon-button icon-button-danger"
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-gray-500 italic py-2 text-center">
            No assignment groups created yet.
          </p>
        )}
      </div>
      {/* Add Group Form */}
      <form
        onSubmit={handleAddGroup}
        className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200"
      >
        <label htmlFor="newGroupName" className="sr-only">
          New Group Name
        </label>{" "}
        <input
          id="newGroupName"
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New Group Name"
          required
          disabled={isAdding}
          className="flex-grow px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-[150px] disabled:bg-gray-100"
        />
        <label htmlFor="newGroupWeight" className="sr-only">
          New Group Weight
        </label>{" "}
        <input
          id="newGroupWeight"
          type="number"
          value={newGroupWeight}
          onChange={(e) =>
            setNewGroupWeight(
              e.target.value === "" ? "" : parseFloat(e.target.value)
            )
          }
          placeholder="Weight %"
          min="0"
          step="any"
          required
          disabled={isAdding}
          className="w-20 px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={isAdding || !newGroupName.trim()}
          className="button-base button-primary"
        >
          {" "}
          {isAdding ? (
            "Adding..."
          ) : (
            <>
              <FaPlus className="-ml-0.5 mr-1.5 h-4 w-4" /> Add Group
            </>
          )}{" "}
        </button>
      </form>
    </div>
  );
};
export default GroupManager;
