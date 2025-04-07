// frontend/src/app/(protected)/layout.tsx
"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import NavHeader from '@/components/NavHeader';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("ProtectedLayout: Not authenticated, redirecting to login.");
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // While loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="spinner h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading authentication status...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the actual page content with the navigation header
  if (isAuthenticated) {
    return (
      <>
        <NavHeader />
        {children}
      </>
    );
  }

  // If not loading and not authenticated, theoretically the redirect is happening.
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-center">
        <div className="spinner h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p>Redirecting to login...</p>
      </div>
    </div>
  );
}