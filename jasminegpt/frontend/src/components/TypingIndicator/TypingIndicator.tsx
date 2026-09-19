import './TypingIndicator.css';

export default function TypingIndicator() {
  return (
    <div
      className="inline-flex items-center gap-1.5 py-1 px-1"
      role="status"
      aria-label="JasmineGPT is thinking"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot-1" />
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot-2" />
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot-3" />
    </div>
  );
}
