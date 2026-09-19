import React from 'react';

// ── Inline Markdown Formatter ────────────────────────────────────────────────
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-[var(--text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-badge)] border border-[var(--border-subtle)] text-emerald-300 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ── Markdown Block Renderer ──────────────────────────────────────────────────
export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Markdown Table: lines starting and ending with |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith('|') &&
        lines[i].trim().endsWith('|')
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--;

      if (tableLines.length >= 2) {
        const nonDividerRows = tableLines.filter(
          (row) => !/^\|[\s\-:|]+\|$/.test(row)
        );
        if (nonDividerRows.length > 0) {
          const parsedRows = nonDividerRows.map((row) =>
            row
              .slice(1, -1)
              .split('|')
              .map((c) => c.trim())
          );
          const [header, ...body] = parsedRows;
          elements.push(
            <div
              key={key++}
              className="overflow-x-auto my-3 rounded-xl border border-[var(--border)] shadow-sm bg-[var(--bg-card)]"
            >
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[var(--bg-surface-active)] text-[var(--text-primary)]">
                    {header.map((col, cIdx) => (
                      <th
                        key={cIdx}
                        className="border-b border-r last:border-r-0 border-[var(--border)] px-3 py-2.5 text-left font-semibold"
                      >
                        {inlineFormat(col)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {body.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="border-r last:border-r-0 border-[var(--border)] px-3 py-2 text-[var(--text-secondary)]"
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

    // Fenced code blocks ```
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={key++}
          className="my-3 p-3 rounded-xl bg-[#080d1a] border border-[var(--border)] text-xs font-mono overflow-x-auto text-emerald-300"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
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
        <ul
          key={key++}
          className="list-disc pl-5 my-2 space-y-1 text-[var(--text-primary)]"
        >
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {inlineFormat(item)}
            </li>
          ))}
        </ul>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={key++} className="h-1.5" />);
    } else if (/^#{1,4}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const textOnly = line.replace(/^#+\s/, '');
      if (level <= 2) {
        elements.push(
          <h3
            key={key++}
            className="text-base font-semibold text-[var(--text-primary)] mt-3 mb-1.5"
          >
            {inlineFormat(textOnly)}
          </h3>
        );
      } else {
        elements.push(
          <h4
            key={key++}
            className="text-sm font-semibold text-[var(--text-primary)] mt-2.5 mb-1"
          >
            {inlineFormat(textOnly)}
          </h4>
        );
      }
    } else {
      elements.push(
        <p key={key++} className="my-1.5 leading-relaxed text-[var(--text-primary)]">
          {inlineFormat(line)}
        </p>
      );
    }
  }
  return <>{elements}</>;
}
