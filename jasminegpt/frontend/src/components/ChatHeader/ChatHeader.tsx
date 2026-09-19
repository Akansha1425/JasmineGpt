import { useState, useEffect } from 'react';
import type { Conversation, LanguagePreference, FarmerProfile } from '../../types';
import LanguageSelector from '../LanguageSelector/LanguageSelector';
import { Sun, Moon, Menu } from 'lucide-react';
import './ChatHeader.css';

interface ChatHeaderProps {
  conversation: Conversation | null;
  languagePreference: LanguagePreference;
  onLanguageChange: (lang: LanguagePreference) => void;
  onToggleSidebar: () => void;
  /** Session-scoped farmer profile derived from messages */
  farmerProfile?: FarmerProfile;
}

const THEME_STORAGE_KEY = 'jasminegpt_theme';

export default function ChatHeader({
  conversation,
  languagePreference,
  onLanguageChange,
  onToggleSidebar,
  farmerProfile,
}: ChatHeaderProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // fallback
    }
    return 'dark';
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      // fallback
    }
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  // Build profile chips — only non-empty fields
  const chips: { key: string; icon: string; label: string }[] = [];
  if (farmerProfile?.cultivar) {
    chips.push({ key: 'cultivar', icon: '🌸', label: farmerProfile.cultivar });
  } else if (farmerProfile?.species) {
    chips.push({ key: 'species', icon: '🌿', label: farmerProfile.species });
  }
  if (farmerProfile?.district) {
    chips.push({ key: 'district', icon: '📍', label: farmerProfile.district });
  } else if (farmerProfile?.state) {
    chips.push({ key: 'state', icon: '📍', label: farmerProfile.state });
  }
  if (farmerProfile?.language) {
    chips.push({ key: 'language', icon: '🗣️', label: farmerProfile.language });
  }
  if (farmerProfile?.farmingPurpose) {
    chips.push({ key: 'purpose', icon: '🌾', label: farmerProfile.farmingPurpose });
  }

  const hasProfile = chips.length > 0;

  return (
    <header className="sticky top-0 z-20 w-full bg-[var(--bg-base)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 flex flex-col justify-center">
      <div className="flex items-center justify-between gap-3 h-14">
        {/* Left: Hamburger + Logo + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {/* Mobile-only drawer opener — desktop uses the toggle inside the sidebar */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 flex-shrink-0"
            aria-label="Open sidebar"
            id="mobile-menu-btn"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* 🌸 JasmineGPT Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl" role="img" aria-label="Jasmine flower">🌸</span>
            <span className="font-semibold text-[var(--text-primary)] text-sm sm:text-base hidden sm:inline">
              JasmineGPT
            </span>
          </div>

          {/* Conversation title */}
          {conversation && (
            <div className="flex items-center gap-2 min-w-0 border-l border-[var(--border)] pl-3 ml-1 overflow-hidden">
              <h2
                className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] truncate max-w-[100px] sm:max-w-[180px] md:max-w-[280px]"
                title={conversation.title}
              >
                {conversation.title}
              </h2>
            </div>
          )}
        </div>

        {/* Right: Language selector + Theme toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block">
            <LanguageSelector value={languagePreference} onChange={onLanguageChange} />
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border)] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Farmer Profile chip strip — only rendered when profile has data */}
      {hasProfile && (
        <div
          className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar"
          aria-label="Farmer profile"
          role="status"
        >
          {chips.map((chip, i) => (
            <span key={chip.key}>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap transition-all animate-message-fade-in">
                <span aria-hidden="true">{chip.icon}</span>
                <span>{chip.label}</span>
              </span>
              {/* dot separator between chips */}
              {i < chips.length - 1 && (
                <span className="text-[var(--text-muted)] mx-0.5 text-xs select-none" aria-hidden="true">·</span>
              )}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
