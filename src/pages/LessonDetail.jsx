import { ArrowLeft, ArrowRight, CheckCircle2, NotebookPen } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Quiz from '../components/Quiz';
import { lessons } from '../data/lessons';
import { questions } from '../data/questions';
import { updateLessonProgress, updateQuizProgress } from '../services/progressService';

function LessonDetail() {
  const { lessonId } = useParams();
  const lesson = lessons.find((item) => item.id === lessonId) || lessons[0];
  const sampleQuestions = questions.slice(0, 3);

  const handleComplete = () => {
    updateLessonProgress(lesson.id);
  };

  const handleQuizComplete = (correctCount, total) => {
    updateQuizProgress({ correct: correctCount, total });
  };

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

      <article className="panel overflow-hidden">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-800 px-6 py-8 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {lesson.difficulty}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
              {lesson.duration}
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold">{lesson.title}</h2>
          <p className="mt-3 max-w-3xl text-sm text-slate-200">{lesson.description}</p>
        </div>

        <div className="grid gap-6 p-6 xl:grid-cols-[1.3fr,0.7fr]">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-slate-900">Explanation</h3>
              <p className="mt-3 leading-7 text-slate-600">{lesson.explanation}</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900">Step-by-step learning</h3>
              <ol className="mt-4 space-y-3">
                {lesson.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-700">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900">Circuit illustration</h3>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-sm text-slate-700">
                <pre className="whitespace-pre-wrap">{lesson.circuitPlaceholder}</pre>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-900">Expected result</h3>
              <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm leading-6 text-slate-700">
                {lesson.expectedOutcome}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-700">
                <NotebookPen className="h-4 w-4" />
                Lesson topics
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {lesson.topics.map((topic) => (
                  <li key={topic} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    {topic}
                  </li>
                ))}
              </ul>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Student checkpoint</p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                This lesson is built as static educational content so it can be connected to future simulation results and backend APIs without redesigning the page.
              </p>
            </div>
          </div>
        </div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <Quiz questions={sampleQuestions} onComplete={handleQuizComplete} />

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Next steps</h3>
            <ArrowRight className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="space-y-3">
            {lessons
              .filter((item) => item.id !== lesson.id)
              .slice(0, 3)
              .map((item) => (
                <Link key={item.id} to={`/learn/${item.id}`} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 transition hover:border-cyan-200 hover:bg-cyan-50">
                  <span className="font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-1 block text-slate-500">{item.duration}</span>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LessonDetail;
