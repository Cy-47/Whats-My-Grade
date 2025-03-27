# What's My Grade?

A web application designed for students to easily track their grades across multiple courses. It features real-time grade calculations based on assignments, weights, and grouping, with persistent storage using Firebase.

[Try it](https://whats-my-grade.web.app/) now!

> [!NOTE]  
> This project is mostly implemented by AI.

<!-- Optional: Add a screenshot or GIF here -->
<!-- ![Screenshot of What's My Grade? App](link/to/your/screenshot.png) -->

## Features

- **Course Management:** Create, manage, and switch between multiple courses.
- **Assignment Tracking:** Add assignments with details like score, total possible score, weight, and optional deadlines.
- **Editable Grid:** Spreadsheet-like interface for easily adding and editing assignments inline per course.
- **Keyboard Navigation:** Navigate the assignment grid using Arrow Keys and Enter for faster data entry.
- **Assignment Grouping:** Create assignment groups (e.g., "Homework", "Exams") with overall weights.
- **Flexible Weighting:**
  - Assign weights directly to individual assignments.
  - Assign weights to groups, distributed equally or manually among assignments within the group.
- **Dropping Assignments:** Mark assignments to be excluded from grade calculation.
- **Real-time Calculation:** Overall course grade percentage and letter grade update instantly as data changes.
- **Customizable Grade Cutoffs:** Define your own letter grade boundaries (e.g., A >= 90) for each course.
- **Data Persistence:** All data is securely stored in Firestore and linked to the user's account, available across sessions.

## Technology Stack

- **Frontend:** React, TypeScript
- **Styling:** Tailwind CSS
- **Backend & Services:** Firebase
  - **Authentication:** Firebase Authentication (Google Provider)
  - **Database:** Cloud Firestore
  - **Hosting:** Firebase Hosting

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js:** >= 16.x recommended. Download from [nodejs.org](https://nodejs.org/)
- **npm:** (Comes with Node.js) or **Yarn:** (Optional package manager)
- **Firebase Account:** A Google account to create and manage Firebase projects ([firebase.google.com](https://firebase.google.com/))
- **Firebase CLI:** Install globally if you haven't already:
  ```bash
  npm install -g firebase-tools
  ```

### Installation & Setup

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/Cy-47/Whats-My-Grade.git
    cd Whats-My-Grade
    ```

2.  **Firebase Project Setup:**

    - Go to the [Firebase Console](https://console.firebase.google.com/).
    - Create a new Firebase project (or use an existing one).
    - Navigate to **Project Settings** > **General**. Under "Your apps", click the Web icon (`</>`) to add a new web app.
    - Register the app (give it a nickname). **Important:** Copy the `firebaseConfig` object provided. You'll need it shortly.
    - Go to **Build** > **Authentication** > **Sign-in method**. Enable the **Google** provider.
    - Go to **Build** > **Firestore Database**. Create a database, start in **Production mode** (you'll configure rules later), and choose a location.
    - Go to **Build** > **Hosting**. Click "Get started" (if you haven't before).

3.  **Environment Variables:**

    - Create a file named `.env` in the root of your project directory.
    - Paste the `firebaseConfig` values into the `.env` file, prefixing each key with `REACT_APP_` (if using Create React App) or `VITE_` (if using Vite). **Adapt the prefix based on your project setup.**

    ```dotenv
    # .env

    # Example using REACT_APP_ prefix (for Create React App)
    REACT_APP_FIREBASE_API_KEY=AIzaSy...
    REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
    REACT_APP_FIREBASE_PROJECT_ID=your-project-id
    REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
    REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abc123def456
    REACT_APP_FIREBASE_MEASUREMENT_ID=G-ABC123XYZ # Optional
    ```

    - **Note:** This `.env` file is ignored by Git (see `.gitignore`) and should **not** be committed.

4.  **Install Dependencies:**

    ```bash
    npm install
    # or
    yarn install
    ```

5.  **Run the Development Server:**
    ```bash
    npm start
    # or (often for Vite)
    npm run dev
    # or
    yarn start / yarn dev
    ```
    The application should now be running locally, typically at `http://localhost:3000` (or another port like 5173 for Vite).

## Usage

1.  Open the application in your browser.
2.  Click "Sign In with Google" to authenticate.
3.  Use the sidebar to create your first course (e.g., "Calculus I").
4.  Select the course.
5.  Use the "Add Assignment" button or press Enter in the last row of the table to add assignments.
6.  Fill in the assignment details (Name, Score, Total, Weight/Group).
7.  Manage assignment groups and grade cutoffs using the dedicated sections.
8.  Your overall grade will update in real-time as you enter data.

## Deployment

This project is configured for deployment to Firebase Hosting.

1.  **Log in to Firebase CLI:**

    ```bash
    firebase login
    ```

2.  **Initialize Firebase (if not done already):**
    Run `firebase init` in the project root. Select **Hosting**, use an existing project, choose your project, set the public directory to `build` (or `dist`), configure as a single-page app (`Yes`), and decline GitHub deploys for now. Ensure you **do not** overwrite `build/index.html` if prompted.

3.  **Build the Application:**

    ```bash
    npm run build
    # or
    yarn build
    ```

4.  **Deploy to Firebase Hosting:**
    ```bash
    firebase deploy --only hosting
    ```
    Firebase CLI will provide the URL where your app is deployed (e.g., `your-project-id.web.app`).

## Firebase Configuration Notes

- **Firestore Security Rules (`firestore.rules`):** The current rules allow read/write access for any authenticated user to their own data under `/users/{userId}`. Review and potentially tighten these rules for production use cases. Deploy rules using `firebase deploy --only firestore:rules`.
- **Hosting Rules (`firebase.json`):** Configured to serve the `build` (or `dist`) directory and rewrite all routes to `/index.html` to support client-side routing (React Router).

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
