import { apiRequest } from './authService';

export const adminService = {
  dashboard(token) {
    return apiRequest('/admin/dashboard', { token });
  },
  students(token, filters = {}) {
    const query = new URLSearchParams(filters);
    return apiRequest(`/admin/students?${query}`, { token });
  },
  student(token, studentId) {
    return apiRequest(`/admin/students/${encodeURIComponent(studentId)}`, { token });
  },
  setStudentStatus(token, studentId, status) {
    return apiRequest(`/admin/students/${encodeURIComponent(studentId)}/status`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  deleteStudent(token, studentId, confirmEmail) {
    return apiRequest(`/admin/students/${encodeURIComponent(studentId)}`, {
      token,
      method: 'DELETE',
      body: JSON.stringify({ confirm_email: confirmEmail }),
    });
  },
  lessons(token) {
    return apiRequest('/admin/lessons', { token });
  },
  createLesson(token, lesson) {
    return apiRequest('/admin/lessons', {
      token,
      method: 'POST',
      body: JSON.stringify(lesson),
    });
  },
  updateLesson(token, lessonId, lesson) {
    return apiRequest(`/admin/lessons/${encodeURIComponent(lessonId)}`, {
      token,
      method: 'PUT',
      body: JSON.stringify(lesson),
    });
  },
  deleteLesson(token, lessonId) {
    return apiRequest(`/admin/lessons/${encodeURIComponent(lessonId)}`, {
      token,
      method: 'DELETE',
    });
  },
  exercises(token) {
    return apiRequest('/admin/exercises', { token });
  },
  createExercise(token, exercise) {
    return apiRequest('/admin/exercises', {
      token,
      method: 'POST',
      body: JSON.stringify(exercise),
    });
  },
  updateExercise(token, exerciseId, exercise) {
    return apiRequest(`/admin/exercises/${encodeURIComponent(exerciseId)}`, {
      token,
      method: 'PUT',
      body: JSON.stringify(exercise),
    });
  },
  deleteExercise(token, exerciseId) {
    return apiRequest(`/admin/exercises/${encodeURIComponent(exerciseId)}`, {
      token,
      method: 'DELETE',
    });
  },
  analytics(token, filters = {}) {
    return apiRequest(`/admin/analytics?${new URLSearchParams(filters)}`, { token });
  },
  circuits(token, filters = {}) {
    return apiRequest(`/admin/circuits?${new URLSearchParams(filters)}`, { token });
  },
  tutor(token, filters = {}) {
    return apiRequest(`/admin/tutor?${new URLSearchParams(filters)}`, { token });
  },
  reviewTutorReport(token, reportId, status, verifiedExplanation) {
    return apiRequest(`/admin/tutor/reports/${encodeURIComponent(reportId)}`, {
      token,
      method: 'PATCH',
      body: JSON.stringify({ status, verified_explanation: verifiedExplanation }),
    });
  },
};
