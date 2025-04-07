// frontend/src/services/calendarApi.ts
import axios from 'axios';

export interface ScheduledIdea {
  _id?: string;
  ideaId: {
    _id: string;
    title: string;
    angle: string;
    tags: string[];
    hook?: string;
    structure_points?: string[];
    platform_suitability?: 'High' | 'Medium' | 'Low' | null;
    intendedEmotion?: string;
  } | string; // Can be either populated idea or just the ID
  scheduledDate: string | Date;
  publishingPlatform: string;
  status: 'scheduled' | 'in-progress' | 'posted' | 'delayed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | Date;
  postingNotes?: string;
  additionalDetails?: string;
  createdAt?: string | Date;
  lastModified?: string | Date;
}

export interface ScheduleIdeaInput {
  ideaId: string;
  scheduledDate: string | Date;
  publishingPlatform?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | Date;
  postingNotes?: string;
  additionalDetails?: string;
}

export interface CalendarFilters {
  startDate?: string | Date;
  endDate?: string | Date;
  status?: 'scheduled' | 'in-progress' | 'posted' | 'delayed';
  platform?: string;
  priority?: 'low' | 'medium' | 'high';
}

// Schedule a new idea
export const scheduleIdeaApi = async (data: ScheduleIdeaInput, token: string) => {
  try {
    const response = await apiClient.post('/calendar', data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('API Schedule Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to schedule idea');
  }
};

// Get all scheduled ideas with optional filters
export const getScheduledIdeasApi = async (filters: CalendarFilters = {}, token: string) => {
  try {
    // Convert filter parameters to query string
    const queryParams = new URLSearchParams();
    
    if (filters.startDate) {
      queryParams.append('startDate', new Date(filters.startDate).toISOString());
    }
    
    if (filters.endDate) {
      queryParams.append('endDate', new Date(filters.endDate).toISOString());
    }
    
    if (filters.status) {
      queryParams.append('status', filters.status);
    }
    
    if (filters.platform) {
      queryParams.append('platform', filters.platform);
    }
    
    if (filters.priority) {
      queryParams.append('priority', filters.priority);
    }
    
    const queryString = queryParams.toString();
    const url = queryString ? `/calendar?${queryString}` : '/calendar';
    
    const response = await apiClient.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    return response.data;
  } catch (error: any) {
    console.error('API Get Scheduled Ideas Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch scheduled ideas');
  }
};

// Get a specific scheduled idea
export const getScheduledIdeaApi = async (id: string, token: string) => {
  try {
    const response = await apiClient.get(`/calendar/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('API Get Scheduled Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to fetch scheduled idea');
  }
};

// Update a scheduled idea
export const updateScheduledIdeaApi = async (id: string, data: Partial<ScheduleIdeaInput>, token: string) => {
  try {
    const response = await apiClient.put(`/calendar/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('API Update Scheduled Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to update scheduled idea');
  }
};

// Delete a scheduled idea
export const deleteScheduledIdeaApi = async (id: string, token: string) => {
  try {
    const response = await apiClient.delete(`/calendar/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error: any) {
    console.error('API Delete Scheduled Idea Error:', error.response?.data || error.message);
    throw error.response?.data || new Error('Failed to delete scheduled idea');
  }
};