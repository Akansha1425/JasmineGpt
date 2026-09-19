import { useEffect } from 'react';
import type { LanguagePreference } from '../../types';
import { Globe } from 'lucide-react';
import { saveStoredLanguagePreference } from './storage';
import './LanguageSelector.css';

// Exported for external callers that need the storage helpers:
// import { getStoredLanguagePreference } from '../LanguageSelector/storage';

interface LanguageSelectorProps {
  value: LanguagePreference;
  onChange: (val: LanguagePreference) => void;
  compact?: boolean;
}

export default function LanguageSelector({
  value,
  onChange,
  compact = false,
}: LanguageSelectorProps) {
  useEffect(() => {
    saveStoredLanguagePreference(value);
  }, [value]);

  const options: Array<{
    id: LanguagePreference;
    label: string;
    title: string;
  }> = [
    { id: 'auto', label: 'Auto', title: 'Automatically detect language' },
    { id: 'en', label: 'English', title: 'English response' },
    { id: 'kn', label: 'ಕನ್ನಡ', title: 'Kannada response (ಕನ್ನಡ ಉತ್ತರ)' },
  ];

  return (
    <div
      className={`language-selector-pill inline-flex items-center gap-1 p-1 rounded-full bg-[var(--bg-surface-hover)] border border-[var(--border)] text-xs shadow-inner`}
      role="radiogroup"
      aria-label="Language selection"
    >
      {!compact && (
        <span className="pl-1.5 pr-0.5 text-[var(--text-muted)] flex items-center" aria-hidden="true">
          <Globe className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex items-center gap-0.5">
        {options.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              id={`lang-btn-${opt.id}`}
              role="radio"
              aria-checked={isActive}
              title={opt.title}
              onClick={() => onChange(opt.id)}
              className={`px-2.5 py-1 rounded-full font-medium transition-all duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-sm font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
