import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import TutorChat from '../components/TutorChat';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

function topicForQuestion(question) {
  const value = question.toLowerCase();
  if (value.includes('entangle') || value.includes('bell state')) return 'Entanglement';
  if (value.includes('superposition') || value.includes('hadamard')) return 'Superposition';
  if (value.includes('gate') || value.includes('cnot')) return 'Quantum Gates';
  if (value.includes('qubit')) return 'Qubits';
  return 'Other';
}

const suggestedQuestions = [
  'What is a qubit?',
  'Explain the Hadamard gate.',
  'What is quantum superposition?',
  'How does a CNOT gate work?',
  'What is quantum entanglement?',
];

function AITutor() {
  const { token, logout } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      sender: 'bot',
      text: 'Hello! I am your Gemini-powered quantum computing tutor. Ask me about qubits, gates, or quantum ideas. Please do not share personal information.',
    },
  ]);
  const [input, setInput] = useState('');
  const [activityMessage, setActivityMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const recordTutorInteraction = async (question) => {
    try {
      await authService.recordActivity(token, {
        event_type: 'tutor_interaction',
        topic: topicForQuestion(question),
      });
      setActivityMessage('');
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }
      setActivityMessage(`Tutor activity could not be recorded: ${error.message}`);
    }
  };

  const sendQuestion = async (question) => {
    const trimmed = question.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    setActivityMessage('');
    const nextUserMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: trimmed,
    };

    try {
      const { response: responseText } = await authService.tutorChat(
        token,
        trimmed,
        topicForQuestion(trimmed),
      );
      const response = {
        id: crypto.randomUUID(),
        sender: 'bot',
        text: responseText,
        topic: topicForQuestion(trimmed),
      };
      setMessages((current) => [...current, nextUserMessage, response]);
      if (question === input) {
        setInput('');
      }
      await recordTutorInteraction(trimmed);
    } catch (error) {
      if (error.status === 401) {
        logout();
      }
      setActivityMessage(error.message || 'The AI tutor could not answer. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => sendQuestion(input);

  const handleReport = async (message) => {
    try {
      await authService.recordActivity(token, {
        event_type: 'tutor_report',
        topic: message.topic,
        issue: 'Student reported a potentially incorrect tutor explanation.',
        explanation: message.text,
      });
      setActivityMessage('Report submitted for administrator review. The conversation was not saved.');
    } catch (error) {
      if (error.status === 401) {
        logout();
        return;
      }
      setActivityMessage(`Report could not be submitted: ${error.message}`);
    }
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
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Gemini-powered tutor</p>
            <h2 className="text-2xl font-bold text-slate-900">Ask me about quantum concepts</h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              className="secondary-button px-3 py-2 text-xs"
              onClick={() => sendQuestion(question)}
              disabled={isSending}
            >
              {question}
            </button>
          ))}
        </div>
      </div>

      {activityMessage && (
        <p role="status" className="rounded-xl bg-cyan-50 p-3 text-sm text-cyan-900">{activityMessage}</p>
      )}
      <TutorChat messages={messages} input={input} setInput={setInput} onSend={handleSend} onClear={handleClear} onReport={handleReport} isSending={isSending} />
    </div>
  );
}

export default AITutor;
