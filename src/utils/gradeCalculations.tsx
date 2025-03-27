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

// Calculates the overall course grade percentage
export const calculateOverallGrade = (
  allAssignments: Assignment[],
  groups: AssignmentGroup[]
): number | null => {
  // Filter out assignments marked as dropped
  const assignments = allAssignments.filter((a) => !a.isDropped);

  let totalWeightedScore = 0; // Sum of (item percentage * item effective weight)
  let totalEffectiveWeight = 0; // Sum of effective weights of all graded items

  // 1. Process assignments NOT in any group
  const ungroupedAssignments = assignments.filter((a) => !a.groupId);
  ungroupedAssignments.forEach((a) => {
    const percentage = safePercentage(a.score, a.totalScore);
    // Use assignment's direct weight, ensure it's a valid positive number
    const weight = typeof a.weight === "number" && a.weight > 0 ? a.weight : 0;
    if (percentage !== null && weight > 0) {
      totalWeightedScore += percentage * weight;
      totalEffectiveWeight += weight;
    }
    // Ungraded assignments or those with zero/invalid weight don't contribute yet
  });

  // 2. Process assignments within groups
  groups.forEach((group) => {
    const groupAssignments = assignments.filter((a) => a.groupId === group.id);
    // Ensure group weight is a valid positive number
    const groupWeight =
      typeof group.weight === "number" && group.weight > 0 ? group.weight : 0;

    // Skip empty groups or groups with no weight assigned
    if (groupAssignments.length === 0 || groupWeight <= 0) {
      return;
    }

    let groupScoreSum = 0; // For equal point-based weighting score part
    let groupTotalPossible = 0; // For equal point-based weighting total part
    let groupManualWeightTotal = 0; // Sum of relative weights in group for manual weighting
    let groupWeightedScoreSumManual = 0; // Weighted score sum for manual weighting

    // Check if *any* assignment in this group uses manual relative weighting
    const usesManualWeight = groupAssignments.some(
      (a) =>
        typeof a.relativeWeightInGroup === "number" &&
        a.relativeWeightInGroup > 0
    );

    if (usesManualWeight) {
      // --- Manual Weighting within Group ---
      // Calculate total manual weight within the group for normalization
      groupAssignments.forEach((a) => {
        const relWeight =
          typeof a.relativeWeightInGroup === "number"
            ? a.relativeWeightInGroup
            : 0;
        if (relWeight > 0) {
          groupManualWeightTotal += relWeight;
        }
      });

      // If total relative weight is positive, calculate contribution
      if (groupManualWeightTotal > 0) {
        groupAssignments.forEach((a) => {
          const percentage = safePercentage(a.score, a.totalScore);
          const relativeWeight =
            typeof a.relativeWeightInGroup === "number"
              ? a.relativeWeightInGroup
              : 0;
          // Include only graded items with positive relative weight
          if (percentage !== null && relativeWeight > 0) {
            // Contribution to group score = (item score %) * (item relative weight / total relative weight in group)
            groupWeightedScoreSumManual +=
              percentage * (relativeWeight / groupManualWeightTotal);
          }
        });
        // The group's score (0 to 1) is the sum of normalized weighted contributions
        const groupScore = groupWeightedScoreSumManual;
        // Add the group's overall contribution to the course total
        totalWeightedScore += groupScore * groupWeight;
        totalEffectiveWeight += groupWeight; // The group's weight counts towards the total effective weight
      }
      // If manual weights sum to 0, group contributes nothing yet.
    } else {
      // --- Equal Weighting within Group (Based on points) ---
      groupAssignments.forEach((a) => {
        // Only include graded assignments with valid points
        if (
          typeof a.score === "number" &&
          typeof a.totalScore === "number" &&
          a.totalScore > 0
        ) {
          groupScoreSum += a.score;
          groupTotalPossible += a.totalScore;
        }
      });

      // Calculate group score only if there were valid points possible
      if (groupTotalPossible > 0) {
        const groupScore = groupScoreSum / groupTotalPossible; // Group score (0 to 1)
        // Add the group's contribution to the overall total
        totalWeightedScore += groupScore * groupWeight;
        totalEffectiveWeight += groupWeight; // Group's weight counts
      }
      // If groupTotalPossible is 0, group contributes nothing yet
    }
  });

  // 3. Calculate final percentage
  if (totalEffectiveWeight === 0) {
    return null; // No graded, weighted items yet
  }

  const finalPercentage = (totalWeightedScore / totalEffectiveWeight) * 100;
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
