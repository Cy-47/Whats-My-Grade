// src/types.ts
import { Timestamp } from "firebase/firestore"; // Import Timestamp type

// Basic user profile information
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Structure for grade cutoff definitions (e.g., A >= 90)
export interface GradeCutoff {
  id: string; // Unique ID for React keys during editing
  grade: string;
  minPercentage: number;
}

// Structure for a Course document
export interface Course {
  id: string; // Firestore document ID
  name: string;
  userId: string; // UID of the owner user
  gradeCutoffs: GradeCutoff[]; // Array of grade cutoffs stored directly
  createdAt: Timestamp; // Timestamp of creation
}

// Structure for an Assignment Group document
export interface AssignmentGroup {
  id: string; // Firestore document ID
  courseId: string;
  userId: string;
  name: string;
  weight: number; // Overall weight (percentage) towards the course grade
  createdAt: Timestamp;
}

// Structure for an Assignment document
export interface Assignment {
  id: string; // Firestore document ID
  courseId: string;
  userId: string;
  name: string;
  score: number | null; // Points earned (null if ungraded)
  totalScore: number | null; // Max points possible (null if not set)
  weight: number; // Direct weight percentage (used ONLY if not in a group)
  deadline?: Timestamp | null; // Optional deadline
  isDropped: boolean; // Flag to exclude from calculations
  isExtraCredit: boolean; // Flag to indicate extra credit (adds to score but not total)
  groupId?: string | null; // Optional ID of the AssignmentGroup it belongs to
  relativeWeightInGroup?: number | null; // Optional manual weight WITHIN the group
  createdAt: Timestamp;
}

// Helper type for passing data needed for grade calculations
export interface CourseDataForCalc {
  assignments: Assignment[];
  groups: AssignmentGroup[];
  gradeCutoffs: GradeCutoff[];
}
