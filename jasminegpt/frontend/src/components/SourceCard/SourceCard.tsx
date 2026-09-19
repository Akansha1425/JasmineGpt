import type { SourceDoc, EvidenceStatus } from '../../types';
import './SourceCard.css';

const BADGE_CONFIG: Record<EvidenceStatus, { label: string; cls: string; icon: string }> = {
  DIRECT_EVIDENCE:      { label: 'Direct Evidence', cls: 'direct',      icon: '✓' },
  MULTIPLE_STUDIES:     { label: 'Multiple Studies', cls: 'multiple',   icon: '⊕' },
  INSUFFICIENT_EVIDENCE:{ label: 'Insufficient Evidence', cls: 'insufficient', icon: '⚠' },
  SOURCE_REVIEW_REQUIRED:{ label: 'Source Review Required', cls: 'insufficient', icon: '⚠' },
  NOT_APPLICABLE:       { label: 'General Knowledge', cls: 'na',         icon: '•' },
};

interface EvidenceBadgeProps { status: EvidenceStatus }
export function EvidenceBadge({ status }: EvidenceBadgeProps) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.NOT_APPLICABLE;
  return (
    <span className={`evidence-badge evidence-badge--${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

interface SourceCardListProps {
  sources: SourceDoc[];
  status: EvidenceStatus;
  topScore?: number;
}

export default function SourceCardList({ sources, status }: SourceCardListProps) {
  if (!sources.length && status === 'NOT_APPLICABLE') return null;

  return (
    <div className="sources">
      <div className="sources__header">
        <EvidenceBadge status={status} />
      </div>

      {sources.length > 0 && (
        <>
          <div className="sources__label">📚 Sources</div>
          {sources.map((s) => (
            <div key={s.documentId} className={`source-card ${s.isCrossSpecies ? 'source-card--cross-species' : ''}`}>
              <div className="source-card__header-row">
                <span className="source-card__id">{s.documentId}</span>
              </div>

              <div className="source-card__info">
                <div className="source-card__title" title={s.title}>{s.title}</div>
                <div className="source-card__meta">
                  {[
                    s.species ? `Species: ${s.species}` : null,
                    s.category ? `Category: ${s.category}` : null,
                    s.authors,
                    s.year,
                    s.doi ? `DOI: ${s.doi}` : null,
                    s.page ? `p. ${s.page}` : null,
                  ].filter(Boolean).join(' · ')}
                </div>
                {s.isCrossSpecies && s.crossSpeciesNote && (
                  <div className="source-card__cross-note">
                    ⚠️ {s.crossSpeciesNote}
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
