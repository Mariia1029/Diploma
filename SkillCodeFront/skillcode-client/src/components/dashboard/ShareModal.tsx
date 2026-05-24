import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  shareTask,
  searchUsers,
  shareTaskToGroup,
  searchMyGroups,
} from '../../api/sharesApi';
import type { UserSearchResult, GroupSearchResult } from '../../api/sharesApi';
import { getGroups } from '../../api/groupsApi';
import { ApiError } from '../../api/usersApi';
import '../../styles/share-modal.css';

function getShareError(err: unknown, forGroup = false): string {
  if (err instanceof ApiError) {
    const messages = Object.values(err.errors).flat();
    if (messages.length > 0) return messages[0];
    if (err.status === 403) return 'Немає доступу до цього завдання.';
    if (err.status === 404) return 'Завдання або одержувача не знайдено.';
    if (err.status === 409) return forGroup
      ? 'Це завдання вже надіслано до цієї групи.'
      : 'Це завдання вже надіслано цьому одержувачу.';
  }
  return forGroup
    ? 'Не вдалося надіслати до групи. Спробуйте ще раз.'
    : 'Не вдалося надіслати. Спробуйте ще раз.';
}

interface ShareModalProps {
  taskId: string;
  taskTitle: string;
  onClose: () => void;
  onSent?: () => void;
}

let _rowId = 0;

interface RecipientRow {
  rowId: string;
  query: string;
  selected: UserSearchResult | null;
  results: UserSearchResult[];
  loading: boolean;
  open: boolean;
}

function emptyRow(): RecipientRow {
  return { rowId: String(++_rowId), query: '', selected: null, results: [], loading: false, open: false };
}

export default function ShareModal({ taskId, taskTitle, onClose, onSent }: ShareModalProps) {
  const { accessToken } = useAuth();
  const [mode, setMode] = useState<'personal' | 'group'>('personal');

  const [rows, setRows] = useState<RecipientRow[]>(() => [emptyRow()]);

  const [groupQuery, setGroupQuery] = useState('');
  const [groupResults, setGroupResults] = useState<GroupSearchResult[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupSearchResult | null>(null);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [collectResults, setCollectResults] = useState(false);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);
  const rowTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const groupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function updateRow(rowId: string, patch: Partial<RecipientRow>) {
    setRows(rs => rs.map(r => r.rowId === rowId ? { ...r, ...patch } : r));
  }

  function handleQueryChange(rowId: string, value: string) {
    updateRow(rowId, { query: value, selected: null, open: false, results: [] });
    clearTimeout(rowTimers.current[rowId]);
    if (!value.trim() || !accessToken) return;
    rowTimers.current[rowId] = setTimeout(async () => {
      updateRow(rowId, { loading: true });
      try {
        const results = await searchUsers(accessToken, value);
        updateRow(rowId, { results, loading: false, open: results.length > 0 });
      } catch {
        updateRow(rowId, { loading: false });
      }
    }, 300);
  }

  function handleInputBlur(rowId: string) {
    setTimeout(() => updateRow(rowId, { open: false }), 150);
  }

  function handleSelectUser(rowId: string, user: UserSearchResult) {
    updateRow(rowId, { selected: user, query: `${user.firstName} ${user.lastName}`, open: false, results: [] });
  }

  function handleClearRow(rowId: string) {
    updateRow(rowId, { selected: null, query: '', results: [], open: false });
  }

  function handleRemoveRow(rowId: string) {
    setRows(rs => rs.filter(r => r.rowId !== rowId));
  }

  useEffect(() => {
    if (mode !== 'group' || !accessToken) return;
    setGroupLoading(true);
    getGroups(accessToken)
      .then(results => {
        setGroupResults(results);
        setGroupDropdownOpen(results.length > 0);
      })
      .catch(() => {})
      .finally(() => setGroupLoading(false));
  }, [mode, accessToken]);

  function handleGroupQueryChange(value: string) {
    setGroupQuery(value);
    setSelectedGroup(null);
    setGroupDropdownOpen(false);
    setGroupResults([]);
    if (groupTimer.current) clearTimeout(groupTimer.current);
    if (!accessToken) return;
    if (!value.trim()) {
      setGroupLoading(true);
      getGroups(accessToken)
        .then(results => {
          setGroupResults(results);
          setGroupDropdownOpen(results.length > 0);
        })
        .catch(() => {})
        .finally(() => setGroupLoading(false));
      return;
    }
    groupTimer.current = setTimeout(async () => {
      setGroupLoading(true);
      try {
        const results = await searchMyGroups(accessToken, value);
        setGroupResults(results);
        setGroupDropdownOpen(results.length > 0);
      } catch {
        // ignore
      } finally {
        setGroupLoading(false);
      }
    }, 300);
  }

  function handleGroupBlur() {
    setTimeout(() => setGroupDropdownOpen(false), 150);
  }

  function handleGroupFocus() {
    if (groupResults.length > 0 && !selectedGroup) {
      setGroupDropdownOpen(true);
    }
  }

  function handleSelectGroup(group: GroupSearchResult) {
    setSelectedGroup(group);
    setGroupQuery(group.name);
    setGroupDropdownOpen(false);
    setGroupResults([]);
  }

  async function handleSend() {
    if (!accessToken) return;
    setError('');

    if (mode === 'personal') {
      const chosen = rows.filter(r => r.selected !== null);
      if (chosen.length === 0) {
        setError('Додайте хоча б одного одержувача.');
        return;
      }
      setSending(true);
      try {
        await Promise.all(chosen.map(r => shareTask(accessToken, taskId, r.selected!.id)));
        onSent?.();
        onClose();
      } catch (err) {
        setError(getShareError(err));
      } finally {
        setSending(false);
      }
    } else {
      if (!selectedGroup) {
        setError('Оберіть групу для надсилання.');
        return;
      }
      setSending(true);
      try {
        await shareTaskToGroup(accessToken, taskId, selectedGroup.id, collectResults);
        onSent?.();
        onClose();
      } catch (err) {
        setError(getShareError(err, true));
      } finally {
        setSending(false);
      }
    }
  }

  const canSend = mode === 'personal'
    ? rows.some(r => r.selected !== null)
    : selectedGroup !== null;

  return (
    <div
      className="share-overlay"
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="share-box">
        <div className="share-header">
          <span className="share-title">
            <span className="share-comment">// </span>поділитись:{' '}
            <span className="share-task-name">«{taskTitle}»</span>
          </span>
          <button className="share-close" onClick={onClose}>×</button>
        </div>

        <div className="share-mode-bar">
          <button
            className={`share-mode-btn${mode === 'personal' ? ' active' : ''}`}
            onClick={() => { setMode('personal'); setError(''); }}
          >
            ↗ особисте
          </button>
          <button
            className={`share-mode-btn${mode === 'group' ? ' active' : ''}`}
            onClick={() => { setMode('group'); setError(''); }}
          >
            ⬡ група
          </button>
        </div>

        <div className="share-body">
          {mode === 'personal' ? (
            <>
              <div className="share-section-label">// одержувачі</div>
              <div className="share-recipients">
                {rows.map(row => (
                  <RecipientRowItem
                    key={row.rowId}
                    row={row}
                    onQueryChange={v => handleQueryChange(row.rowId, v)}
                    onBlur={() => handleInputBlur(row.rowId)}
                    onSelect={u => handleSelectUser(row.rowId, u)}
                    onClear={() => handleClearRow(row.rowId)}
                    onRemove={rows.length > 1 ? () => handleRemoveRow(row.rowId) : undefined}
                  />
                ))}
              </div>
              <button className="share-add-btn" onClick={() => setRows(rs => [...rs, emptyRow()])}>
                + додати ще одного
              </button>
            </>
          ) : (
            <>
              <div className="share-section-label">// пошук серед моїх груп</div>
              <div className="share-search-wrap">
                <div className="share-input-row">
                  <input
                    className="share-input"
                    placeholder="// назва групи..."
                    value={groupQuery}
                    onChange={e => handleGroupQueryChange(e.target.value)}
                    onBlur={handleGroupBlur}
                    onFocus={handleGroupFocus}
                    autoFocus
                  />
                  {groupLoading && <span className="share-spinner">...</span>}
                </div>
                {groupDropdownOpen && groupResults.length > 0 && (
                  <div className="share-dropdown">
                    {groupResults.map(g => (
                      <div
                        key={g.id}
                        className="share-dropdown-item"
                        onMouseDown={e => { e.preventDefault(); handleSelectGroup(g); }}
                      >
                        <span className="share-item-name">⬡ {g.name}</span>
                        <span className="share-item-meta">{g.memberCount} учасників</span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedGroup && (
                  <div className="share-selected-chip">
                    <span>⬡ {selectedGroup.name}</span>
                    <button onClick={() => { setSelectedGroup(null); setGroupQuery(''); }}>×</button>
                  </div>
                )}
              </div>
              <div className="grp-toggle-row" style={{ marginTop: 12 }}>
                <span className="grp-toggle-label">Збирати результати учасників</span>
                <button
                  className={`grp-toggle${collectResults ? ' on' : ''}`}
                  onClick={() => setCollectResults(v => !v)}
                  type="button"
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>
                {collectResults
                  ? '// ви зможете переглянути результати всіх учасників групи'
                  : '// учасники бачать лише свої результати'}
              </div>
            </>
          )}
        </div>

        {error && <div className="share-error">{error}</div>}

        <div className="share-footer">
          <button className="share-cancel-btn" onClick={onClose} disabled={sending}>
            Скасувати
          </button>
          <button
            className="share-send-btn"
            onClick={handleSend}
            disabled={!canSend || sending}
          >
            {sending ? '...' : 'Надіслати →'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RecipientRowItemProps {
  row: RecipientRow;
  onQueryChange: (v: string) => void;
  onBlur: () => void;
  onSelect: (u: UserSearchResult) => void;
  onClear: () => void;
  onRemove?: () => void;
}

function RecipientRowItem({ row, onQueryChange, onBlur, onSelect, onClear, onRemove }: RecipientRowItemProps) {
  return (
    <div className="share-recipient-row">
      <div className="share-input-wrap">
        {row.selected ? (
          <div className="share-selected-user">
            <span className="share-user-name">{row.selected.firstName} {row.selected.lastName}</span>
            <span className="share-user-email">{row.selected.email}</span>
            <button className="share-chip-clear" onClick={onClear}>×</button>
          </div>
        ) : (
          <>
            <div className="share-input-row">
              <input
                className="share-input"
                placeholder="// ім'я або email..."
                value={row.query}
                onChange={e => onQueryChange(e.target.value)}
                onBlur={onBlur}
              />
              {row.loading && <span className="share-spinner">...</span>}
            </div>
            {row.open && row.results.length > 0 && (
              <div className="share-dropdown">
                {row.results.map(u => (
                  <div
                    key={u.id}
                    className="share-dropdown-item"
                    onMouseDown={e => { e.preventDefault(); onSelect(u); }}
                  >
                    <span className="share-item-name">{u.firstName} {u.lastName}</span>
                    <span className="share-item-meta">{u.email}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {onRemove && (
        <button className="share-row-remove" onClick={onRemove} title="Видалити">×</button>
      )}
    </div>
  );
}
