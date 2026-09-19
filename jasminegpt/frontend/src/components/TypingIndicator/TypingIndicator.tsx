import './TypingIndicator.css';
export default function TypingIndicator() {
  return (
    <div className="typing" aria-label="JasmineGPT is thinking">
      <div className="typing__dot" />
      <div className="typing__dot" />
      <div className="typing__dot" />
    </div>
  );
}
