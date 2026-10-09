import { useMemo, useState } from 'react';

function Quiz({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [attempted, setAttempted] = useState(0);

  const currentQuestion = questions[currentIndex];
  const finished = currentIndex >= questions.length;

  const progress = useMemo(
    () => (finished ? 100 : ((currentIndex + 1) / questions.length) * 100),
    [currentIndex, finished, questions.length],
  );

  const handleSubmit = () => {
    if (selected === null) {
      return;
    }

    const isCorrect = selected === currentQuestion.answer;
    setShowFeedback(true);
    setAttempted((value) => value + 1);

    if (isCorrect) {
      setScore((value) => value + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex === questions.length - 1) {
      const finalScore = score + (selected === currentQuestion.answer ? 1 : 0);
      onComplete?.(finalScore, questions.length);
      setCurrentIndex(questions.length);
      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelected(null);
    setShowFeedback(false);
  };

  const reset = () => {
    setCurrentIndex(0);
    setSelected(null);
    setShowFeedback(false);
    setScore(0);
    setAttempted(0);
  };

  if (finished) {
    const finalScore = score + (selected === currentQuestion.answer ? 1 : 0);
    return (
      <div className="panel p-5">
        <h3 className="text-2xl font-bold text-slate-900">Quiz complete</h3>
        <p className="mt-3 text-sm text-slate-600">
          You scored <span className="font-bold text-cyan-700">{finalScore}</span> out of <span className="font-bold">{questions.length}</span>.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${(finalScore / questions.length) * 100}%` }} />
        </div>
        <button type="button" className="primary-button mt-5" onClick={reset}>
          Retry Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Practice question</p>
        <span className="text-sm font-medium text-slate-600">
          {currentIndex + 1}/{questions.length}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${progress}%` }} />
      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-900">{currentQuestion.question}</h3>

      <div className="mt-5 space-y-3">
        {currentQuestion.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
              selected === index
                ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50'
            }`}
            onClick={() => setSelected(index)}
          >
            <span>{option}</span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {String.fromCharCode(65 + index)}
            </span>
          </button>
        ))}
      </div>

      {showFeedback ? (
        <div className={`mt-5 rounded-2xl p-4 text-sm ${selected === currentQuestion.answer ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <p className="font-semibold">{selected === currentQuestion.answer ? 'Correct' : 'Incorrect'}</p>
          <p className="mt-1 leading-6">{currentQuestion.explanation}</p>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        {!showFeedback ? (
          <button type="button" className="primary-button" onClick={handleSubmit} disabled={selected === null}>
            Submit Answer
          </button>
        ) : (
          <button type="button" className="primary-button" onClick={handleNext}>
            {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}

export default Quiz;
