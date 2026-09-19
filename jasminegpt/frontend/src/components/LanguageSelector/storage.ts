import type { LanguagePreference } from '../../types';

export const LANGUAGE_STORAGE_KEY = 'jasminegpt_language_pref';

export function getStoredLanguagePreference(): LanguagePreference {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
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
    localStorage.setItem(LANGUAGE_STORAGE_KEY, pref);
  } catch {
    // localStorage might be unavailable
  }
}
