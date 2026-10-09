import { tutorResponses } from '../data/tutorResponses';

export const getTutorResponse = (message) => {
  const value = message.trim().toLowerCase();

  if (!value) {
    return tutorResponses.default;
  }

  if (value.includes('qubit') || value.includes('quantum bit')) {
    return tutorResponses.qubit;
  }

  if (value.includes('hadamard') || value.includes('h gate')) {
    return tutorResponses.hadamard;
  }

  if (value.includes('superposition')) {
    return tutorResponses.superposition;
  }

  if (value.includes('cnot') || value.includes('control') || value.includes('target')) {
    return tutorResponses.cnot;
  }

  if (value.includes('entanglement')) {
    return tutorResponses.entanglement;
  }

  return tutorResponses.default;
};
