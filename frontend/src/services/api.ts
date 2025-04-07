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
// For now, hardcode the backend URL (ensure backend is running on this port)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Create an Axios instance (optional, but good practice)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to register a user
export const registerUserApi = async (userData: any) => { // Replace 'any' with specific type
  try {
    const response = await apiClient.post('/auth/register', userData);
    return response.data; // Expects { success: true, token: '...' }
  } catch (error: any) {
    console.error('API Register Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Registration failed');
  }
};

// Function to log in a user
export const loginUserApi = async (credentials: any) => { // Replace 'any' with specific type
  try {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data; // Expects { success: true, token: '...' }
  } catch (error: any) {
    console.error('API Login Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Login failed');
  }
};

// Function to get current user data using token
export const getCurrentUserApi = async (token: string): Promise<User> => {
  try {
    const response = await apiClient.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`, // Add token to header
      },
    });
    return response.data.data as User; // Expects { success: true, data: { user object } }
  } catch (error: any) {
    console.error('API Get Current User Error:', error.response?.data || error.message);
    // If token is invalid (401), the checkAuthStatus will handle cleanup
    throw error.response?.data || new Error('Failed to fetch user data');
  }
};

// --- Add other API functions here as needed (e.g., for content ideation, analytics) ---
// Example: Add a function to pass the token for protected endpoints automatically using interceptors (more advanced)