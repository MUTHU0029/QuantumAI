import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, NotebookPen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Quiz from '../components/Quiz';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import { updateLessonProgress, updateQuizProgress } from '../services/progressService';

function LessonDetail() {
  const { lessonId } = useParams();
  const { token, logout } = useAuth();
  const [state, setState] = useState({
    loading: true,
    lesson: null,
    lessons: [],
    exercises: [],
    error: '',
    activityError: '',
  });

  useEffect(() => {
    let active = true;
    Promise.all([
      authService.studentLesson(token, lessonId),
      authService.studentLessons(token),
      authService.studentExercises(token, lessonId),
    ])
      .then(([{ lesson }, { lessons }, { exercises }]) => {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          lesson,
          lessons,
          exercises,
          error: '',
        }));
        authService.recordActivity(token, {
          event_type: 'lesson_view',
          lesson_id: lessonId,
        }).catch((error) => {
          if (active) setState((current) => ({ ...current, activityError: error.message }));
        });
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401) {
          logout();
          return;
        }
        setState((current) => ({ ...current, loading: false, error: error.message }));
      });
    return () => {
      active = false;
    };
  }, [token, lessonId, logout]);

  const handleComplete = async () => {
    if (!state.lesson) return;
    updateLessonProgress(state.lesson.id);
    try {
      await authService.recordActivity(token, {
        event_type: 'lesson_complete',
        lesson_id: state.lesson.id,
      });
      setState((current) => ({ ...current, activityError: '' }));
    } catch (error) {
      setState((current) => ({ ...current, activityError: error.message }));
    }
  };

  const handleAnswer = (exercise, answer) => (
    authService.submitExercise(token, exercise.id, answer)
  );

  const handleQuizComplete = (correct, total) => {
    updateQuizProgress({ correct, total });
  };

  if (state.loading) {
    return <p role="status" className="panel p-5 text-sm text-slate-600">Loading lesson…</p>;
  }
  if (state.error || !state.lesson) {
    return (
      <section className="panel space-y-3 p-6">
        <p role="alert" className="text-sm text-rose-700">{state.error || 'Lesson could not be loaded.'}</p>
        <Link to="/learn" className="secondary-button w-fit">Back to lessons</Link>
      </section>
    );
  }

  const { lesson } = state;
  const nextLessons = state.lessons.filter((item) => item.id !== lesson.id).slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link to="/learn" className="secondary-button w-fit gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to lessons
        </Link>
        <button type="button" className="primary-button gap-2" onClick={handleComplete}>
          <CheckCircle2 className="h-4 w-4" />
          Mark lesson complete
        </button>
      </div>

      {state.activityError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
          Learning activity could not be recorded: {state.activityError}
        </p>
      )}

      <article className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-800 px-6 py-8 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {lesson.difficulty}
            </span>
            {lesson.duration && (
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                {lesson.duration}
              </span>
            )}
          </div>
          <h2 className="mt-4 text-3xl font-bold">{lesson.title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-200">{lesson.description}</p>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-slate-900">Explanation</h3>
              <p className="mt-3 whitespace-pre-wrap leading-7 text-slate-600">
                {lesson.content || lesson.explanation}
              </p>
            </section>

            {lesson.steps?.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-slate-900">Step-by-step learning</h3>
                <ol className="mt-4 space-y-3">
                  {lesson.steps.map((step, index) => (
                    <li key={`${index}-${step}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{step}</p>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {lesson.examples?.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-slate-900">Examples</h3>
                <ul className="mt-3 space-y-2">
                  {lesson.examples.map((example, index) => (
                    <li key={`${index}-${example}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                      {example}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(lesson.circuitPlaceholder || lesson.expectedOutcome) && (
              <section>
                <h3 className="text-xl font-bold text-slate-900">Expected result</h3>
                <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-slate-700">
                  {lesson.expectedOutcome || lesson.circuitPlaceholder}
                </div>
              </section>
            )}
          </div>

          <section className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
              <NotebookPen className="h-4 w-4" />
              Lesson topics
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {(lesson.topics || [lesson.topic]).filter(Boolean).map((topic) => (
                <li key={topic} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  {topic}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        {state.exercises.length > 0 ? (
          <Quiz
            key={lesson.id}
            questions={state.exercises}
            onAnswer={handleAnswer}
            onComplete={handleQuizComplete}
          />
        ) : (
          <section className="panel p-5 text-sm text-slate-600">No published exercises are available for this lesson yet.</section>
        )}

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Next steps</h3>
            <ArrowRight className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="space-y-3">
            {nextLessons.map((item) => (
              <Link key={item.id} to={`/learn/${item.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50">
                <span className="font-semibold text-slate-900">{item.title}</span>
                <span className="mt-1 block text-slate-500">{item.duration || item.topic}</span>
              </Link>
            ))}
            {nextLessons.length === 0 && <p className="text-sm text-slate-500">You’re viewing the only published lesson.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LessonDetail;
