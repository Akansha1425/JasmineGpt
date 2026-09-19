import { useState, useRef, useCallback, useEffect } from 'react';
import type { LanguagePreference } from '../types';

export type SpeechStatus = 'idle' | 'listening' | 'error';

export interface SpeechError {
  type: 'not-supported' | 'permission-denied' | 'no-speech' | 'network' | 'unknown';
  message: string;
}

interface UseSpeechRecognitionReturn {
  /** Current status */
  status: SpeechStatus;
  /** Live interim transcript while listening */
  interimTranscript: string;
  /** Final committed transcript (cleared after onResult fires) */
  finalTranscript: string;
  /** Error details when status === 'error' */
  error: SpeechError | null;
  /** Whether the browser supports SpeechRecognition at all */
  isSupported: boolean;
  /** Start listening */
  start: () => void;
  /** Stop listening (fires onResult with whatever was captured) */
  stop: () => void;
  /** Clear any error and reset to idle */
  clearError: () => void;
}

// Map LanguagePreference → BCP-47 locale for SpeechRecognition
function toLangCode(pref?: LanguagePreference): string {
  if (pref === 'kn') return 'kn-IN';
  if (pref === 'en') return 'en-IN';
  // 'auto' or undefined — use browser default (usually en-US)
  return 'en-IN';
}

// Detect support once at module level — prefer standard, fall back to webkit prefix
function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null;
  if ('SpeechRecognition' in window) return window.SpeechRecognition!;
  if ('webkitSpeechRecognition' in window) return window.webkitSpeechRecognition!;
  return null;
}

const SpeechRecognitionCtor = getSpeechRecognitionCtor();

/**
 * useSpeechRecognition
 *
 * Wraps the Web Speech API to provide ChatGPT-style voice input.
 * All audio stays in the browser — nothing is sent to the server.
 *
 * @param languagePreference  Drives the recognition locale (en-IN / kn-IN)
 * @param onResult            Callback fired with the final transcript on stop
 */
export function useSpeechRecognition(
  languagePreference: LanguagePreference | undefined,
  onResult: (transcript: string) => void
): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef<string>(''); // collects final results during a session

  const isSupported = SpeechRecognitionCtor !== null;

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor) {
      setError({
        type: 'not-supported',
        message: 'Speech recognition is not supported in this browser. Try Chrome or Edge.',
      });
      setStatus('error');
      return;
    }

    // Abort any existing session
    recognitionRef.current?.abort();
    accumulatedRef.current = '';
    setInterimTranscript('');
    setFinalTranscript('');
    setError(null);

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = toLangCode(languagePreference);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        accumulatedRef.current += final;
        setFinalTranscript(accumulatedRef.current);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let speechError: SpeechError;

      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          speechError = {
            type: 'permission-denied',
            message: 'Microphone access was denied. Please allow microphone permission and try again.',
          };
          break;
        case 'no-speech':
          speechError = {
            type: 'no-speech',
            message: 'No speech detected. Please try again.',
          };
          break;
        case 'network':
          speechError = {
            type: 'network',
            message: 'Network error during speech recognition. Check your connection.',
          };
          break;
        default:
          speechError = {
            type: 'unknown',
            message: `Speech recognition error: ${event.error}`,
          };
      }

      setError(speechError);
      setStatus('error');
      setInterimTranscript('');
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      // Fire the result callback with everything accumulated
      const result = accumulatedRef.current.trim();
      if (result) {
        onResult(result);
      }
      setInterimTranscript('');
      setStatus('idle');
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [languagePreference, onResult]);

  return {
    status,
    interimTranscript,
    finalTranscript,
    error,
    isSupported,
    start,
    stop,
    clearError,
  };
}
