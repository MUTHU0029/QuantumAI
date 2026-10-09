const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api'
).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers);
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || `Request failed with status ${response.status}.`,
      response.status,
    );
  }

  return payload;
}

export const authService = {
  register({ name, email, password }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  login({ email, password }) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(token) {
    return apiRequest('/auth/me', { token });
  },

  studentDashboard(token) {
    return apiRequest('/student/dashboard', { token });
  },

  adminDashboard(token) {
    return apiRequest('/admin/dashboard', { token });
  },

  studentLessons(token) {
    return apiRequest('/student/lessons', { token });
  },

  studentLesson(token, lessonId) {
    return apiRequest(`/student/lessons/${encodeURIComponent(lessonId)}`, { token });
  },

  studentExercises(token, lessonId) {
    const query = new URLSearchParams({ lesson_id: lessonId });
    return apiRequest(`/student/exercises?${query}`, { token });
  },

  submitExercise(token, exerciseId, answer) {
    return apiRequest(`/student/exercises/${encodeURIComponent(exerciseId)}/submit`, {
      token,
      method: 'POST',
      body: JSON.stringify({ answer }),
    });
  },

  recordActivity(token, activity) {
    return apiRequest('/student/activity', {
      token,
      method: 'POST',
      body: JSON.stringify(activity),
    });
  },

  tutorExplanation(token, topic) {
    const query = new URLSearchParams({ topic });
    return apiRequest(`/student/tutor/explanation?${query}`, { token });
  },

  tutorChat(token, question, topic) {
    return apiRequest('/student/tutor/chat', {
      token,
      method: 'POST',
      body: JSON.stringify({ question, topic }),
    });
  },
};
