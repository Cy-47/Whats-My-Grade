// src/components/Course/GroupManager.tsx
import React, { useState, useEffect } from "react";
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
import { FaEdit, FaTrash, FaSave, FaTimes, FaPlus } from "react-icons/fa";

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
  const [editingGroups, setEditingGroups] = useState<
    Record<string, AssignmentGroup>
  >({});
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupWeight, setNewGroupWeight] = useState<number | "">(10);
  const [isAdding, setIsAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Clear editing state if props change externally
  useEffect(() => {
    setEditingGroups({});
  }, [groups]);

  // Update temporary edit state on input change
  const handleEditChange = (
    groupId: string,
    field: keyof AssignmentGroup,
    value: string | number
  ) => {
    setEditingGroups((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || groups.find((g) => g.id === groupId)!),
        [field]:
          field === "weight"
            ? value === ""
              ? ""
              : parseFloat(value as string)
            : value,
      },
    }));
    setErrors((prev) => ({ ...prev, [groupId]: "" })); // Clear error on edit
  };

  // Save edited group data to Firestore
  const handleSaveEdit = async (groupId: string) => {
    if (!currentUser) {
      setErrors((prev) => ({ ...prev, [groupId]: "Auth error." }));
      return;
    }
    const editedGroup = editingGroups[groupId];
    if (
      !editedGroup ||
      editedGroup.name.trim() === "" ||
      isNaN(Number(editedGroup.weight)) ||
      Number(editedGroup.weight) < 0
    ) {
      setErrors((prev) => ({
        ...prev,
        [groupId]: "Invalid name or non-negative weight.",
      }));
      return;
    }
    const groupRef = doc(
      db,
      `users/${currentUser.uid}/courses/${courseId}/assignmentGroups/${groupId}`
    );
    try {
      setErrors((prev) => ({ ...prev, [groupId]: "" })); // Clear error before attempt
      await updateDoc(groupRef, {
        name: editedGroup.name.trim(),
        weight: Number(editedGroup.weight),
      });
      // Exit edit mode on success
      setEditingGroups((prev) => {
        const n = { ...prev };
        delete n[groupId];
        return n;
      });
    } catch (error) {
      console.error("Error updating group:", error);
      setErrors((prev) => ({ ...prev, [groupId]: "Save failed." }));
    }
  };

  // Discard changes and exit edit mode
  const handleCancelEdit = (groupId: string) => {
    setEditingGroups((prev) => {
      const n = { ...prev };
      delete n[groupId];
      return n;
    });
    setErrors((prev) => ({ ...prev, [groupId]: "" })); // Clear errors
  };

  // Add a new group to Firestore
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

  // Delete a group from Firestore (with safety check)
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
              {groups.map((group) => {
                const isEditing = !!editingGroups[group.id];
                const currentData = isEditing ? editingGroups[group.id] : group;
                const errorMsg = errors[group.id];
                return (
                  <tr
                    key={group.id}
                    className={`border-b border-gray-200 ${
                      isEditing ? "bg-yellow-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="simple-table-cell p-1.5">
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentData.name}
                          onChange={(e) =>
                            handleEditChange(group.id, "name", e.target.value)
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label={`Edit name for group ${group.name}`}
                        />
                      ) : (
                        <span className="px-2 py-1 block">
                          {currentData.name}
                        </span>
                      )}
                    </td>
                    <td className="simple-table-cell p-1.5">
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentData.weight}
                          onChange={(e) =>
                            handleEditChange(group.id, "weight", e.target.value)
                          }
                          min="0"
                          step="any"
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          aria-label={`Edit weight for group ${group.name}`}
                        />
                      ) : (
                        <span className="px-2 py-1 block text-right">
                          {currentData.weight}%
                        </span>
                      )}
                    </td>
                    <td className="simple-table-cell simple-table-cell-actions p-1.5">
                      <div className="flex justify-end items-center gap-2">
                        {isEditing ? (
                          <>
                            {" "}
                            <button
                              onClick={() => handleSaveEdit(group.id)}
                              className="icon-button icon-button-save"
                              title="Save"
                            >
                              <FaSave />
                            </button>{" "}
                            <button
                              onClick={() => handleCancelEdit(group.id)}
                              className="icon-button icon-button-cancel"
                              title="Cancel"
                            >
                              <FaTimes />
                            </button>{" "}
                          </>
                        ) : (
                          <>
                            {" "}
                            <button
                              onClick={() =>
                                setEditingGroups({ [group.id]: group })
                              }
                              className="icon-button icon-button-default"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>{" "}
                            <button
                              onClick={() =>
                                handleDeleteGroup(group.id, group.name)
                              }
                              className="icon-button icon-button-danger"
                              title="Delete"
                            >
                              <FaTrash />
                            </button>{" "}
                          </>
                        )}
                      </div>
                      {errorMsg && (
                        <small className="text-red-600 block mt-0.5 text-xs text-right">
                          {errorMsg}
                        </small>
                      )}
                    </td>
                  </tr>
                );
              })}
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
