import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { LanguagePreference } from '../../types';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { ArrowUp, Loader2, AlertCircle, Mic, MicOff, X } from 'lucide-react';
import './ChatInput.css';

interface ChatInputProps {
  onSend: (msg: string) => void;
  disabled?: boolean;
  error?: string | null;
  prefill?: string;
  onPrefillConsumed?: () => void;
  languagePreference?: LanguagePreference;
  onLanguageChange?: (lang: LanguagePreference) => void;
}

export default function ChatInput({
  onSend,
  disabled,
  error,
  prefill,
  onPrefillConsumed,
  languagePreference,
  onLanguageChange,
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Voice to text ─────────────────────────────────────────────────────────
  const handleSpeechResult = useCallback(
    (transcript: string) => {
      setValue((prev) => {
        const joined = prev.trim() ? `${prev.trim()} ${transcript}` : transcript;
        return joined;
      });
      // Auto-focus so user can immediately review / edit / send
      setTimeout(() => textareaRef.current?.focus(), 50);
    },
    []
  );

  const {
    status: speechStatus,
    interimTranscript,
    error: speechError,
    isSupported: isSpeechSupported,
    start: startListening,
    stop: stopListening,
    clearError: clearSpeechError,
  } = useSpeechRecognition(languagePreference, handleSpeechResult);

  const isListening = speechStatus === 'listening';

  // ── Prefill from empty-state prompt pills ─────────────────────────────────
  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      textareaRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const msg = value.trim();
    if (!msg || disabled) return;
    // Stop listening before sending (if still active)
    if (isListening) stopListening();
    onSend(msg);
    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }, [value, disabled, onSend, isListening, stopListening]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSendDisabled = disabled || !value.trim();

  // ── Mic button toggle ─────────────────────────────────────────────────────
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="w-full max-w-[860px] mx-auto px-4 pb-4">
      {/* API / send error */}
      {error && (
        <div
          className="mb-2.5 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Speech error banner */}
      {speechError && (
        <div
          className="mb-2.5 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2"
          role="alert"
        >
          <MicOff className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{speechError.message}</span>
          <button
            type="button"
            onClick={clearSpeechError}
            className="p-0.5 rounded hover:bg-amber-500/20 transition-colors"
            aria-label="Dismiss speech error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Listening indicator */}
      {isListening && (
        <div
          className="mb-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs animate-message-fade-in"
          role="status"
          aria-live="polite"
        >
          {/* Pulsing red dot */}
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="font-medium">Listening…</span>
          {interimTranscript && (
            <span className="text-red-300/80 italic truncate max-w-[280px] sm:max-w-[420px]">
              {interimTranscript}
            </span>
          )}
        </div>
      )}

      {/* ChatGPT-style rounded capsule */}
      <div
        className={`relative rounded-[28px] bg-[var(--bg-input)] border transition-all duration-200 shadow-sm p-2 sm:p-2.5 ${
          isListening
            ? 'border-red-500/60 ring-1 ring-red-500/20'
            : 'border-[var(--border)] focus-within:border-[var(--border-highlight)]'
        }`}
      >
        <textarea
          ref={textareaRef}
          className="w-full bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base resize-none focus:outline-none px-3 pt-1.5 pb-1 max-h-40 leading-relaxed"
          id="chat-message-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening — speak now…'
              : 'Ask JasmineGPT about jasmine farming...'
          }
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          aria-multiline="true"
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between pt-1 px-1.5">
          {/* Left: language selector */}
          <div className="flex items-center">
            {languagePreference && onLanguageChange ? (
              <LanguageSelector
                value={languagePreference}
                onChange={onLanguageChange}
                compact
              />
            ) : null}
          </div>

          {/* Right: mic button + send button */}
          <div className="flex items-center gap-1.5">
            {/* Microphone button — hidden when browser doesn't support Web Speech */}
            {isSpeechSupported && (
              <button
                type="button"
                id="voice-input-btn"
                onClick={handleMicClick}
                aria-label={isListening ? 'Stop listening' : 'Start voice input'}
                title={
                  isListening
                    ? 'Stop recording'
                    : languagePreference === 'kn'
                    ? 'Voice input (ಕನ್ನಡ)'
                    : 'Voice input (English)'
                }
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                  isListening
                    ? 'bg-red-500 text-white shadow-sm scale-105'
                    : 'bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 border border-[var(--border)]'
                }`}
              >
                {isListening ? (
                  /* Animated mic while recording */
                  <span className="relative flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping" />
                    <Mic className="w-4 h-4 relative" />
                  </span>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Send button */}
            <button
              type="button"
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                isSendDisabled
                  ? 'bg-[var(--bg-surface-active)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
              }`}
              id="chat-send-btn"
              onClick={handleSend}
              disabled={isSendDisabled}
              aria-label={disabled ? 'Sending message...' : 'Send message'}
            >
              {disabled ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-[var(--text-muted)] mt-2 select-none">
        Enter to send · Shift+Enter for new line
        {isSpeechSupported && (
          <span> · <span role="img" aria-label="microphone">🎙️</span> for voice</span>
        )}
      </p>
    </div>
  );
}
