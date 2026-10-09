import { Bot, Send, Trash2, User } from 'lucide-react';

function TutorChat({ messages, input, setInput, onSend, onClear }) {
  return (
    <div className="panel flex h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Quantum Guide</p>
            <p className="text-xs text-slate-500">Frontend demonstration only</p>
          </div>
        </div>

        <button type="button" className="ghost-button gap-2 px-3 py-2" onClick={onClear}>
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.sender === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onSend();
              }
            }}
            placeholder="Ask a quantum question..."
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
          <button type="button" className="primary-button gap-2" onClick={onSend}>
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default TutorChat;
