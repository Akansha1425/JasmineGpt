import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (msg: string) => void;
  disabled?: boolean;
  error?: string | null;
  prefill?: string;
  onPrefillConsumed?: () => void;
}

export default function ChatInput({ onSend, disabled, error, prefill, onPrefillConsumed }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Consume prefill from empty-state prompt pills
  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      textareaRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSend = useCallback(() => {
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrap">
      <div className="chat-input">
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          id="chat-message-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask JasmineGPT about jasmine farming…"
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          aria-multiline="true"
        />
        <button
          className="chat-input__send"
          id="chat-send-btn"
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          aria-label="Send message"
        >
          ➤
        </button>
      </div>
      <p className="chat-input__hint">Enter to send · Shift+Enter for new line</p>
      {error && (
        <div className="chat-input__error" role="alert">
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
