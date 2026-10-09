import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import TutorChat from '../components/TutorChat';
import { getTutorResponse } from '../services/tutorService';

const suggestedQuestions = [
  'What is a qubit?',
  'Explain the Hadamard gate.',
  'What is quantum superposition?',
  'How does a CNOT gate work?',
  'What is quantum entanglement?',
];

function AITutor() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      sender: 'bot',
      text: 'Hello! I am a frontend learning assistant for QuantumLearn AI. Ask me a beginner question about qubits, gates, or quantum ideas.',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    const nextUserMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: trimmed,
    };

    const response = {
      id: crypto.randomUUID(),
      sender: 'bot',
      text: getTutorResponse(trimmed),
    };

    setMessages((current) => [...current, nextUserMessage, response]);
    setInput('');
  };

  const handleSuggestedQuestion = (question) => {
    const nextUserMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: question,
    };

    const response = {
      id: crypto.randomUUID(),
      sender: 'bot',
      text: getTutorResponse(question),
    };

    setMessages((current) => [...current, nextUserMessage, response]);
  };

  const handleClear = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: 'The conversation has been cleared. Ask a new quantum question to continue learning.',
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Tutoring demo</p>
            <h2 className="text-2xl font-bold text-slate-900">Ask me about quantum concepts</h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              className="secondary-button px-3 py-2 text-xs"
              onClick={() => handleSuggestedQuestion(question)}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      <TutorChat messages={messages} input={input} setInput={setInput} onSend={handleSend} onClear={handleClear} />
    </div>
  );
}

export default AITutor;
