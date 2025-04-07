// frontend/src/services/api.ts
import axios from 'axios';

// Define User type (example, adjust based on your backend response for /me)
export interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    // Add other relevant fields returned by your /api/auth/me endpoint
    subscriptionTier?: string;
    profilePictureUrl?: string;
}

// Define backend API base URL - Use environment variable ideally
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create an Axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Auth API Functions ---
export const registerUserApi = async (userData: any) => { // Replace 'any'
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  } catch (error: any) {
    console.error('API Register Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Registration failed');
  }
};

export const loginUserApi = async (credentials: any) => { // Replace 'any'
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  } catch (error: any) {
    console.error('API Login Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Login failed');
  }
};

export const getCurrentUserApi = async (token: string): Promise<User> => {
  try {
    const response = await apiClient.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data as User;
  } catch (error: any) {
    console.error('API Get Current User Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch user data');
  }
};


// --- Idea Interface (Updated) ---
export interface Idea {
    _id?: string; // ID will exist for saved ideas from DB
    title: string;
    angle: string;
    tags: string[];
    hook?: string;
    structure_points?: string[];
    platform_suitability?: 'High' | 'Medium' | 'Low' | null; // Added null
    intendedEmotion?: string;
    // Frontend specific temporary index for tracking save state
    tempIndex?: number;
    // Fields from DB model if needed
    userId?: string;
    savedAt?: string; // Or Date
}

// --- Content Ideation API Function ---
interface IdeationInput {
    topic?: string;
    keywords?: string[];
    platform?: string;
    language?: string;
    niche?: string;
    tone?: string;
    targetAudienceDetails?: string;
    numberOfIdeas?: number;
    emotionalGoal?: string;
    keyTakeaway?: string;
    targetAudiencePainPoint?: string;
}

interface IdeationResponse {
    success: boolean;
    message: string;
    data: Idea[]; // Array of ideas generated
    raw_content?: string;
    details?: any;
}

export const generateIdeasApi = async (input: IdeationInput, token: string): Promise<IdeationResponse> => {
  try {
    const response = await apiClient.post('/content/ideation', input, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data as IdeationResponse;
  } catch (error: any) {
    console.error('API Generate Ideas Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to generate ideas');
  }
};


// --- NEW API FUNCTIONS FOR SAVED IDEAS ---

// Data sent to save API (doesn't include _id, tempIndex, etc.)
type IdeaSaveData = Omit<Idea, '_id' | 'savedAt' | 'userId' | 'tempIndex'>;

// Function to save an idea
export const saveIdeaApi = async (ideaData: IdeaSaveData, token: string): Promise<{ success: boolean; data: Idea }> => {
  try {
    const response = await apiClient.post('/ideas', ideaData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Expects { success: true, data: { saved idea with _id } }
  } catch (error: any) {
    console.error('API Save Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to save idea');
  }
};

// Function to get all saved ideas
export const getSavedIdeasApi = async (token: string): Promise<{ success: boolean; count: number; data: Idea[] }> => {
  try {
    const response = await apiClient.get('/ideas', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Expects { success: true, count: N, data: [...] }
  } catch (error: any) {
    console.error('API Get Saved Ideas Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch saved ideas');
  }
};

// Function to delete a specific saved idea by its ID
export const deleteIdeaApi = async (ideaId: string, token: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Ensure ideaId is provided
    if (!ideaId) throw new Error("Idea ID is required for deletion.");
    const response = await apiClient.delete(`/ideas/${ideaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data; // Expects { success: true, message: '...', data: {} }
  } catch (error: any) {
    console.error('API Delete Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to delete idea');
  }
};