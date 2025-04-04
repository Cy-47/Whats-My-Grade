import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  DocumentReference,
  Timestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { Course, Assignment, AssignmentGroup, GradeCutoff } from "../types";

/**
 * Centralized service for all Firebase operations related to courses and assignments.
 * Provides methods for CRUD operations and real-time data subscriptions.
 */
export class FirebaseService {
  /**
   * Get path to a specific course collection or document.
   */
  private static getCoursePath(
    userId: string,
    courseId?: string,
    subcollection?: string,
    documentId?: string
  ): string {
    let path = `users/${userId}/courses`;
    if (courseId) path += `/${courseId}`;
    if (subcollection) path += `/${subcollection}`;
    if (documentId) path += `/${documentId}`;
    return path;
  }

  /**
   * Subscribe to a course document for real-time updates.
   */
  static subscribeToCourse(
    userId: string,
    courseId: string,
    onData: (course: Course | null) => void,
    onError: (error: Error) => void
  ): () => void {
    const courseRef = doc(db, this.getCoursePath(userId, courseId));
    return onSnapshot(
      courseRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onData({ id: snapshot.id, ...snapshot.data() } as Course);
        } else {
          onData(null);
        }
      },
      onError
    );
  }

  /**
   * Subscribe to assignments collection for real-time updates.
   */
  static subscribeToAssignments(
    userId: string,
    courseId: string,
    onData: (assignments: Assignment[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const assignmentsRef = collection(
      db,
      this.getCoursePath(userId, courseId, "assignments")
    );
    const q = query(assignmentsRef, orderBy("displayOrder", "asc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const assignments = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Assignment)
        );
        onData(assignments);
      },
      onError
    );
  }

  /**
   * Subscribe to assignment groups collection for real-time updates.
   */
  static subscribeToAssignmentGroups(
    userId: string,
    courseId: string,
    onData: (groups: AssignmentGroup[]) => void,
    onError: (error: Error) => void
  ): () => void {
    const groupsRef = collection(
      db,
      this.getCoursePath(userId, courseId, "assignmentGroups")
    );
    const q = query(groupsRef, orderBy("createdAt", "asc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const groups = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as AssignmentGroup)
        );
        onData(groups);
      },
      onError
    );
  }

  /**
   * Update course information (name, grade cutoffs, etc.)
   */
  static async updateCourse(
    userId: string,
    courseId: string,
    data: Partial<Course>
  ): Promise<void> {
    const courseRef = doc(db, this.getCoursePath(userId, courseId));
    return updateDoc(courseRef, data);
  }

  /**
   * Delete a course and all its subcollections
   */
  static async deleteCourse(userId: string, courseId: string): Promise<void> {
    // For a production app, use a Cloud Function to handle all subcollection deletion
    // Here we'll just delete the main document for simplicity
    const courseRef = doc(db, this.getCoursePath(userId, courseId));
    return deleteDoc(courseRef);
  }

  /**
   * Add a new assignment group
   */
  static async addAssignmentGroup(
    userId: string,
    courseId: string,
    groupData: Omit<AssignmentGroup, "id" | "createdAt">
  ): Promise<string> {
    const groupsRef = collection(
      db,
      this.getCoursePath(userId, courseId, "assignmentGroups")
    );

    const docRef = await addDoc(groupsRef, {
      ...groupData,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Update an assignment group
   */
  static async updateAssignmentGroup(
    userId: string,
    courseId: string,
    groupId: string,
    data: Partial<AssignmentGroup>
  ): Promise<void> {
    const groupRef = doc(
      db,
      this.getCoursePath(userId, courseId, "assignmentGroups", groupId)
    );
    return updateDoc(groupRef, data);
  }

  /**
   * Delete an assignment group
   */
  static async deleteAssignmentGroup(
    userId: string,
    courseId: string,
    groupId: string
  ): Promise<void> {
    const groupRef = doc(
      db,
      this.getCoursePath(userId, courseId, "assignmentGroups", groupId)
    );
    return deleteDoc(groupRef);
  }

  /**
   * Add a new assignment
   */
  static async addAssignment(
    userId: string,
    courseId: string,
    assignmentData: Omit<Assignment, "id" | "createdAt" | "displayOrder">
  ): Promise<string> {
    // Get the highest display order first
    const assignmentsRef = collection(
      db,
      this.getCoursePath(userId, courseId, "assignments")
    );

    const q = query(assignmentsRef, orderBy("displayOrder", "desc"));
    const snapshot = await getDocs(q);
    const highestOrder = snapshot.empty
      ? 10
      : (snapshot.docs[0].data().displayOrder || 0) + 10;

    const docRef = await addDoc(assignmentsRef, {
      ...assignmentData,
      displayOrder: highestOrder,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  /**
   * Update an assignment
   */
  static async updateAssignment(
    userId: string,
    courseId: string,
    assignmentId: string,
    data: Partial<Assignment>
  ): Promise<void> {
    const assignmentRef = doc(
      db,
      this.getCoursePath(userId, courseId, "assignments", assignmentId)
    );
    return updateDoc(assignmentRef, data);
  }

  /**
   * Delete an assignment
   */
  static async deleteAssignment(
    userId: string,
    courseId: string,
    assignmentId: string
  ): Promise<void> {
    const assignmentRef = doc(
      db,
      this.getCoursePath(userId, courseId, "assignments", assignmentId)
    );
    return deleteDoc(assignmentRef);
  }

  /**
   * Update the display order of multiple assignments (for drag and drop)
   */
  static async updateAssignmentOrder(
    userId: string,
    courseId: string,
    orderedAssignments: { id: string; displayOrder: number }[]
  ): Promise<void> {
    const batch = writeBatch(db);

    orderedAssignments.forEach(({ id, displayOrder }) => {
      const assignmentRef = doc(
        db,
        this.getCoursePath(userId, courseId, "assignments", id)
      );
      batch.update(assignmentRef, { displayOrder });
    });

    return batch.commit();
  }

  /**
   * Update grade cutoffs for a course
   */
  static async updateGradeCutoffs(
    userId: string,
    courseId: string,
    cutoffs: GradeCutoff[]
  ): Promise<void> {
    return this.updateCourse(userId, courseId, { gradeCutoffs: cutoffs });
  }
}
