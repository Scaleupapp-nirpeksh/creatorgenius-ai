// frontend/src/app/(auth)/login/page.tsx
"use client"; // This page requires client-side interactivity

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // For linking to signup page

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth(); // Get login function and auth status
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard'); // Redirect to dashboard or home page
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Basic client-side validation
    if (!email || !password) {
        setError("Email and password are required.");
        setLoading(false);
        return;
    }

    try {
      await login({ email, password });
      // Login successful - AuthContext handles token/user state
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      // Handle errors (e.g., "Invalid credentials") from the login function in AuthContext
      console.error("Login page error catch:", err);
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
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
          Log in to CreatorGenius AI
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="********"
              disabled={loading}
            />
          </div>

           {/* Forgot Password Link (Optional) */}
           {/* <div className="text-sm text-right">
             <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
               Forgot your password?
             </a>
           </div> */}

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
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </div>
        </form>
         <p className="mt-4 text-sm text-center text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign Up
            </Link>
        </p>
      </div>
    </div>
  );
}