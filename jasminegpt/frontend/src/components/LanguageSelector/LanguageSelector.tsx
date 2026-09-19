import { useEffect } from 'react';
import type { LanguagePreference } from '../../types';
import './LanguageSelector.css';

interface LanguageSelectorProps {
  value: LanguagePreference;
  onChange: (val: LanguagePreference) => void;
}

const STORAGE_KEY = 'jasminegpt_language_pref';

export function getStoredLanguagePreference(): LanguagePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'kn' || stored === 'auto') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }
  return 'auto';
}

export function saveStoredLanguagePreference(pref: LanguagePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // localStorage might be unavailable
  }
}

export default function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  useEffect(() => {
    saveStoredLanguagePreference(value);
  }, [value]);

  const options: Array<{ id: LanguagePreference; label: string; title: string }> = [
    { id: 'auto', label: 'Auto', title: 'Automatically detect language' },
    { id: 'en', label: 'English', title: 'English response' },
    { id: 'kn', label: 'ಕನ್ನಡ', title: 'Kannada response (ಕನ್ನಡ ಉತ್ತರ)' },
  ];

  return (
    <div className="language-selector" role="radiogroup" aria-label="Language selection">
      <span className="language-selector__icon" aria-hidden="true">🌐</span>
      <div className="language-selector__pill">
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
              className={`language-selector__btn${isActive ? ' language-selector__btn--active' : ''}`}
              onClick={() => onChange(opt.id)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
