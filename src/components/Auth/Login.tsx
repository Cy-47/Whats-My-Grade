// src/components/Auth/Login.tsx
import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../firebase";
import { useAuth } from "../../contexts/AuthContext";
import { FcGoogle } from "react-icons/fc"; // Import Google icon
import { Link } from "react-router-dom"; // Import Link from react-router-dom

const Login: React.FC = () => {
  const { signInWithEmail, error, clearError } = useAuth(); // Access global error and clearError
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("Sign-in failed.");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); // Clear any previous error
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch {
      // Error is already handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-indigo-100 p-4">
      <div className="bg-white p-8 sm:p-12 rounded-xl shadow-2xl text-center max-w-md w-full transform transition-all hover:scale-[1.01]">
        <h1 className="text-3xl sm:text-4xl font-bold mb-5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
          What's My Grade?
        </h1>
        <p className="text-gray-600 mb-8 text-base sm:text-lg">
          Sign in to track your grades effortlessly.
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-md shadow-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <button
            onClick={handleGoogleSignIn}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FcGoogle className="text-xl mr-2" />
            Sign In with Google
          </button>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link
            to="/forgot-password"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Forgot Password?
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
