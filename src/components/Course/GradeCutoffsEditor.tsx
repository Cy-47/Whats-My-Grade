// src/components/Course/GradeCutoffsEditor.tsx
import React, { useState, useEffect, useMemo } from "react";
import { GradeCutoff } from "../../types";
import { v4 as uuidv4 } from "uuid"; // For unique keys
import { FaTimes, FaPlus } from "react-icons/fa";

interface GradeCutoffsEditorProps {
  currentCutoffs: GradeCutoff[];
  onSave: (newCutoffs: GradeCutoff[]) => Promise<void>; // Callback to save
}

const GradeCutoffsEditor: React.FC<GradeCutoffsEditorProps> = ({
  currentCutoffs,
  onSave,
}) => {
  const [cutoffs, setCutoffs] = useState<GradeCutoff[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize local state from props, ensuring unique IDs
  useEffect(() => {
    setCutoffs(currentCutoffs.map((c) => ({ ...c, id: c.id || uuidv4() })));
  }, [currentCutoffs]);

  // Handle changes in grade letter or percentage inputs
  const handleCutoffChange = (
    id: string,
    field: "grade" | "minPercentage",
    value: string
  ) => {
    setCutoffs((prevCutoffs) =>
      prevCutoffs.map((cutoff) => {
        if (cutoff.id === id) {
          // Process value based on field type
          return {
            ...cutoff,
            [field]:
              field === "minPercentage"
                ? value === ""
                  ? 0
                  : parseFloat(value) // Parse percentage, default 0 if empty
                : value.toUpperCase().trim(), // Uppercase and trim grade letter
          };
        }
        return cutoff;
      })
    );
  };

  // Add a new blank cutoff row to the list
  const addCutoff = () => {
    setCutoffs((prevCutoffs) =>
      [
        ...prevCutoffs,
        { id: uuidv4(), grade: "", minPercentage: 0 }, // Add new blank entry
      ].sort((a, b) => b.minPercentage - a.minPercentage)
    ); // Keep sorted descending by percentage
  };

  // Remove a cutoff row by its ID
  const removeCutoff = (id: string) => {
    setCutoffs((prevCutoffs) =>
      prevCutoffs.filter((cutoff) => cutoff.id !== id)
    );
  };

  // Validate and save the current cutoff list
  const handleSaveClick = async () => {
    setIsSaving(true); // Indicate saving process
    // Basic validation
    const isValid = cutoffs.every(
      (c) =>
        c.grade.trim() !== "" && // Grade letter must not be empty
        !isNaN(c.minPercentage) && // Percentage must be a number
        c.minPercentage >= 0 && // Percentage between 0
        c.minPercentage <= 100 // and 100
    );
    if (!isValid) {
      alert(
        "Please ensure all cutoffs have a grade letter and a valid percentage between 0 and 100."
      );
      setIsSaving(false); // Stop saving
      return;
    }
    // Final sort before saving to ensure consistency
    const sortedCutoffs = [...cutoffs].sort(
      (a, b) => b.minPercentage - a.minPercentage
    );
    try {
      await onSave(sortedCutoffs); // Call parent save function
      // Optional: Add success feedback (e.g., temporary message)
    } catch (error) {
      // Error is likely handled by parent, but alert here too
      alert("Failed to save grade cutoffs.");
    } finally {
      setIsSaving(false); // Finish saving process
    }
  };

  // Memoized check to see if local state differs from original props (ignoring ID and initial order)
  const hasChanges = useMemo(() => {
    // Create comparable representations (object arrays without ID, sorted)
    const currentSimple = currentCutoffs
      .map(({ grade, minPercentage }) => ({ grade, minPercentage }))
      .sort((a, b) => b.minPercentage - a.minPercentage);
    const editingSimple = cutoffs
      .map(({ grade, minPercentage }) => ({ grade, minPercentage }))
      .sort((a, b) => b.minPercentage - a.minPercentage);
    // Compare JSON strings for deep equality check
    return JSON.stringify(currentSimple) !== JSON.stringify(editingSimple);
  }, [cutoffs, currentCutoffs]); // Recalculate only if cutoffs or currentCutoffs change

  // Render UI
  return (
    <div className="space-y-3">
      {/* List of Cutoff Items */}
      {cutoffs.length > 0 ? (
        <div className="space-y-2">
          {cutoffs.map((cutoff) => (
            <div
              key={cutoff.id}
              className="flex items-center gap-2 bg-gray-50 p-2 rounded border border-gray-200"
            >
              {/* Grade Input */}
              <label htmlFor={`grade-${cutoff.id}`} className="sr-only">
                Grade
              </label>
              <input
                id={`grade-${cutoff.id}`}
                type="text"
                value={cutoff.grade}
                onChange={(e) =>
                  handleCutoffChange(cutoff.id, "grade", e.target.value)
                }
                placeholder="A+"
                maxLength={3}
                className="w-14 px-2 py-1 border border-gray-300 rounded-md text-sm text-center font-medium uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Grade Letter"
              />
              {/* Separator */}
              <span className="text-gray-500 text-sm"> {">="} </span>
              {/* Percentage Input */}
              <label htmlFor={`percent-${cutoff.id}`} className="sr-only">
                Percent
              </label>
              <input
                id={`percent-${cutoff.id}`}
                type="number"
                value={cutoff.minPercentage}
                onChange={(e) =>
                  handleCutoffChange(cutoff.id, "minPercentage", e.target.value)
                }
                placeholder="%"
                min="0"
                max="100"
                step="any"
                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Min Percent"
              />
              {/* Percentage Sign */}
              <span className="text-gray-500 text-sm">%</span>
              {/* Remove Button */}
              <button
                onClick={() => removeCutoff(cutoff.id)}
                className="ml-auto icon-button icon-button-danger"
                title="Remove"
              >
                {" "}
                <FaTimes />{" "}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic py-2 text-center">
          No grade cutoffs defined.
        </p>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
        {/* Add Button */}
        <button onClick={addCutoff} className="button-base button-secondary">
          {" "}
          <FaPlus className="-ml-0.5 mr-1.5 h-4 w-4 text-gray-500" /> Add Cutoff{" "}
        </button>
        {/* Save Button (conditional) */}
        {hasChanges && (
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            className="button-base button-primary"
          >
            {" "}
            {isSaving ? "Saving..." : "Save Cutoffs"}{" "}
          </button>
        )}
      </div>
    </div>
  );
};
export default GradeCutoffsEditor;
