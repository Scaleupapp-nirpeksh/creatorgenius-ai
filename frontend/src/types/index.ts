// frontend/src/types/index.ts
export interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    subscriptionTier?: string;
    profilePictureUrl?: string;
    createdAt?: string; // Optional based on your backend response
    // Add any other fields you expect from the /api/auth/me endpoint
  }
  
  // Define types for API function parameters if desired
  export interface LoginCredentials {
      email: string;
      password: string;
  }
  
  export interface RegisterUserData {
      name: string;
      email: string;
      password: string;
  }