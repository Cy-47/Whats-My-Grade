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

/**
 * Calculates an assignment's effective weight contribution to the overall grade.
 *
 * The effective weight differs based on several factors:
 * 1. For non-grouped assignments: Uses direct weight value assigned to the assignment
 * 2. For grouped assignments: Derives weight from the group's total weight and the assignment's
 *    position within that group, using one of two methods:
 *    a. Equal distribution: Each non-dropped assignment gets an equal portion of the group's weight
 *    b. Manual weighting: Assignments with specified relative weights get proportionate shares
 *       of the group's weight based on those values
 *
 * @param assignment - The assignment to calculate effective weight for
 * @param allAssignments - All assignments in the course (needed for group calculations)
 * @param groups - All assignment groups in the course
 * @returns The calculated effective weight as a number, or null if not calculable
 */
export const calculateEffectiveWeight = (
  assignment: Assignment,
  allAssignments: Assignment[],
  groups: AssignmentGroup[]
): number | null => {
  // Dropped assignments always have zero weight contribution
  if (assignment.isDropped) return 0;

  // Case 1: Non-grouped assignment - use direct weight value
  if (!assignment.groupId) {
    // Not grouped
    return typeof assignment.weight === "number" ? assignment.weight : null;
  }

  // Case 2: Grouped assignment logic
  const group = groups.find((g) => g.id === assignment.groupId);

  // Safety check: Ensure group exists and has valid weight
  if (!group || typeof group.weight !== "number" || group.weight <= 0) return 0;

  // Get all non-dropped assignments in this group
  const groupAssignments = allAssignments.filter(
    (a) => a.groupId === group.id && !a.isDropped
  );
  const numberOfAssignmentsInGroup = groupAssignments.length;

  // If no active assignments in group, weight is zero
  if (numberOfAssignmentsInGroup === 0) return 0;

  // Detect if this group uses manual relative weighting
  // (true if any non-dropped assignment has a relative weight set)
  const groupUsesManualWeight = groupAssignments.some(
    (a) =>
      typeof a.relativeWeightInGroup === "number" && a.relativeWeightInGroup > 0
  );

  if (groupUsesManualWeight) {
    // Case 2a: Manual relative weighting within group
    // Sum up all relative weights in the group
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

    // Safety check: Avoid division by zero
    if (totalRelativeWeightInGroup === 0) return 0;

    // Calculate the assignment's proportional share of the group weight
    const assignmentRelativeWeight =
      typeof assignment.relativeWeightInGroup === "number"
        ? assignment.relativeWeightInGroup
        : 0;
    return (
      group.weight * (assignmentRelativeWeight / totalRelativeWeightInGroup)
    );
  } else {
    // Case 2b: Equal weighting - each assignment gets the same portion of group weight
    return group.weight / numberOfAssignmentsInGroup;
  }
};

/**
 * Calculates an assignment's contribution to the overall grade based on:
 * 1. The percentage achieved on the assignment (score/totalScore)
 * 2. The effective weight of the assignment toward the final grade
 *
 * @param assignment - The assignment to calculate the contribution for
 * @param weight - The effective weight of the assignment (pre-calculated)
 * @returns An object containing points obtained and points total for grade calculation
 */
const calculateAssignmentContribution = (
  assignment: Assignment,
  weight: number
): { pointsObtained: number; pointsTotal: number } => {
  // Calculate the percentage achieved on this assignment (null if can't calculate)
  const percentage = safePercentage(assignment.score, assignment.totalScore);

  // Always use the calculated weight passed to this function,
  // not any stored effectiveWeight
  const effectiveWeight = weight;

  // If we can't calculate a valid percentage or weight, contribute nothing
  if (percentage === null || !isValidWeight(effectiveWeight)) {
    return { pointsObtained: 0, pointsTotal: 0 };
  }

  return {
    // Points obtained = percentage achieved × effective weight
    pointsObtained: percentage * effectiveWeight,

    // For grade denominator: only count non-extra credit assignments
    // (extra credit adds to numerator only, not denominator)
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
