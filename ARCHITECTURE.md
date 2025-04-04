# What's My Grade? - Architecture Documentation

This document describes the technical architecture of the What's My Grade? application.

## Overview

What's My Grade? is a React application built with TypeScript that uses Firebase for authentication, data storage, and hosting. The application follows a component-based architecture with a focus on real-time updates and calculations.

## Technology Stack

- **Frontend**: React, TypeScript
- **UI Framework**: Tailwind CSS
- **Backend & Services**: Firebase
  - Authentication: Firebase Authentication (Google Provider)
  - Database: Cloud Firestore
  - Hosting: Firebase Hosting
- **State Management**: React Context API
- **Routing**: React Router
- **Drag & Drop**: @dnd-kit

## Project Structure

```
src/
├── components/          # UI components
│   ├── Course/          # Course-related components
│   ├── Sidebar/         # Navigation sidebar components
│   └── Auth/            # Authentication-related components
├── contexts/            # React contexts for state management
├── utils/               # Utility functions (calculations, formatting)
├── types.ts             # TypeScript type definitions
├── firebase.ts          # Firebase configuration
├── index.tsx            # Application entry point
└── index.css            # Global styles
```

## Data Model

The application uses Firestore with the following data structure:

```
users/
└── {userId}/
    ├── courses/
    │   └── {courseId}/
    │       ├── assignments/
    │       │   └── {assignmentId}/
    │       └── assignmentGroups/
    │           └── {groupId}/
```

### Key Entities

1. **Course**

   - `id`: string
   - `name`: string
   - `userId`: string
   - `gradeCutoffs`: GradeCutoff[]
   - `createdAt`: Timestamp

2. **Assignment**

   - `id`: string
   - `courseId`: string
   - `userId`: string
   - `name`: string
   - `score`: number | null
   - `totalScore`: number | null
   - `weight`: number
   - `deadline`: Timestamp | null
   - `isDropped`: boolean
   - `isExtraCredit`: boolean
   - `groupId`: string | null
   - `relativeWeightInGroup`: number | null
   - `createdAt`: Timestamp
   - `displayOrder`: number

3. **AssignmentGroup**
   - `id`: string
   - `courseId`: string
   - `userId`: string
   - `name`: string
   - `weight`: number
   - `createdAt`: Timestamp

## Component Architecture

### Key Components

1. **CourseView**: Main container for a single course view

   - Loads and displays course data
   - Manages course-level operations (rename, delete)
   - Displays overall grade

2. **AssignmentTable**: Manages the assignments grid

   - Handles assignment CRUD operations
   - Implements drag-and-drop reordering
   - Displays assignments in a tabular format

3. **AssignmentRow**: Represents a single assignment

   - Handles inline editing of assignment fields
   - Manages assignment-specific actions (drop, mark as extra credit)

4. **GroupManager**: Manages assignment groups

   - Creates, edits, and deletes assignment groups
   - Displays group weights

5. **GradeCutoffsEditor**: Manages grade letter cutoffs
   - Edits the percentage thresholds for letter grades

## Authentication Flow

1. User clicks "Sign In with Google"
2. Firebase Authentication handles the OAuth flow
3. On successful auth, the user's UID is used to create/access their data
4. An AuthContext provides auth state throughout the application

## Real-time Updates

The application uses Firestore listeners (via `onSnapshot`) to react to data changes:

1. Course details are fetched and updated in real-time
2. Assignments update as they're modified
3. Grade calculations happen client-side whenever relevant data changes

## Deployment Architecture

The application is deployed to Firebase Hosting with the following configuration:

1. React app is built into static assets
2. Firebase Hosting serves these assets
3. Client-side routing is enabled through URL rewrites
4. Firebase Security Rules protect data access
