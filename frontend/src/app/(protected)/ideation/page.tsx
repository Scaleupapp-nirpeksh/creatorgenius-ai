// frontend/src/app/(protected)/ideation/page.tsx
"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust path if needed
import { generateIdeasApi, Idea } from '@/services/api'; // Adjust path

// Simple Input component (or use Shadcn/ui Input)
const InputField = ({ label, id, value, onChange, placeholder, type = "text", disabled }: any) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
    />
  </div>
);

// Simple TextArea component
const TextAreaField = ({ label, id, value, onChange, placeholder, rows = 3, disabled }: any) => (
   <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
    />
  </div>
);

export default function IdeationPage() {
  const { token } = useAuth(); // Get token for API calls

  // Form State
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState(''); // Simple string input for now
  const [platform, setPlatform] = useState('');
  const [language, setLanguage] = useState('');
  const [niche, setNiche] = useState('');
  const [tone, setTone] = useState('');
  const [targetAudienceDetails, setTargetAudienceDetails] = useState('');
  const [emotionalGoal, setEmotionalGoal] = useState('');
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [targetAudiencePainPoint, setTargetAudiencePainPoint] = useState('');
  const [numberOfIdeas, setNumberOfIdeas] = useState<number>(5);

  // Result State
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
   const [rawErrorContent, setRawErrorContent] = useState<string | null>(null); // For backend validation errors

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) {
      setError("Authentication error. Please log in again.");
      return;
    }
    if (!topic && !keywords) {
        setError("Please provide at least a topic or some keywords.");
        return;
    }

    setLoading(true);
    setError(null);
    setRawErrorContent(null);
    setIdeas([]); // Clear previous ideas

    // Prepare data payload (only include non-empty optional fields)
    const inputData: any = { numberOfIdeas };
    if (topic) inputData.topic = topic;
    // Split keywords string into array, trim whitespace
    if (keywords) inputData.keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
    if (platform) inputData.platform = platform;
    if (language) inputData.language = language;
    if (niche) inputData.niche = niche;
    if (tone) inputData.tone = tone;
    if (targetAudienceDetails) inputData.targetAudienceDetails = targetAudienceDetails;
    if (emotionalGoal) inputData.emotionalGoal = emotionalGoal;
    if (keyTakeaway) inputData.keyTakeaway = keyTakeaway;
    if (targetAudiencePainPoint) inputData.targetAudiencePainPoint = targetAudiencePainPoint;


    try {
      console.log("Sending data to API:", inputData);
      const response = await generateIdeasApi(inputData, token);
       if (response.success && response.data) {
            setIdeas(response.data);
            console.log("Received ideas:", response.data);
       } else {
           // Should ideally not happen if API throws error on !success
           setError(response.message || "Failed to generate ideas.");
       }
    } catch (err: any) {
      console.error("Ideation page catch:", err);
      setError(err.message || "An unexpected error occurred.");
      // If backend sent raw_content on parsing/validation failure
      if (err.raw_content) {
          setRawErrorContent(err.raw_content);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">AI Content Ideation</h1>
      <p className="mb-6 text-gray-600">
        Enter details about the content you want to create, and let CreatorGenius suggest some ideas! Add details like emotional goals or pain points for more targeted results.
      </p>

      {/* --- Input Form --- */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-white p-6 rounded-lg shadow">
          {/* Core Inputs */}
          <InputField label="Topic" id="topic" value={topic} onChange={(e:any) => setTopic(e.target.value)} placeholder="e.g., Easy Indian Breakfast Recipes" disabled={loading} />
          <InputField label="Keywords (comma-separated)" id="keywords" value={keywords} onChange={(e:any) => setKeywords(e.target.value)} placeholder="e.g., quick, healthy, vegetarian" disabled={loading} />
          <InputField label="Target Platform (Optional)" id="platform" value={platform} onChange={(e:any) => setPlatform(e.target.value)} placeholder="e.g., YouTube Shorts, Instagram Post" disabled={loading} />
          <InputField label="Language (Optional)" id="language" value={language} onChange={(e:any) => setLanguage(e.target.value)} placeholder="e.g., Hinglish, Tamil" disabled={loading} />
          <InputField label="Number of Ideas (1-10)" id="numberOfIdeas" type="number" value={numberOfIdeas} onChange={(e:any) => setNumberOfIdeas(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))} placeholder="5" disabled={loading} />

          {/* Enhanced Context Inputs (Optional) */}
          <TextAreaField label="Your Niche (Optional)" id="niche" value={niche} onChange={(e:any) => setNiche(e.target.value)} placeholder="e.g., Tech reviews for students" disabled={loading} />
          <TextAreaField label="Desired Tone (Optional)" id="tone" value={tone} onChange={(e:any) => setTone(e.target.value)} placeholder="e.g., Humorous and relatable" disabled={loading} />
          <TextAreaField label="Target Audience Details (Optional)" id="audience" value={targetAudienceDetails} onChange={(e:any) => setTargetAudienceDetails(e.target.value)} placeholder="e.g., College students in South India" disabled={loading} />
          <TextAreaField label="Desired Emotional Goal (Optional)" id="emotion" value={emotionalGoal} onChange={(e:any) => setEmotionalGoal(e.target.value)} placeholder="e.g., Make them feel nostalgic, Inspire action" disabled={loading} />
          <TextAreaField label="Key Takeaway Message (Optional)" id="takeaway" value={keyTakeaway} onChange={(e:any) => setKeyTakeaway(e.target.value)} placeholder="e.g., Anyone can start investing small amounts" disabled={loading} />
          <TextAreaField label="Audience Pain Point / Desire (Optional)" id="painpoint" value={targetAudiencePainPoint} onChange={(e:any) => setTargetAudiencePainPoint(e.target.value)} placeholder="e.g., Difficulty finding time to cook healthy meals" disabled={loading} />

          {/* Submit Button & Error Display */}
          <div className="md:col-span-2 flex flex-col items-center">
             {error && (
                <div className="w-full p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-400 rounded-md">
                    <p><strong>Error:</strong> {error}</p>
                    {/* Display raw content if validation failed on backend */}
                    {rawErrorContent && (
                        <details className="mt-2">
                            <summary className="cursor-pointer">Show Raw AI Response</summary>
                            <pre className="mt-1 p-2 bg-red-50 text-xs overflow-auto max-h-40">{rawErrorContent}</pre>
                        </details>
                    )}
                </div>
              )}
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-1/2 px-6 py-3 text-base font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating Ideas...' : 'Generate Content Ideas'}
            </button>
          </div>
      </form>

      {/* --- Results Display --- */}
      {loading && <p className="text-center text-indigo-600">Generating... Please wait.</p>}

      {!loading && ideas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Generated Ideas:</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ideas.map((idea, index) => (
              <div key={index} className="bg-white p-5 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold mb-2 text-indigo-700">{idea.title}</h3>
                <p className="text-sm text-gray-600 mb-3"><strong className="font-medium text-gray-800">Angle:</strong> {idea.angle}</p>
                {idea.hook && <p className="text-sm text-gray-600 mb-3"><strong className="font-medium text-gray-800">Hook Idea:</strong> {idea.hook}</p>}
                {idea.intendedEmotion && <p className="text-sm text-gray-600 mb-3"><strong className="font-medium text-gray-800">Intended Emotion:</strong> {idea.intendedEmotion}</p>}
                {idea.structure_points && idea.structure_points.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-800 mb-1">Structure Points:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {idea.structure_points.map((point, pIndex) => <li key={pIndex}>{point}</li>)}
                    </ul>
                  </div>
                )}
                 {idea.platform_suitability && <p className="text-sm text-gray-600 mb-3"><strong className="font-medium text-gray-800">Platform Suitability ({platform || 'General'}):</strong> {idea.platform_suitability}</p>}
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Suggested Tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag, tIndex) => (
                      <span key={tIndex} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
                 {/* Add buttons here later: Save Idea, Generate Script, etc. */}
              </div>
            ))}
          </div>
        </div>
      )}
       {!loading && !error && ideas.length === 0 && <p className="text-center text-gray-500">Enter your requirements above to generate ideas.</p>}


    </div>
  );
}