// frontend/src/app/(protected)/dashboard/page.tsx
"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-800">
          Welcome{user ? `, ${user.name}` : ''}!
        </h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Log Out
        </button>
      </div>

      <p className="mb-8 text-gray-600">
        Your CreatorGenius AI dashboard. Access your tools below.
        <span className="block text-sm text-gray-500 mt-1">
          {new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}, {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })} - Bengaluru
        </span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* AI Content Ideation Card */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-indigo-700">AI Content Ideation</h2>
          <p className="text-sm text-gray-600 mb-4">Generate fresh content ideas tailored to your niche and audience using AI.</p>
          <Link href="/ideation">
            <span className="inline-block px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              Go to Ideation Tool
            </span>
          </Link>
        </div>

        {/* Saved Ideas Card */}
        <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-3 text-indigo-700">Saved Ideas</h2>
          <p className="text-sm text-gray-600 mb-4">View, manage, and organize your collection of saved content ideas.</p>
          <Link href="/saved-ideas">
            <span className="inline-block px-5 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              View Saved Ideas
            </span>
          </Link>
        </div>

        {/* Example Placeholder Card for Future Feature */}
        <div className="bg-white p-6 rounded-lg shadow opacity-50">
          <h2 className="text-xl font-semibold mb-3 text-gray-500">SEO Assistant</h2>
          <p className="text-sm text-gray-600 mb-4">Optimize your content metadata for better discoverability. (Coming Soon)</p>
          <span className="inline-block px-5 py-2 text-sm font-medium text-gray-400 bg-gray-200 border border-transparent rounded-md shadow-sm cursor-not-allowed">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}