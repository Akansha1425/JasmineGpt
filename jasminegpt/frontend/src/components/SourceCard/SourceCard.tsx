import { useState } from 'react';
import type { SourceDoc, EvidenceStatus } from '../../types';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, AlertTriangle } from 'lucide-react';
import './SourceCard.css';

const BADGE_CONFIG: Record<
  EvidenceStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  DIRECT_EVIDENCE: {
    label: 'Direct Evidence',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: '✓',
  },
  MULTIPLE_STUDIES: {
    label: 'Multiple Studies',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: '⊕',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: '⚠',
  },
  SOURCE_REVIEW_REQUIRED: {
    label: 'Source Review Required',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: '⚠',
  },
  NOT_APPLICABLE: {
    label: 'General Knowledge',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: '•',
  },
};

interface EvidenceBadgeProps {
  status: EvidenceStatus;
}

export function EvidenceBadge({ status }: EvidenceBadgeProps) {
  const cfg = BADGE_CONFIG[status] ?? BADGE_CONFIG.NOT_APPLICABLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.badgeClass}`}
    >
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

interface EvidenceCardProps {
  doc: SourceDoc;
  isExpanded: boolean;
  onToggle: () => void;
}

export function EvidenceCard({ doc, isExpanded, onToggle }: EvidenceCardProps) {
  const authorYear = [doc.authors, doc.year].filter(Boolean).join(', ');
  const doiUrl = doc.doi
    ? doc.doi.startsWith('http')
      ? doc.doi
      : `https://doi.org/${doc.doi}`
    : null;

  return (
    <div
      className={`evidence-card rounded-xl border transition-all duration-200 overflow-hidden ${
        isExpanded
          ? 'bg-[var(--bg-surface-active)] border-[var(--border-highlight)] shadow-sm'
          : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--text-muted)]'
      } ${doc.isCrossSpecies ? 'border-amber-500/40' : ''}`}
    >
      {/* Clickable Card Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 flex items-start justify-between gap-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
        aria-expanded={isExpanded}
        aria-label={`Citation: ${doc.title}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            {/* Paper ID Badge */}
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {doc.documentId}
            </span>

            {/* Species Badge */}
            {doc.species && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[var(--brand-pink-dim)] text-[var(--brand-pink)] border border-pink-500/30 italic">
                {doc.species}
              </span>
            )}

            {/* Category badge if available */}
            {doc.category && (
              <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-700/40 text-slate-300 border border-slate-600/40">
                {doc.category}
              </span>
            )}
          </div>

          {/* Paper Title */}
          <h4 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
            {doc.title}
          </h4>

          {/* Author + Year + DOI short */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)] mt-1">
            {authorYear && <span>{authorYear}</span>}
            {doc.doi && (
              <span className="text-[var(--text-muted)]">
                DOI: {doc.doi.replace(/^https?:\/\/doi\.org\//, '')}
              </span>
            )}
          </div>
        </div>

        {/* Expand / Collapse Chevron */}
        <div className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2 animate-message-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {doc.authors && (
              <div>
                <span className="text-[var(--text-muted)] font-medium">Authors: </span>
                <span>{doc.authors}</span>
              </div>
            )}
            {doc.year && (
              <div>
                <span className="text-[var(--text-muted)] font-medium">Year: </span>
                <span>{doc.year}</span>
              </div>
            )}
            {doc.page !== undefined && (
              <div>
                <span className="text-[var(--text-muted)] font-medium">Page: </span>
                <span>p. {doc.page}</span>
              </div>
            )}
            {doc.score !== undefined && (
              <div>
                <span className="text-[var(--text-muted)] font-medium">Relevance Score: </span>
                <span>{(doc.score * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Cross-species warning */}
          {doc.isCrossSpecies && doc.crossSpeciesNote && (
            <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{doc.crossSpeciesNote}</span>
            </div>
          )}

          {/* External link to DOI */}
          {doiUrl && (
            <div className="pt-1">
              <a
                href={doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                <span>View publication / DOI</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SourceCardListProps {
  sources: SourceDoc[];
  status: EvidenceStatus;
  topScore?: number;
}

export default function SourceCardList({ sources, status }: SourceCardListProps) {
  // Accordion state: only ONE citation card may be expanded at a time
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!sources.length && status === 'NOT_APPLICABLE') return null;

  const handleToggle = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <div className="sources-container mt-4 pt-3 border-t border-[var(--border-subtle)]">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>Research Citations ({sources.length})</span>
        </div>
        <EvidenceBadge status={status} />
      </div>

      {sources.length > 0 && (
        <div className="space-y-2">
          {sources.map((doc) => (
            <EvidenceCard
              key={doc.documentId}
              doc={doc}
              isExpanded={expandedId === doc.documentId}
              onToggle={() => handleToggle(doc.documentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
