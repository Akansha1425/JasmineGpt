import type { Message, RouteType } from '../../types';
import SourceCardList from '../SourceCard/SourceCard';
import { Sparkles, FileText, Info } from 'lucide-react';
import { renderMarkdown } from './renderMarkdown';
import './MessageBubble.css';

const ROUTE_LABELS: Record<RouteType, string> = {
  POSTHARVEST: 'Post-Harvest Management',
  GENERAL_RAG: 'Cultivation Research',
  MEMORY_UPDATE: 'Memory Updated',
};

// ── Parsed section interface ─────────────────────────────────────────────────
interface ParsedSections {
  directAnswer?: { header: string; body: string };
  evidence?: { header: string; body: string };
  scope?: { header: string; body: string };
  isStructured: boolean;
}

function parseAssistantContent(content: string): ParsedSections {
  // Matches both English and Kannada section headings from the backend
  const s1Regex = /###\s*1\.\s*(?:Direct Answer|ನೇರ ಉತ್ತರ[^(]*(?:\([^)]+\))?)/i;
  const s2Regex = /###\s*2\.\s*(?:(?:Related\s+)?Evidence from Retrieved Studies|ಸಂಶೋಧನಾ ಅಧ್ಯಯನಗಳ ಸಾಕ್ಷ್ಯ|ಸಂಬಂಧಿತ ಸಂಶೋಧನಾ ಸಾಕ್ಷ್ಯ)[^\n]*/i;
  const s3Regex = /###\s*3\.\s*(?:Research Scope|ಸಂಶೋಧನಾ ವ್ಯಾಪ್ತಿ)[^\n]*/i;

  const s1Match = content.match(s1Regex);
  const s2Match = content.match(s2Regex);
  const s3Match = content.match(s3Regex);

  if (s1Match && s2Match && s1Match.index !== undefined && s2Match.index !== undefined) {
    const s1Index = s1Match.index;
    const s2Index = s2Match.index;
    const s3Index = s3Match?.index ?? content.length;

    const s1Header = s1Match[0].trim();
    const s1Body = content.slice(s1Index + s1Match[0].length, s2Index).trim();

    const s2Header = s2Match[0].trim();
    const s2Body = content.slice(s2Index + s2Match[0].length, s3Index).trim();

    let scopeSection: { header: string; body: string } | undefined;
    if (s3Match && s3Match.index !== undefined) {
      scopeSection = {
        header: s3Match[0].trim(),
        body: content.slice(s3Match.index + s3Match[0].length).trim(),
      };
    }

    return {
      directAnswer: { header: s1Header, body: s1Body },
      evidence: { header: s2Header, body: s2Body },
      scope: scopeSection,
      isStructured: true,
    };
  }

  return { isStructured: false };
}

// ── User Message ─────────────────────────────────────────────────────────────
export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end mb-6">
      <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-sm px-5 py-3.5 bg-[var(--bg-message-user)] border border-[var(--border-subtle)] text-[var(--text-primary)] shadow-sm">
        <p className="whitespace-pre-wrap leading-relaxed select-text text-sm sm:text-base">
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ── Assistant Message ─────────────────────────────────────────────────────────
export function AssistantMessage({ message }: { message: Message }) {
  const parsed = parseAssistantContent(message.content);
  const firstCategory = message.sources?.[0]?.category;
  const categoryLabel =
    firstCategory ||
    (message.route ? ROUTE_LABELS[message.route] : null) ||
    'Jasmine Agronomy';

  return (
    <div className="flex items-start gap-3 sm:gap-4 mb-8 animate-message-fade-in">
      {/* 🌸 Avatar */}
      <div
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--brand-pink-dim)] border border-pink-500/30 flex items-center justify-center text-base sm:text-lg flex-shrink-0 shadow-sm mt-0.5"
        aria-hidden="true"
      >
        🌸
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        {/* Category Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--brand-pink-dim)] text-[var(--brand-pink)] border border-pink-500/30 tracking-wide">
            🌸 <span>{categoryLabel}</span>
          </span>
        </div>

        {/* Structured Card Hierarchy */}
        {parsed.isStructured && parsed.directAnswer ? (
          <div className="space-y-3">
            {/* 1. Direct Answer Card */}
            <div className="rounded-2xl bg-[var(--bg-surface)] border-l-4 border-l-emerald-500 border border-[var(--border)] p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{parsed.directAnswer.header.replace(/^#+\s*\d+\.\s*/, '')}</span>
              </div>
              <div className="text-sm sm:text-base leading-relaxed">
                {renderMarkdown(parsed.directAnswer.body)}
              </div>
            </div>

            {/* 2. Evidence from Retrieved Studies Card */}
            {parsed.evidence?.body && (
              <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{parsed.evidence.header.replace(/^#+\s*\d+\.\s*/, '')}</span>
                </div>
                <div className="text-sm leading-relaxed">
                  {renderMarkdown(parsed.evidence.body)}
                </div>
              </div>
            )}

            {/* 3. Research Scope Card */}
            {parsed.scope?.body && (
              <div className="rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-subtle)] px-4 py-3 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="italic leading-relaxed flex-1">
                  {renderMarkdown(parsed.scope.body)}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Unstructured / general fallback */
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 sm:p-5 shadow-sm text-sm sm:text-base leading-relaxed">
            {renderMarkdown(message.content)}
          </div>
        )}

        {/* Sources: Collapsible Evidence Cards */}
        {message.evidenceStatus && message.sources !== undefined && (
          <SourceCardList
            sources={message.sources ?? []}
            status={message.evidenceStatus}
            topScore={message.topScore}
          />
        )}
      </div>
    </div>
  );
}

// ── Default: routes to the right component ───────────────────────────────────
interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} />;
}
