import type { Message, RouteType } from '../../types';
import SourceCardList from '../SourceCard/SourceCard';
import './MessageBubble.css';

// Lightweight markdown renderer (bold, italic, lists, code, tables)
function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Markdown Table: lines starting and ending with |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;

      if (tableLines.length >= 2) {
        const nonDividerRows = tableLines.filter((row) => !/^\|[\s\-:|]+\|$/.test(row));
        if (nonDividerRows.length > 0) {
          const parsedRows = nonDividerRows.map((row) =>
            row
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim())
          );
          const [header, ...body] = parsedRows;
          elements.push(
            <div key={key++} style={{ overflowX: 'auto', margin: '8px 0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    {header.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        style={{
                          border: '1px solid var(--border)',
                          padding: '6px 10px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          textAlign: 'left',
                          fontWeight: 600,
                        }}
                      >
                        {inlineFormat(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          style={{
                            border: '1px solid var(--border)',
                            padding: '6px 10px',
                          }}
                        >
                          {inlineFormat(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }
    }

    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*•]\s/, ''));
        i++;
      }
      i--;
      elements.push(
        <ul key={key++}>
          {items.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}
        </ul>
      );
    } else if (line.trim() === '') {
      elements.push(<p key={key++} style={{ margin: '4px 0' }} />);
    } else if (/^#{1,3}\s/.test(line)) {
      elements.push(<strong key={key++} style={{ display: 'block', margin: '6px 0 2px 0' }}>{inlineFormat(line.replace(/^#+\s/, ''))}</strong>);
    } else {
      elements.push(<p key={key++}>{inlineFormat(line)}</p>);
    }
  }
  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // Handle **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2,-2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1,-1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i}>{part.slice(1,-1)}</code>;
    return part;
  });
}

const ROUTE_LABELS: Record<RouteType, string> = {
  POSTHARVEST: '🌿 Post-Harvest',
  GENERAL_RAG: '🔬 General Research',
  MEMORY_UPDATE: '🧠 Memory Updated',
};

interface MessageBubbleProps { message: Message; isTyping?: boolean }

export default function MessageBubble({ message, isTyping: _isTyping }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message message--${isUser ? 'user' : 'assistant'}`}>
      <div className="message__avatar" aria-hidden="true">
        {isUser ? '👤' : '🌸'}
      </div>
      <div>
        {!isUser && message.route && message.route !== 'MEMORY_UPDATE' && (
          <div className={`message__route-tag message__route-tag--${message.route}`}>
            {ROUTE_LABELS[message.route]}
          </div>
        )}
        <div className="message__bubble" role={isUser ? undefined : 'article'}>
          {renderMarkdown(message.content)}
        </div>
        {!isUser && message.evidenceStatus && message.sources !== undefined && (
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
