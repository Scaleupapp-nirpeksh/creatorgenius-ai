// frontend/src/app/(protected)/layout.tsx
"use client"; // This layout component needs to use client-side hooks

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Optional: Re-check auth status in case the context hasn't updated yet
    // This might be redundant if checkAuthStatus runs correctly on initial load in AuthProvider
    // checkAuthStatus();

    // If loading is finished and the user is not authenticated, redirect
    if (!isLoading && !isAuthenticated) {
      console.log("ProtectedLayout: Not authenticated, redirecting to login.");
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]); // Dependencies for the effect

  // While loading, show a loading indicator (or nothing)
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading authentication status...</div>; // Or a proper spinner component
  }

  // If authenticated, render the actual page content
  if (isAuthenticated) {
    return <>{children}</>; // Render the child page (e.g., Dashboard)
  }

  // If not loading and not authenticated, theoretically the redirect is happening.
  // Return null or a loading indicator to avoid flashing content before redirect completes.
  return <div className="flex justify-center items-center min-h-screen">Redirecting to login...</div>;
}