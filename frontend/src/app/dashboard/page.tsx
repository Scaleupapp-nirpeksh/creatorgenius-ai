// frontend/src/app/dashboard/page.tsx
"use client"; // Need client-side hooks for auth and routing

import React from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout } = useAuth(); // Get user info and logout function
  const router = useRouter();

  const handleLogout = () => {
    logout(); // Call the logout function from context (clears token/user state)
    router.push('/login'); // Redirect to the login page
  };

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {/* Display user name if available */}
          Welcome{user ? `, ${user.name}` : ''}!
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Log Out
        </button>
      </div>

      <p>This is your CreatorGenius AI dashboard.</p>
      <p>This page should be protected.</p>

      {/* Display some user info from context if needed */}
      {/* {user && (
        <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
          {JSON.stringify(user, null, 2)}
        </pre>
      )} */}

      {/* Add actual dashboard content here later */}
    </div>
  );
}