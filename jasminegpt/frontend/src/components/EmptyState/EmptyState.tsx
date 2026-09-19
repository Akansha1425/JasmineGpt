import { Sparkles } from 'lucide-react';
import './EmptyState.css';

const EXAMPLE_PROMPTS = [
  {
    title: 'Post-Harvest Packaging',
    prompt: 'What packaging was tested for Gundumalli?',
    desc: 'Corrugated boxes, mycelium foam, and CFB trials',
  },
  {
    title: 'Cultivar Context',
    prompt: 'I grow Gundumalli jasmine.',
    desc: 'Set conversation memory for Jasminum sambac',
  },
  {
    title: 'Pest & Disorder',
    prompt: 'I have a jasmine bud worm problem.',
    desc: 'Evidence-scoped pest symptoms and management',
  },
  {
    title: 'Cold Storage Protocols',
    prompt: 'How should I store jasmine flowers after harvest?',
    desc: 'Recommended temperature and duration limits',
  },
  {
    title: 'Crop Nutrition Trials',
    prompt: 'What fertilizer schedule is best?',
    desc: 'NPK dosages tested in peer-reviewed studies',
  },
  {
    title: 'Sustainable Packaging',
    prompt: 'How did mycelium foam packaging perform?',
    desc: 'Shelf life and freshness retention comparison',
  },
];

interface EmptyStateProps {
  onPrompt: (text: string) => void;
}

export default function EmptyState({ onPrompt }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center my-auto py-8 text-center max-w-2xl mx-auto px-4 animate-message-fade-in select-none">
      {/* 🌸 Icon */}
      <div className="w-16 h-16 rounded-3xl bg-[var(--brand-pink-dim)] border border-pink-500/30 flex items-center justify-center text-3xl mb-4 shadow-sm">
        🌸
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2.5">
        JasmineGPT
      </h1>

      <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-lg mb-8 leading-relaxed">
        Evidence-grounded agronomy assistant for jasmine farmers. Powered by verified
        scientific research on post-harvest handling, pest symptoms, nutrition, and cultivation.
      </p>

      {/* Suggestion prompt cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {EXAMPLE_PROMPTS.map((item) => (
          <button
            key={item.prompt}
            type="button"
            className="group p-3.5 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border)] hover:border-[var(--border-highlight)] transition-all duration-200 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 shadow-sm"
            onClick={() => onPrompt(item.prompt)}
            id={`prompt-${item.prompt.slice(0, 20).replace(/\W+/g, '-')}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                {item.title}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-emerald-400 transition-colors" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
              {item.prompt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
