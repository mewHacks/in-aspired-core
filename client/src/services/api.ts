import { httpClient } from './httpClient';
import { Course, Career, Notification, NotificationsResponse } from '../types';
import { User, UserActivityLog } from '../../src/types/user';

// API service which talks with backend
// Hide fetch details from components and return typed data (Course[], Career[])
// HttpClient is used to make authenticated requests to the backend to auto refresh tokens, handle race conditions and send cookies

{/* Course */ }
// Fetch all courses from backend with optional query string
export const fetchCourses = async (query?: string): Promise<Course[]> => {

  // Build query part
  const endpoint = query ? `/api/courses?query=${encodeURIComponent(query)}` : `/api/courses`;

  // Make HTTP GET request to the backend using authenticated client
  const response = await httpClient(endpoint);

  // Check if the response is successful manually (fetch doesn't throw on 4xx/5xx errors)
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to fetch courses');
  }

  // Parse and return JSON response as course list
  return response.json();
};

// Fetch a single course by ID from backend
export const fetchCourseById = async (id: string): Promise<Course> => {

  // Make request to specific course endpoint using authenticated client
  const response = await httpClient(`/api/courses/${id}`);

  // Handle non-success HTTP responses
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to fetch courses');
  }

  // Parse and return JSON response as Course
  return response.json();
};

// Create course
export const createCourse = async (data: Partial<Course>): Promise<Course> => {
  const response = await httpClient(`/api/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create course');
  return response.json();
};

// Update course
export const updateCourse = async (id: string, data: Partial<Course>): Promise<Course> => {
  const response = await httpClient(`/api/courses/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update course');
  return response.json();
};

// Delete course
export const deleteCourse = async (id: string): Promise<void> => {
  const response = await httpClient(`/api/courses/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete course');
};

// Save a course
export const saveCourse = async (courseId: string): Promise<void> => {
  const response = await httpClient(`/api/courses/${courseId}/save`, { method: 'POST' });
  if (!response.ok) {
    let errorMessage = 'Failed to save course';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
};

// Unsave a course
export const unsaveCourse = async (courseId: string): Promise<void> => {
  const response = await httpClient(`/api/courses/${courseId}/unsave`, { method: 'POST' });
  if (!response.ok) {
    let errorMessage = 'Failed to unsave course';
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }
};

// Fetch saved courses for the current user
export const fetchSavedCourses = async (): Promise<Course[]> => {
  const response = await httpClient('/api/courses/saved');
  if (!response.ok) throw new Error('Failed to fetch saved courses');
  return response.json();
};

// Check if course is saved by the current user
export const checkCourseSaved = async (courseId: string): Promise<boolean> => {
  const response = await httpClient(`/api/courses/${courseId}/saved`);
  if (!response.ok) return false;
  const data = await response.json();
  return data.is_saved || false;
};

// Get saved courses with pagination
export const fetchSavedCoursesPaginated = async (
  page: number = 1,
  limit: number = 20
): Promise<{ courses: Course[]; total: number; page: number }> => {
  const response = await httpClient(`/api/courses/saved?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch saved courses');
  return response.json();
};

// Fetch archived courses
export const fetchArchivedCourses = async (): Promise<Course[]> => {
  const response = await httpClient('/api/courses/archived');
  if (!response.ok) throw new Error('Failed to fetch archived courses');
  return response.json();
};

// Archive and restore
export const toggleCourseArchive = async (id: string): Promise<void> => {
  const response = await httpClient(`/api/courses/archive-toggle/${id}`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to toggle course archive');
  }
};

{/* Career */ }
// Fetch all careers from backend with optional query string
export const fetchCareers = async (query?: string): Promise<Career[]> => {

  // Build query part
  const endpoint = query ? `/api/careers?query=${encodeURIComponent(query)}` : `/api/careers`;

  // Make HTTP GET request to the backend using authenticated client
  const response = await httpClient(endpoint);

  // Check if the response is successful manually 
  if (!response.ok) {
    throw new Error('Failed to fetch careers');
  }

  // Parse and return JSON response as career list
  return response.json();
};

// Fetch a single career by ID from backend
export const fetchCareerById = async (id: string): Promise<Career> => {

  // Make request to specific career endpoint using authenticated client
  const response = await httpClient(`/api/careers/${id}`);

  // Handle non-success HTTP responses
  if (!response.ok) {
    throw new Error('Failed to fetch career');
  }

  // Parse and return JSON response as Career
  return response.json();
};

// Create a new career
export const createCareer = async (data: Partial<Career>): Promise<Career> => {
  const response = await httpClient(`/api/careers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create career');
  return response.json();
};

// Update an existing career
export const updateCareer = async (id: string, data: Partial<Career>): Promise<Career> => {
  const response = await httpClient(`/api/careers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to update career');
  }
  return response.json();
};

// Delete a career
export const deleteCareer = async (id: string): Promise<void> => {
  const response = await httpClient(`/api/careers/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete career');
};

// Save/Unsave Career
export const saveCareer = async (careerId: string): Promise<void> => {
  console.log('API: Saving career:', careerId);
  const response = await httpClient(`/api/careers/${careerId}/save`, {
    method: 'POST',
  });

  console.log('API: Save response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to save career';
    try {
      // Try to get detailed error from response
      const errorData = await response.json();
      console.error('API: Save failed with data:', errorData);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If response is not JSON, get text
      const text = await response.text();
      console.error('API: Save failed with text:', text);
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  console.log('API: Save successful');
};

export const unsaveCareer = async (careerId: string): Promise<void> => {
  console.log('API: Unsaving career:', careerId);
  const response = await httpClient(`/api/careers/${careerId}/unsave`, {
    method: 'POST',
  });

  console.log('API: Unsave response status:', response.status);

  if (!response.ok) {
    let errorMessage = 'Failed to unsave career';
    try {
      const errorData = await response.json();
      console.error('API: Unsave failed with data:', errorData);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      const text = await response.text();
      console.error('API: Unsave failed with text:', text);
      errorMessage = text || errorMessage;
    }
    throw new Error(errorMessage);
  }

  console.log('API: Unsave successful');
};

// Get user's saved careers
export const fetchSavedCareers = async (): Promise<Career[]> => {
  console.log('API: Fetching saved careers...');
  const response = await httpClient('/api/careers/saved');
  console.log('API: Response status:', response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error('API: Failed to fetch saved careers:', text);
    throw new Error('Failed to fetch saved careers');
  }

  const data = await response.json();
  console.log('API: Response data received:', data);
  console.log('API: Data is array?', Array.isArray(data));
  console.log('API: Data length:', Array.isArray(data) ? data.length : 'N/A');

  if (Array.isArray(data) && data.length > 0) {
    console.log('API: First career object keys:', Object.keys(data[0]));
    console.log('API: First career full object:', data[0]);
  }

  return data;
};

// Check if career is saved by current user
export const checkCareerSaved = async (careerId: string): Promise<boolean> => {
  const response = await httpClient(`/api/careers/${careerId}/saved`);
  if (!response.ok) return false;
  const data = await response.json();
  return data.is_saved || false;
};

// Get saved careers with pagination
export const fetchSavedCareersPaginated = async (
  page: number = 1,
  limit: number = 20
): Promise<{ careers: Career[]; total: number; page: number }> => {
  const response = await httpClient(`/api/careers/saved?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch saved careers');
  return response.json();
};

// Archive and restore
export const toggleCareerArchive = async (id: string): Promise<void> => {
  const response = await httpClient(`/api/careers/archive-toggle/${id}`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to toggle career archive');
  }
};

// Fetch archieved career
export const fetchArchivedCareers = async (): Promise<Career[]> => {
  const response = await httpClient('/api/careers?archived=true');
  if (!response.ok) {
    throw new Error('Failed to fetch archived careers');
  }
  return response.json();
};

{/* Notification */}
// Fetch notifications for current user (paginated)
export const fetchNotifications = async (
  page: number = 1,
  limit: number = 20
): Promise<NotificationsResponse> => {
  const response = await httpClient(`/api/notifications?page=${page}&limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return response.json();
};

// Fetch unread notification count (for badge)
export const fetchUnreadCount = async (): Promise<number> => {
  const response = await httpClient('/api/notifications/unread-count');
  if (!response.ok) throw new Error('Failed to fetch unread count');
  const data = await response.json();
  return data.unreadCount;
};

// Mark single notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
  const response = await httpClient(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to mark notification as read');
  return response.json();
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (): Promise<{ modifiedCount: number }> => {
  const response = await httpClient('/api/notifications/read-all', {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error('Failed to mark all notifications as read');
  return response.json();
};

// Delete a notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  const response = await httpClient(`/api/notifications/${notificationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete notification');
};

{/* User Admin */ }
export const fetchAllUsers = async (): Promise<User[]> => {
  const response = await httpClient('/api/admin/users');
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

export const fetchUserActivity = async (userId: string): Promise<UserActivityLog[]> => {
  const response = await httpClient(`/api/admin/users/${userId}/activity`);
  if (!response.ok) throw new Error('Failed to fetch user activity');
  return response.json();
};

export const toggleUserSuspend = async (
  userId: string,
  action: 'suspend' | 'unsuspend'
): Promise<User> => {
  const response = await httpClient(`/api/admin/users/${userId}/suspend`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  if (!response.ok) throw new Error('Failed to update user status');
  const resData = await response.json();
  return resData.user as User;
};