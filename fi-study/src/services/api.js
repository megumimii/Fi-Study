import { auth } from '../firebase-config';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Helper to make authenticated requests to Fi-API
 */
async function apiRequest(endpoint, options = {}) {
  const user = auth.currentUser;
  let token = null;

  if (user) {
    token = await user.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
    const err = new Error(errorMsg);
    err.statusCode = response.status;
    err.details = data;
    throw err;
  }

  return data?.data !== undefined ? data.data : data;
}

// Course API
export const courseApi = {
  getAll: () => apiRequest('/courses'),
  getById: (courseUID) => apiRequest(`/courses/${courseUID}`),
  create: (data) => apiRequest('/courses', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (courseUID, data) => apiRequest(`/courses/${courseUID}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (courseUID) => apiRequest(`/courses/${courseUID}`, {
    method: 'DELETE'
  })
};

// Lesson API
export const lessonApi = {
  getAll: (courseUID) => apiRequest(`/courses/${courseUID}/lessons`),
  getById: (courseUID, lessonUID) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}`),
  create: (courseUID, data) => apiRequest(`/courses/${courseUID}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (courseUID, lessonUID, data) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (courseUID, lessonUID) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}`, {
    method: 'DELETE'
  })
};

// Material API
export const materialApi = {
  getAll: (courseUID, lessonUID) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials`),
  getById: (courseUID, lessonUID, materialUID) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials/${materialUID}`),
  create: (courseUID, lessonUID, data) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (courseUID, lessonUID, materialUID, data) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials/${materialUID}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateProgress: (courseUID, lessonUID, materialUID, passed = true) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials/${materialUID}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ passed })
  }),
  delete: (courseUID, lessonUID, materialUID) => apiRequest(`/courses/${courseUID}/lessons/${lessonUID}/materials/${materialUID}`, {
    method: 'DELETE'
  })
};

// User Profile API
export const userApi = {
  getProfile: () => apiRequest('/users/profile'),
  updateProfile: (data) => apiRequest('/users/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
};

// Quiz AI API
export const quizApi = {
  generateQuiz: async (materialText) => {
    const res = await apiRequest('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ materialText })
    });
    return res?.quiz || res;
  }
};
