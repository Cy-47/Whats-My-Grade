// src/components/Auth/Login.tsx
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";

const Login: React.FC = () => {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      let message = "An unknown error occurred during sign-in.";
      if (error instanceof Error) {
        message = error.message;
      }
      alert(`Sign-in failed: ${message}`);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-indigo-100 p-4">
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-2xl text-center max-w-md w-full transform transition-all hover:scale-[1.01]">
        <h1 className="text-3xl sm:text-4xl font-bold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          What's My Grade?
        </h1>
        <p className="text-gray-600 mb-8 text-base sm:text-lg">
          Sign in with Google to track your grades effortlessly.
        </p>
        <button
          onClick={handleGoogleSignIn}
          className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out transform hover:scale-105"
        >
          Sign In with Google
        </button>
      </div>
    </div>
  );
};

export default Login;
