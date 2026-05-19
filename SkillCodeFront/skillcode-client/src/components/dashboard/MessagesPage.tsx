import { useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import Pagination from '../common/Pagination';
import { useAuth } from '../../context/AuthContext';
import {
  getReceivedShares,
  getSentShares,
  markShareRead,
  saveShareTask,
  unsaveShareTask,
} from '../../api/sharesApi';
import type { ReceivedShareResponse, SentShareResponse } from '../../types/share';
import ShareModal from './ShareModal';

const LANG_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  python:     { label: 'python',     color: 'var(--blue)',   bg: 'rgba(121,192,255,0.1)',  border: 'rgba(121,192,255,0.25)' },
  javascript: { label: 'javascript', color: 'var(--yellow)', bg: 'rgba(227,179,65,0.1)',   border: 'rgba(227,179,65,0.25)'  },
  typescript: { label: 'typescript', color: 'var(--blue)',   bg: 'rgba(121,192,255,0.1)',  border: 'rgba(121,192,255,0.25)' },
  rust:       { label: 'rust',       color: 'var(--orange)', bg: 'rgba(255,166,87,0.1)',   border: 'rgba(255,166,87,0.25)'  },
  go:         { label: 'go',         color: 'var(--cyan)',   bg: 'rgba(86,212,221,0.1)',   border: 'rgba(86,212,221,0.25)'  },
  sql:        { label: 'sql',        color: 'var(--purple)', bg: 'rgba(210,168,255,0.1)',  border: 'rgba(210,168,255,0.25)' },
};

function avaStyle(c: string): CSSProperties {
  if (c === 'b') return { background: '#1a3a5a', color: 'var(--blue)'   };
  if (c === 'p') return { background: '#2a1a4a', color: 'var(--purple)' };
  if (c === 'y') return { background: '#2a2a10', color: 'var(--yellow)' };
  if (c === 'o') return { background: '#2a1a0a', color: 'var(--orange)' };
  if (c === 'c') return { background: '#0a2a2a', color: 'var(--cyan)'   };
  return { background: 'var(--accent-dim)', color: 'var(--accent)' };
}

const AVA_COLORS = ['b', 'p', 'y', 'o', 'c'] as const;

function nameToColor(fullName: string): string {
  let h = 0;
  for (let i = 0; i < fullName.length; i++) h = (h * 31 + fullName.charCodeAt(i)) & 0xffff;
  return AVA_COLORS[h % AVA_COLORS.length];
}

function nameToInitials(firstName: string, lastName: string): string {
  return (firstName[0] ?? '').toUpperCase() + (lastName[0] ?? '').toUpperCase();
}

const UA_MONTHS = ['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'];

function toMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const diff = toMidnight(new Date()) - toMidnight(d);
  if (diff === 0) return 'Сьогодні';
  if (diff === 86_400_000) return 'Вчора';
  return `${d.getDate()} ${UA_MONTHS[d.getMonth()]}`;
}

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = toMidnight(now) - toMidnight(d);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (diff === 0) {
    const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return 'щойно';
    if (mins < 60) return `${mins} хв тому`;
    return `сьогодні, ${hh}:${mm}`;
  }
  if (diff === 86_400_000) return `вчора, ${hh}:${mm}`;
  return `${d.getDate()} ${UA_MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

interface ReceivedMsg {
  id: string;
  shareId: string;
  taskId: string;
  unread: boolean;
  day: string;
  from: { name: string; initials: string; c: string };
  title: string;
  lang?: string;
  time: string;
  group?: string;
}

interface Recipient {
  initials: string;
  c: string;
  name: string;
  opened: boolean;
}

interface SentMsg {
  id: string;
  day: string;
  title: string;
  lang?: string;
  time: string;
  recipients: Recipient[];
  group?: string;
}

function mapReceived(s: ReceivedShareResponse): ReceivedMsg {
  const fullName = `${s.sender.firstName} ${s.sender.lastName}`;
  return {
    id: s.shareId,
    shareId: s.shareId,
    taskId: s.taskId,
    unread: !s.isRead,
    day: dayLabel(s.sentAt),
    from: {
      name: fullName,
      initials: nameToInitials(s.sender.firstName, s.sender.lastName),
      c: nameToColor(fullName),
    },
    title: s.taskTitle,
    time: timeLabel(s.sentAt),
  };
}

function groupSent(shares: SentShareResponse[]): SentMsg[] {
  const map = new Map<string, SentMsg>();
  for (const s of shares) {
    if (!map.has(s.taskId)) {
      map.set(s.taskId, {
        id: s.taskId,
        day: dayLabel(s.sentAt),
        title: s.taskTitle,
        time: timeLabel(s.sentAt),
        recipients: [],
      });
    }
    const msg = map.get(s.taskId)!;
    const fullName = `${s.receiver.firstName} ${s.receiver.lastName}`;
    msg.recipients.push({
      initials: nameToInitials(s.receiver.firstName, s.receiver.lastName),
      c: nameToColor(fullName),
      name: fullName,
      opened: s.isRead,
    });
  }
  return Array.from(map.values());
}

function LangChip({ lang }: { lang: string }) {
  const m = LANG_META[lang] ?? LANG_META['python'];
  return (
    <span className="msg-chip msg-chip-lang" style={{ color: m.color, borderColor: m.border, background: m.bg }}>
      <span className="msg-chip-dot" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

function SaveBtn({ id, saved, onToggle }: { id: string; saved: Set<string>; onToggle: (id: string) => void }) {
  const isSaved = saved.has(id);
  return (
    <button
      className={`msg-btn-save${isSaved ? ' saved' : ''}`}
      onClick={(e) => { e.stopPropagation(); onToggle(id); }}
      title={isSaved ? 'Збережено' : 'Зберегти'}
    >
      <svg viewBox="0 0 16 16" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M3.5 2.5h9v12L8 11l-4.5 3.5z" />
      </svg>
    </button>
  );
}

function ShareBtn({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button
      className="msg-btn-save"
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      title="Поділитись"
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v8" />
        <path d="M5 5l3-3 3 3" />
        <path d="M4 9v4h8V9" />
      </svg>
    </button>
  );
}

function ReceivedCard({ msg, onMarkRead, saved, onToggleSave, onShare, onTakeTest }: {
  msg: ReceivedMsg;
  onMarkRead: (id: string, shareId: string) => void;
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onShare: (taskId: string, taskTitle: string) => void;
  onTakeTest?: (taskId: string, shareId: string) => void;
}) {
  return (
    <div className={`msg-card${msg.unread ? ' unread' : ''}`} onClick={() => { if (msg.unread) onMarkRead(msg.id, msg.shareId); }}>
      <div className="msg-card-left">
        <div className="msg-card-ava" style={avaStyle(msg.from.c)}>{msg.from.initials}</div>
        <div className="msg-card-main">
          <div className="msg-card-header">
            <span className="msg-card-from">{msg.from.name}</span>
            <span className="msg-card-verb">поділився(-лась) завданням</span>
            {msg.unread && <span className="msg-new-dot" />}
          </div>
          <div className="msg-card-title-row">
            <div className="msg-card-title"><span className="msg-card-slash">// </span>{msg.title}</div>
          </div>
          <div className="msg-chips">
            {msg.lang && <LangChip lang={msg.lang} />}
            {msg.group && <span className="msg-chip">⬡ {msg.group}</span>}
            <span className="msg-chip msg-chip-time">{msg.time}</span>
          </div>
        </div>
      </div>
      <div className="msg-card-right">
        <div className="msg-action-row">
          <SaveBtn id={msg.id} saved={saved} onToggle={onToggleSave} />
          <ShareBtn onClick={() => onShare(msg.taskId, msg.title)} />
          <button className="btn-run" onClick={e => {
            e.stopPropagation();
            if (msg.unread) onMarkRead(msg.id, msg.shareId);
            onTakeTest?.(msg.taskId, msg.shareId);
          }}>
            ▶ Пройти
          </button>
        </div>
      </div>
    </div>
  );
}

function SentCard({ msg, saved, onToggleSave, onShare }: {
  msg: SentMsg;
  saved: Set<string>;
  onToggleSave: (id: string) => void;
  onShare: (taskId: string, taskTitle: string) => void;
}) {
  const opened = msg.recipients.filter(r => r.opened).length;
  const total = msg.recipients.length;
  return (
    <div className="msg-card">
      <div className="msg-card-left">
        <div className="msg-card-ava" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', fontSize: 10 }}>Ти</div>
        <div className="msg-card-main">
          <div className="msg-card-header">
            <span className="msg-card-from">Ти</span>
            <span className="msg-card-arrow">→</span>
            {msg.group ? (
              <span className="msg-card-to">⬡ {msg.group} <span style={{ color: 'var(--text-faint)' }}>({total} учасників)</span></span>
            ) : (
              <span className="msg-card-to">
                {msg.recipients.slice(0, 2).map(r => r.name).join(', ')}
                {total > 2 && <span style={{ color: 'var(--text-faint)' }}> +{total - 2}</span>}
              </span>
            )}
          </div>
          <div className="msg-card-title-row">
            <div className="msg-card-title"><span className="msg-card-slash">// </span>{msg.title}</div>
          </div>
          <div className="msg-chips">
            {msg.lang && <LangChip lang={msg.lang} />}
            <span className="msg-chip msg-chip-time">{msg.time}</span>
          </div>
        </div>
      </div>
      <div className="msg-card-right">
        <div className="msg-action-row">
          <SaveBtn id={msg.id} saved={saved} onToggle={onToggleSave} />
          <ShareBtn onClick={() => onShare(msg.id, msg.title)} />
          <button className="btn-run">▶ Пройти</button>
        </div>
        <div className="msg-recipients">
          <div className="msg-recipients-line">
            {msg.recipients.slice(0, 5).map((r, i) => (
              <div key={i} className="msg-mini-ava" style={avaStyle(r.c)} title={r.name + (r.opened ? ' · відкрито' : ' · не відкрито')}>
                {r.initials}
              </div>
            ))}
            {total > 5 && (
              <div className="msg-mini-ava" style={{ background: 'var(--bg)', color: 'var(--text-muted)', border: '1.5px solid var(--bg-card)' }}>
                +{total - 5}
              </div>
            )}
          </div>
          <div className="msg-read-status">відкрили: <b style={{ color: 'var(--accent)' }}>{opened}/{total}</b></div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage({ onTakeTest }: { onTakeTest?: (taskId: string, shareId: string) => void }) {
  const { accessToken } = useAuth();
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const [search, setSearch] = useState('');
  const [received, setReceived] = useState<ReceivedMsg[]>([]);
  const [sent, setSent] = useState<SentMsg[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState<{ taskId: string; taskTitle: string } | null>(null);
  const [pageReceived, setPageReceived] = useState(1);
  const [pageSent, setPageSent] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getReceivedShares(accessToken, { limit: 100 }),
      getSentShares(accessToken, { limit: 100 }),
    ]).then(([recResult, sentResult]) => {
      if (cancelled) return;
      const mappedReceived = recResult.items.map(mapReceived);
      setReceived(mappedReceived);
      setSaved(new Set(
        recResult.items.filter(s => s.isSaved).map(s => s.shareId)
      ));
      setSent(groupSent(sentResult.items));
    }).catch(() => {
      // keep empty state on error
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [accessToken]);

  const toggleSave = (id: string) => {
    const isSaved = saved.has(id);
    setSaved(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    const msg = received.find(m => m.id === id);
    if (!msg || !accessToken) return;
    const apiCall = isSaved
      ? unsaveShareTask(accessToken, msg.shareId)
      : saveShareTask(accessToken, msg.shareId);
    apiCall.catch(() => {
      setSaved(s => {
        const next = new Set(s);
        if (isSaved) next.add(id); else next.delete(id);
        return next;
      });
    });
  };

  const unreadCount = received.filter(m => m.unread).length;

  const handleMarkRead = (id: string, shareId: string) => {
    setReceived(rs => rs.map(r => r.id === id ? { ...r, unread: false } : r));
    if (accessToken) markShareRead(accessToken, shareId, true).catch(() => {});
  };

  const handleMarkAllRead = () => {
    const unread = received.filter(m => m.unread);
    setReceived(rs => rs.map(r => ({ ...r, unread: false })));
    if (accessToken) {
      unread.forEach(m => markShareRead(accessToken, m.shareId, true).catch(() => {}));
    }
  };

  const filteredReceived = useMemo(() => {
    if (!search) return received;
    const q = search.toLowerCase();
    return received.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.from.name.toLowerCase().includes(q) ||
      (m.lang ?? '').includes(q)
    );
  }, [received, search]);

  const filteredSent = useMemo(() => {
    if (!search) return sent;
    const q = search.toLowerCase();
    return sent.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.recipients.some(r => r.name.toLowerCase().includes(q)) ||
      (m.lang ?? '').includes(q)
    );
  }, [sent, search]);

  const list = tab === 'received' ? filteredReceived : filteredSent;

  const currentPage    = tab === 'received' ? pageReceived : pageSent;
  const setCurrentPage = tab === 'received' ? setPageReceived : setPageSent;
  const totalPages     = Math.ceil(list.length / PAGE_SIZE);
  const paginatedList  = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const days: string[] = [];
  const seen: Record<string, boolean> = {};
  paginatedList.forEach(m => { if (!seen[m.day]) { seen[m.day] = true; days.push(m.day); } });

  return (
    <div className="content">
      {shareTarget && (
        <ShareModal
          taskId={shareTarget.taskId}
          taskTitle={shareTarget.taskTitle}
          onClose={() => setShareTarget(null)}
        />
      )}
      <div className="msg-mailbox-tabs">
        <div className={`msg-mailbox-tab${tab === 'received' ? ' active' : ''}`} onClick={() => { setTab('received'); setPageReceived(1); }}>
          <span>↓ // надіслані мені</span>
          {unreadCount > 0 && <span className="msg-tab-count">{unreadCount}</span>}
        </div>
        <div className={`msg-mailbox-tab${tab === 'sent' ? ' active' : ''}`} onClick={() => { setTab('sent'); setPageSent(1); }}>
          <span>↑ // надіслані мною</span>
        </div>
      </div>

      <div className="msg-toolbar">
        <div className="msg-spacer" />
        <div className="search-box">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⌕</span>
          <input
            placeholder="// пошук за назвою, автором, мовою..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        {tab === 'received' && unreadCount > 0 && (
          <button className="btn-ghost" onClick={handleMarkAllRead}>✓ прочитано всі</button>
        )}
      </div>

      {loading ? (
        <div className="msg-empty-state">
          <div className="msg-empty-title">// завантаження...</div>
        </div>
      ) : list.length === 0 ? (
        <div className="msg-empty-state">
          <div className="msg-empty-icon">✉</div>
          <div className="msg-empty-title">// тут поки порожньо</div>
          <div className="msg-empty-sub">
            {tab === 'received'
              ? "Тут з'являться завдання, які тобі надішлють інші учасники або групи."
              : "Тут буде список завдань, які ти поширив(-ла). Створи контент і поділись ним."}
          </div>
        </div>
      ) : (
        <>
          {days.map(day => (
            <div key={day}>
              <div className="msg-section-day">// {day.toUpperCase()}</div>
              {paginatedList.filter(m => m.day === day).map(m =>
                tab === 'received'
                  ? <ReceivedCard key={m.id} msg={m as ReceivedMsg} onMarkRead={handleMarkRead} saved={saved} onToggleSave={toggleSave} onShare={(id, title) => setShareTarget({ taskId: id, taskTitle: title })} onTakeTest={onTakeTest} />
                  : <SentCard key={m.id} msg={m as SentMsg} saved={saved} onToggleSave={toggleSave} onShare={(id, title) => setShareTarget({ taskId: id, taskTitle: title })} />
              )}
            </div>
          ))}
          <Pagination page={currentPage} totalPages={totalPages} onPage={setCurrentPage} />
        </>
      )}
    </div>
  );
}
