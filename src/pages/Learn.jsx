import { lessons } from '../data/lessons';
import LessonCard from '../components/LessonCard';

function Learn() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Course catalogue</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Learn quantum fundamentals</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">5 sample lessons</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}

export default Learn;
