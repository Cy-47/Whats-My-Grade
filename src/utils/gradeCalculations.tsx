import { Assignment, AssignmentGroup, GradeCutoff } from "../types";

// Helper to safely calculate percentage (0 to 1)
const safePercentage = (
  score: number | null,
  total: number | null
): number | null => {
  if (
    score === null ||
    total === null ||
    typeof score !== "number" ||
    typeof total !== "number" ||
    total === 0
  ) {
    return null; // Cannot calculate if score/total invalid, missing, or total is zero
  }
  return score / total;
};

// Validate if a weight is a positive number
const isValidWeight = (weight: any): boolean => {
  return typeof weight === "number" && weight > 0;
};

// Export function to calculate an assignment's effective weight contribution
export const calculateEffectiveWeight = (
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

// Calculate an assignment's contribution to the overall grade
const calculateAssignmentContribution = (
  assignment: Assignment,
  weight: number
): { pointsObtained: number; pointsTotal: number } => {
  const percentage = safePercentage(assignment.score, assignment.totalScore);

  // Always use the calculated weight passed to this function,
  // not any stored effectiveWeight
  const effectiveWeight = weight;

  if (percentage === null || !isValidWeight(effectiveWeight)) {
    return { pointsObtained: 0, pointsTotal: 0 };
  }

  return {
    pointsObtained: percentage * effectiveWeight,
    // Only count non-extra credit assignments towards effective weight
    pointsTotal: assignment.isExtraCredit ? 0 : effectiveWeight,
  };
};

// Calculates the overall course grade percentage
export const calculateOverallGrade = (
  allAssignments: Assignment[],
  groups: AssignmentGroup[]
): number | null => {
  // Filter out assignments marked as dropped
  const assignments = allAssignments.filter((a) => !a.isDropped);

  let totalPointsObtained = 0;
  let totalPointsTotal = 0;

  // Process each assignment with dynamic weight calculation
  // Note: We always calculate weights dynamically rather than using stored values
  // to ensure the grade calculation is accurate with the latest assignment data
  assignments.forEach((assignment) => {
    // Always calculate the weight, never use stored effectiveWeight
    const weight =
      calculateEffectiveWeight(assignment, allAssignments, groups) || 0;

    const { pointsObtained, pointsTotal } = calculateAssignmentContribution(
      assignment,
      weight
    );

    totalPointsObtained += pointsObtained;
    totalPointsTotal += pointsTotal;
  });

  // Calculate final percentage
  if (totalPointsTotal === 0) {
    return null; // No graded, weighted items yet
  }

  const finalPercentage = (totalPointsObtained / totalPointsTotal) * 100;
  // Ensure grade isn't negative due to weird inputs, allow extra credit (>100)
  return Math.max(0, finalPercentage);
};

// Function to determine letter grade based on cutoffs
export const getLetterGrade = (
  percentage: number | null,
  cutoffs: GradeCutoff[]
): string => {
  if (percentage === null) {
    return "-"; // Default for ungraded
  }
  // Ensure cutoffs is a valid array, provide default empty array if not
  const validCutoffs = Array.isArray(cutoffs) ? cutoffs : [];

  // Sort cutoffs descending by minimum percentage required
  const sortedCutoffs = validCutoffs
    .filter(
      (c) => typeof c.minPercentage === "number" && typeof c.grade === "string"
    ) // Filter invalid entries
    .sort((a, b) => b.minPercentage - a.minPercentage);

  // Find the first cutoff the percentage meets or exceeds
  for (const cutoff of sortedCutoffs) {
    if (percentage >= cutoff.minPercentage) {
      return cutoff.grade;
    }
  }

  // If no cutoff matched (e.g., percentage is below the lowest defined cutoff)
  // Return 'F' or the grade associated with the lowest percentage (often 0)
  const lowestGrade =
    sortedCutoffs.find((c) => c.minPercentage <= 0)?.grade || "F";
  return lowestGrade;
};
