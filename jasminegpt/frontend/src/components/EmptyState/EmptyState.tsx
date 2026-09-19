import './EmptyState.css';

const EXAMPLE_PROMPTS = [
  'What packaging was tested for Gundumalli?',
  'I grow Gundumalli jasmine.',
  'I have a jasmine bud worm problem.',
  'How should I store jasmine flowers after harvest?',
  'What fertilizer schedule is best?',
  'How did mycelium foam packaging perform?',
];

interface EmptyStateProps {
  onPrompt: (text: string) => void;
}

export default function EmptyState({ onPrompt }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">🌸</div>
      <h1 className="empty-state__title">JasmineGPT</h1>
      <p className="empty-state__subtitle">
        Evidence-grounded answers for jasmine farmers, powered by verified
        scientific research. Ask about pest management, packaging, storage,
        nutrition, or cultivation.
      </p>
      <div className="empty-state__pills">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            className="empty-state__pill"
            onClick={() => onPrompt(p)}
            id={`prompt-${p.slice(0, 20).replace(/\W+/g, '-')}`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
