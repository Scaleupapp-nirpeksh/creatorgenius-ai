// frontend/src/app/(auth)/signup/page.tsx
"use client"; // This page requires client-side interactivity

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For linking to login page

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, isAuthenticated } = useAuth(); // Get register function and auth status
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard'); // Redirect to dashboard or home page
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    setLoading(true);

    // Basic client-side validation
    if (!name || !email || !password) {
        setError("All fields are required.");
        setLoading(false);
        return;
    }
    if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
    }

    try {
      await register({ name, email, password });
      // Registration successful - The AuthContext handles setting the token/user
      // Redirect to a protected page (e.g., dashboard)
      router.push('/dashboard'); // Or show a success message before redirect
    } catch (err: any) {
      // Handle errors thrown from the register function in AuthContext
      console.error("Signup page error catch:", err);
      setError(err.message || 'Registration failed. Please try again.'); // Display error message
    } finally {
      setLoading(false); // Ensure loading is set to false
    }
  };

  // Don't render the form if redirecting or already authenticated
  if (isAuthenticated) {
      return <p className="text-center mt-10">Redirecting...</p>; // Or a loading spinner
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-gray-900">
          Create your CreatorGenius AI account
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name Input */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Your Name"
              disabled={loading}
            />
          </div>

          {/* Email Input */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="********"
              disabled={loading}
            />
             <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>
         <p className="mt-4 text-sm text-center text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Log In
            </Link>
        </p>
      </div>
    </div>
  );
}