const STORAGE_KEY = 'quantumlearn-progress-v1';

const defaultProgress = {
  completedLessons: ['qubits'],
  lessonsStarted: ['qubits'],
  exercisesAttempted: 4,
  correctAnswers: 3,
  quizHistory: [82, 75, 90],
  lastUpdated: '2026-10-09',
};

export const getProgress = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProgress));
      return { ...defaultProgress };
    }

    return { ...defaultProgress, ...JSON.parse(saved) };
  } catch {
    return { ...defaultProgress };
  }
};

export const saveProgress = (progress) => {
  const next = { ...defaultProgress, ...progress, lastUpdated: new Date().toISOString().slice(0, 10) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export const updateLessonProgress = (lessonId) => {
  const current = getProgress();
  const completedLessons = current.completedLessons.includes(lessonId)
    ? current.completedLessons
    : [...current.completedLessons, lessonId];

  const lessonsStarted = current.lessonsStarted.includes(lessonId)
    ? current.lessonsStarted
    : [...current.lessonsStarted, lessonId];

  return saveProgress({ completedLessons, lessonsStarted });
};

export const updateQuizProgress = ({ correct, total }) => {
  const current = getProgress();
  const nextCorrect = current.correctAnswers + correct;
  const nextAttempted = current.exercisesAttempted + total;

  return saveProgress({
    exercisesAttempted: nextAttempted,
    correctAnswers: nextCorrect,
  });
};
