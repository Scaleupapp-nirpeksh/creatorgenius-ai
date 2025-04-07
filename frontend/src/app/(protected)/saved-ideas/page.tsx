// frontend/src/app/(protected)/saved-ideas/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSavedIdeasApi, deleteIdeaApi, Idea } from '@/services/api';
import Link from 'next/link';

export default function SavedIdeasPage() {
  const { token } = useAuth();
  
  // State
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch saved ideas
  const fetchSavedIdeas = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getSavedIdeasApi(token);
      if (response.success) {
        setIdeas(response.data);
      } else {
        setError("Failed to fetch your saved ideas.");
      }
    } catch (err: any) {
      console.error("Error fetching saved ideas:", err);
      setError(err.message || "An error occurred while loading your ideas.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Delete an idea
  const handleDeleteIdea = async (ideaId: string) => {
    if (!token || !ideaId || deletingIds.has(ideaId)) return;
    
    setDeleteError(null);
    setDeletingIds(prev => new Set(prev).add(ideaId));
    
    try {
      const response = await deleteIdeaApi(ideaId, token);
      if (response.success) {
        // Remove the idea from the state
        setIdeas(ideas.filter(idea => idea._id !== ideaId));
      } else {
        setDeleteError("Failed to delete the idea. Please try again.");
      }
    } catch (err: any) {
      console.error("Error deleting idea:", err);
      setDeleteError(err.message || "An error occurred while deleting the idea.");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(ideaId);
        return newSet;
      });
    }
  };

  // Load ideas on component mount
  useEffect(() => {
    fetchSavedIdeas();
  }, [fetchSavedIdeas]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Saved Ideas</h1>
        <Link href="/ideation">
          <span className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
            Generate New Ideas
          </span>
        </Link>
      </div>
      
      {/* Display error message if any */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      {/* Display delete error if any */}
      {deleteError && (
        <div className="mb-6 p-4 bg-yellow-100 text-yellow-700 rounded-md">
          {deleteError}
        </div>
      )}
      
      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg text-indigo-600">Loading your saved ideas...</p>
        </div>
      )}
      
      {/* Empty state */}
      {!loading && ideas.length === 0 && (
        <div className="bg-white p-10 rounded-lg shadow text-center">
          <h2 className="text-xl font-semibold mb-3 text-gray-800">No saved ideas yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't saved any content ideas yet. Generate some ideas and save them to see them here.
          </p>
          <Link href="/ideation">
            <span className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              Go to Ideation Tool
            </span>
          </Link>
        </div>
      )}
      
      {/* Display saved ideas */}
      {!loading && ideas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ideas.map((idea) => {
            const isDeleting = idea._id ? deletingIds.has(idea._id) : false;
            
            return (
              <div key={idea._id} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-shadow flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-2 text-indigo-700">{idea.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <strong className="font-medium text-gray-800">Angle:</strong> {idea.angle}
                  </p>
                  
                  {idea.hook && (
                    <p className="text-sm text-gray-600 mb-3">
                      <strong className="font-medium text-gray-800">Hook Idea:</strong> {idea.hook}
                    </p>
                  )}
                  
                  {idea.intendedEmotion && (
                    <p className="text-sm text-gray-600 mb-3">
                      <strong className="font-medium text-gray-800">Intended Emotion:</strong> {idea.intendedEmotion}
                    </p>
                  )}
                  
                  {idea.structure_points && idea.structure_points.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-800 mb-1">Structure Points:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {idea.structure_points.map((point, pIndex) => (
                          <li key={pIndex}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {idea.platform_suitability && (
                    <p className="text-sm text-gray-600 mb-3">
                      <strong className="font-medium text-gray-800">Platform Suitability:</strong> {idea.platform_suitability}
                    </p>
                  )}
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-800 mb-1">Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {idea.tags.map((tag, tIndex) => (
                        <span key={tIndex} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {idea.savedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Saved on: {new Date(idea.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
                
                {/* Delete button */}
                <div className="mt-4 pt-4 border-t border-gray-200 text-right">
                  <button
                    onClick={() => idea._id && handleDeleteIdea(idea._id)}
                    disabled={isDeleting}
                    className={`px-4 py-1.5 text-sm font-medium border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150
                      ${isDeleting ? 'bg-gray-200 text-gray-500 cursor-wait' : 'text-white bg-red-600 hover:bg-red-700'}
                    `}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Idea'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}