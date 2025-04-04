// src/components/Course/GradeCutoffsEditor.tsx
import React, { useState, useEffect, useMemo } from "react";
import { GradeCutoff } from "../../types";
import { v4 as uuidv4 } from "uuid"; // For unique keys
import { FaTimes, FaPlus } from "react-icons/fa";

/**
 * Component for editing grade cutoffs for a course.
 */
interface GradeCutoffsEditorProps {
  currentCutoffs: GradeCutoff[];
  onSave: (newCutoffs: GradeCutoff[]) => Promise<void>;
}

const GradeCutoffsEditor: React.FC<GradeCutoffsEditorProps> = ({
  currentCutoffs,
  onSave,
}) => {
  const [cutoffs, setCutoffs] = useState<GradeCutoff[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize state from props
  useEffect(() => {
    setCutoffs(currentCutoffs.map((c) => ({ ...c, id: c.id || uuidv4() })));
  }, [currentCutoffs]);

  /**
   * Handles changes to a specific grade cutoff field.
   */
  const handleCutoffChange = (
    id: string,
    field: "grade" | "minPercentage",
    value: string
  ) => {
    setCutoffs((prevCutoffs) =>
      prevCutoffs.map((cutoff) => {
        if (cutoff.id === id) {
          return {
            ...cutoff,
            [field]:
              field === "minPercentage"
                ? value === ""
                  ? 0
                  : parseFloat(value)
                : value.toUpperCase().trim(),
          };
        }
        return cutoff;
      })
    );
  };

  // Add a new cutoff
  const addCutoff = () => {
    setCutoffs((prevCutoffs) =>
      [...prevCutoffs, { id: uuidv4(), grade: "", minPercentage: 0 }].sort(
        (a, b) => b.minPercentage - a.minPercentage
      )
    );
  };

  // Remove a cutoff
  const removeCutoff = (id: string) => {
    setCutoffs((prevCutoffs) =>
      prevCutoffs.filter((cutoff) => cutoff.id !== id)
    );
  };

  /**
   * Saves the updated grade cutoffs.
   */
  const handleSaveClick = async () => {
    setIsSaving(true);

    // Validation
    const isValid = cutoffs.every(
      (c) =>
        c.grade.trim() !== "" &&
        !isNaN(c.minPercentage) &&
        c.minPercentage >= 0 &&
        c.minPercentage <= 100
    );

    if (!isValid) {
      alert(
        "Please ensure all cutoffs have a grade letter and a valid percentage between 0 and 100."
      );
      setIsSaving(false);
      return;
    }

    // Sort before saving
    const sortedCutoffs = [...cutoffs].sort(
      (a, b) => b.minPercentage - a.minPercentage
    );

    try {
      await onSave(sortedCutoffs);
    } catch (error) {
      alert("Failed to save grade cutoffs.");
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    const currentSimple = currentCutoffs
      .map(({ grade, minPercentage }) => ({ grade, minPercentage }))
      .sort((a, b) => b.minPercentage - a.minPercentage);

    const editingSimple = cutoffs
      .map(({ grade, minPercentage }) => ({ grade, minPercentage }))
      .sort((a, b) => b.minPercentage - a.minPercentage);

    return JSON.stringify(currentSimple) !== JSON.stringify(editingSimple);
  }, [cutoffs, currentCutoffs]);

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
