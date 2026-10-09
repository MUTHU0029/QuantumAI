import { ArrowRight, Clock3, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';

function LessonCard({ lesson }) {
  return (
    <div className="panel flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">
          {lesson.difficulty}
        </span>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock3 className="h-3.5 w-3.5" />
          {lesson.duration}
        </div>
      </div>

      <h3 className="text-xl font-bold text-slate-900">{lesson.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{lesson.description}</p>

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progress</span>
          <span>{lesson.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${lesson.progress}%` }} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {lesson.topics.slice(0, 2).map((topic) => (
          <span key={topic} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600">
            {topic}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <Gauge className="h-3.5 w-3.5" />
          Sample lesson
        </div>
        <Link to={`/learn/${lesson.id}`} className="primary-button gap-2">
          {lesson.progress > 0 ? 'Continue Lesson' : 'Start Lesson'}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default LessonCard;
