import { useMemo, useState } from 'react';

function Quiz({ questions, onAnswer, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [answerResult, setAnswerResult] = useState(null);

  const currentQuestion = questions[currentIndex];
  const finished = currentIndex >= questions.length;

  const progress = useMemo(
    () => (finished ? 100 : ((currentIndex + 1) / questions.length) * 100),
    [currentIndex, finished, questions.length],
  );

  const handleSubmit = async () => {
    if (selected === null) {
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = onAnswer
        ? await onAnswer(currentQuestion, selected)
        : {
          correct: selected === currentQuestion.answer,
          explanation: currentQuestion.explanation,
        };
      setAnswerResult(result);
      if (result.correct) setScore((value) => value + 1);
      setShowFeedback(true);
    } catch (submissionError) {
      setError(submissionError.message || 'Your answer could not be submitted.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setShowFeedback(true);
    if (currentIndex === questions.length - 1) {
      onComplete?.(score, questions.length);
      setCurrentIndex(questions.length);
      return;
    }

    setCurrentIndex((value) => value + 1);
    setSelected(null);
    setShowFeedback(false);
    setAnswerResult(null);
    setError('');
  };

  const reset = () => {
    setCurrentIndex(0);
    setSelected(null);
    setShowFeedback(false);
    setScore(0);
    setAnswerResult(null);
    setError('');
  };

  if (finished) {
    return (
      <div className="panel p-5">
        <h3 className="text-2xl font-bold text-slate-900">Quiz complete</h3>
        <p className="mt-3 text-sm text-slate-600">
          You scored <span className="font-bold text-cyan-700">{score}</span> out of <span className="font-bold">{questions.length}</span>.
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${(score / questions.length) * 100}%` }} />
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
        <div className={`mt-5 rounded-2xl p-4 text-sm ${answerResult?.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <p className="font-semibold">{answerResult?.correct ? 'Correct' : 'Incorrect'}</p>
          <p className="mt-1 leading-6">{answerResult?.explanation}</p>
        </div>
      ) : null}

      {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}

      <div className="mt-5 flex justify-end">
        {!showFeedback ? (
          <button type="button" className="primary-button" onClick={handleSubmit} disabled={selected === null || submitting}>
            {submitting ? 'Checking…' : 'Submit Answer'}
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
