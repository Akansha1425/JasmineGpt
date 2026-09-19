import type { Conversation } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function groupByDate(conversations: Conversation[]) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  const groups: { label: string; items: Conversation[] }[] = [];
  const todayItems: Conversation[] = [];
  const yesterdayItems: Conversation[] = [];
  const olderItems: Conversation[] = [];

  for (const c of conversations) {
    const d = new Date(c.updatedAt ?? c.createdAt ?? 0); d.setHours(0,0,0,0);
    if (d >= today) todayItems.push(c);
    else if (d >= yesterday) yesterdayItems.push(c);
    else olderItems.push(c);
  }
  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (olderItems.length) groups.push({ label: 'Older', items: olderItems });
  return groups;
}

export default function Sidebar({ conversations, activeId, onSelect, onCreate, onDelete }: SidebarProps) {
  const groups = groupByDate(conversations);

  return (
    <aside className="sidebar" aria-label="Conversation sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <span className="sidebar__logo-icon">🌸</span>
          <span className="sidebar__logo-text">JasmineGPT</span>
        </div>
        <button className="sidebar__new-btn" onClick={onCreate} id="new-chat-btn" aria-label="New chat">
          <span>＋</span> New Chat
        </button>
      </div>

      <div className="sidebar__list" role="list">
        {conversations.length === 0 ? (
          <div className="sidebar__empty">No conversations yet.<br />Start one above.</div>
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <div className="sidebar__section-label">{g.label}</div>
              {g.items.map((c) => (
                <div
                  key={c.conversationId}
                  className={`sidebar__item${c.conversationId === activeId ? ' sidebar__item--active' : ''}`}
                  onClick={() => onSelect(c.conversationId)}
                  role="listitem"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(c.conversationId)}
                  id={`conv-${c.conversationId}`}
                >
                  <span className="sidebar__item-icon">💬</span>
                  <span className="sidebar__item-title" title={c.title}>{c.title}</span>
                  <button
                    className="sidebar__item-delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(c.conversationId); }}
                    aria-label={`Delete ${c.title}`}
                    id={`delete-conv-${c.conversationId}`}
                  >🗑</button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
