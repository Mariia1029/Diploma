import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../api/sharesApi';
import type { UserSearchResult } from '../../api/sharesApi';
import {
  getGroups, createGroup, getGroupDetail, updateGroup,
  deleteGroup, leaveGroup,
  addMember, removeMember, changeMemberRole,
  addGroupTask, removeGroupTask, getGroupTaskResults, getGroupTaskAttemptDetail,
} from '../../api/groupsApi';
import { getMyTasks, getTaskById } from '../../api/tasksApi';
import { getAttemptById } from '../../api/attemptsApi';
import type { TaskDetailResponse } from '../../types/task';
import type { ViewAttemptInput } from './ViewAttemptPage';
import type {
  GroupSummaryResponse, GroupDetailResponse,
  GroupMemberResponse, GroupTaskResponse, GroupAttemptResponse,
  GroupRole,
} from '../../types/group';
import { ApiError } from '../../api/usersApi';
import '../../styles/share-modal.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

const LANG_DISPLAY: Record<string, string> = {
  Python: 'Python', JavaScript: 'JavaScript', TypeScript: 'TypeScript',
  CSharp: 'C#', Cpp: 'C++', C: 'C', Java: 'Java', Go: 'Go', Rust: 'Rust',
};

const LANG_TAG_CLASS: Record<string, string> = {
  Python: 'tag-py', JavaScript: 'tag-js', TypeScript: 'tag-ts',
  CSharp: 'tag-cs', Cpp: 'tag-cpp', C: 'tag-c', Java: 'tag-java',
  Go: 'tag-go', Rust: 'tag-rs',
};

function avaStyle(seed: string): React.CSSProperties {
  const code = seed.charCodeAt(0) % 4;
  if (code === 0) return { background: '#1a3a5a', color: 'var(--blue)' };
  if (code === 1) return { background: '#2a1a4a', color: 'var(--purple)' };
  if (code === 2) return { background: '#2a2a10', color: 'var(--yellow)' };
  return { background: 'var(--accent-dim)', color: 'var(--accent)' };
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function fmtDuration(secs: number | null): string {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}хв ${s}с` : `${s}с`;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'var(--accent)';
  if (pct >= 60) return 'var(--yellow)';
  return 'var(--red)';
}

function roleLabel(role: GroupRole): string {
  if (role === 'Owner') return 'власник';
  if (role === 'Admin') return 'адмін';
  return 'учасник';
}

function roleBadgeClass(role: GroupRole): string {
  if (role === 'Owner') return 'grp-role-owner';
  if (role === 'Admin') return 'grp-role-admin';
  return 'grp-role-member';
}

// ── ConfirmModal ──────────────────────────────────────────────────────────────

function ConfirmModal({ message, confirmLabel = 'Видалити', onConfirm, onClose }: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="grp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="grp-modal" style={{ width: 380 }}>
        <div className="grp-modal-header">
          <div className="grp-modal-title">// Підтвердження</div>
          <button className="grp-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="grp-modal-body">
          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>{message}</div>
        </div>
        <div className="grp-modal-footer">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button
            className="btn-ghost"
            style={{ color: 'var(--red, #f87171)', borderColor: 'rgba(248,113,113,0.3)' }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ResultsPanel ──────────────────────────────────────────────────────────────

function ResultsPanel({ results, members, showAllMembers, onViewAttempt }: {
  results: GroupAttemptResponse[];
  members: GroupMemberResponse[];
  showAllMembers: boolean;
  onViewAttempt: (attempt: GroupAttemptResponse) => void;
}) {
  const memberMap = useMemo(() => {
    const m: Record<string, GroupMemberResponse> = {};
    members.forEach(mb => { m[mb.user.id] = mb; });
    return m;
  }, [members]);

  if (results.length === 0) {
    return (
      <div className="grp-attempts-expanded">
        <div style={{ padding: '14px 16px', fontSize: 11, color: 'var(--text-faint)' }}>
          // {showAllMembers ? 'результатів ще немає' : 'ви ще не проходили це завдання'}
        </div>
      </div>
    );
  }

  return (
    <div className="grp-attempts-expanded">
      <div className="grp-attempts-head" style={{ gridTemplateColumns: showAllMembers ? '1fr 90px 70px 80px 80px' : '1fr 90px 70px 80px 80px' }}>
        <div>{showAllMembers ? 'Учасник' : 'Дата'}</div>
        <div>Статус</div>
        <div>Час</div>
        <div>Бал</div>
        <div></div>
      </div>
      {results.map(a => {
        const mb = memberMap[a.userId];
        const name = mb
          ? `${mb.user.firstName} ${mb.user.lastName}`
          : a.userId.slice(0, 8);
        const seed = mb ? mb.user.firstName : a.userId;
        const pct = a.maxPoints > 0 ? Math.round((a.earnedPoints / a.maxPoints) * 100) : 0;
        const col = scoreColor(pct);
        const isDone = a.status === 'Finished';
        return (
          <div key={a.id} className="grp-attempt-row" style={{ gridTemplateColumns: '1fr 90px 70px 80px 80px' }}>
            {showAllMembers ? (
              <div className="grp-attempt-user">
                <div className="grp-attempt-ava" style={avaStyle(seed)}>{initials(name.split(' ')[0] ?? '', name.split(' ')[1] ?? '')}</div>
                <span className="grp-attempt-name">{name}</span>
              </div>
            ) : (
              <div className="grp-attempt-cell">{a.startedAt ? new Date(a.startedAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</div>
            )}
            <div>
              <span className={`grp-badge ${isDone ? 'grp-badge-done' : 'grp-badge-partial'}`}>
                {isDone ? '// зараховано' : a.status === 'TimedOut' ? '// час вийшов' : '// в процесі'}
              </span>
            </div>
            <div className="grp-attempt-cell">{fmtDuration(a.durationSeconds)}</div>
            <div>
              <div className="grp-score-wrap">
                <div className="grp-score-bar-bg">
                  <div className="grp-score-bar-fill" style={{ width: pct + '%', background: col }} />
                </div>
                <div className="grp-score-val" style={{ color: col }}>{pct}%</div>
              </div>
            </div>
            <div>
              {isDone && (
                <button
                  className="btn-ghost"
                  style={{ fontSize: 10, height: 24, padding: '0 8px' }}
                  onClick={() => onViewAttempt(a)}
                >
                  ▸ деталі
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── GroupTaskCard ─────────────────────────────────────────────────────────────

interface GroupTaskCardProps {
  gt: GroupTaskResponse;
  currentUserId: string;
  currentUserRole: GroupRole;
  members: GroupMemberResponse[];
  groupId: string;
  token: string;
  onRun: (gt: GroupTaskResponse) => void;
  onRemoved: (groupTaskId: string) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
}

function GroupTaskCard({ gt, currentUserId, currentUserRole, members, groupId, token, onRun, onRemoved, onViewAttempt }: GroupTaskCardProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GroupAttemptResponse[] | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const isSharer = gt.sharedByUser?.id === currentUserId;
  const canSeeAllResults = isSharer && gt.collectResults;
  const canRemove = currentUserRole === 'Owner' || currentUserRole === 'Admin' || isSharer;

  const memberMap = useMemo(() => {
    const m: Record<string, GroupMemberResponse> = {};
    members.forEach(mb => { m[mb.user.id] = mb; });
    return m;
  }, [members]);

  async function handleToggle() {
    if (!open && results === null) {
      setLoadingResults(true);
      try {
        const data = await getGroupTaskResults(token, groupId, gt.id);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoadingResults(false);
      }
    }
    setOpen(o => !o);
  }

  async function doRemove() {
    setRemoving(true);
    try {
      await removeGroupTask(token, groupId, gt.id);
      onRemoved(gt.id);
    } catch {
      setRemoving(false);
    }
  }

  async function handleViewAttempt(attempt: GroupAttemptResponse) {
    if (viewingId === attempt.id) return;
    setViewingId(attempt.id);
    try {
      const isOwn = attempt.userId === currentUserId;
      const [detail, fullTask] = await Promise.all([
        isOwn
          ? getAttemptById(token, attempt.id)
          : getGroupTaskAttemptDetail(token, groupId, gt.id, attempt.id),
        getTaskById(token, gt.task.id),
      ]);
      const answerMap = Object.fromEntries(
        detail.answers.map(a => [a.taskItemId, {
          userAnswer: a.userAnswer ?? null,
          isCorrect: a.isCorrect ?? null,
          earnedPoints: a.earnedPoints ?? null,
        }]),
      );
      const sortedItems = [...fullTask.taskItems].sort((a, b) => a.orderIndex - b.orderIndex);
      const questions = sortedItems.map(item => ({
        item,
        userAnswerJson: answerMap[item.id]?.userAnswer ?? null,
        isCorrect: answerMap[item.id]?.isCorrect ?? null,
        earnedPoints: answerMap[item.id]?.earnedPoints ?? null,
      }));
      const finishData = {
        id: detail.id, userId: detail.userId, taskId: detail.taskId,
        contextType: detail.contextType, contextId: detail.contextId,
        earnedPoints: detail.earnedPoints, maxPoints: detail.maxPoints,
        status: detail.status, durationSeconds: detail.durationSeconds,
        timeLimitSeconds: detail.timeLimitSeconds,
        startedAt: detail.startedAt, finishedAt: detail.finishedAt,
      };
      onViewAttempt({ task: fullTask, questions, finishData });
    } finally {
      setViewingId(null);
    }
  }

  const langDisplay = LANG_DISPLAY[gt.task.language] ?? gt.task.language;
  const langClass = LANG_TAG_CLASS[gt.task.language] ?? '';
  const sharer = gt.sharedByUser;

  return (
    <div className="grp-content-card">
      <div className="grp-content-header" onClick={handleToggle}>
        <span className="grp-content-icon">◈</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="grp-content-name">{gt.task.title}</span>
          {sharer && (
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
              поділився: {sharer.firstName} {sharer.lastName}
            </div>
          )}
        </div>
        <span className={`lang-tag ${langClass}`}>{langDisplay}</span>
        {gt.collectResults && isSharer && (
          <span className="grp-collect-badge">// збирає результати</span>
        )}
        <button
          className="btn-run"
          onClick={e => { e.stopPropagation(); onRun(gt); }}
        >
          ▶ Пройти
        </button>
        {canRemove && (
          <button
            className="grp-icon-btn"
            title="Видалити завдання з групи"
            onClick={e => { e.stopPropagation(); setConfirmRemove(true); }}
            style={{ marginLeft: 4 }}
            disabled={removing}
          >
            {removing ? '...' : '×'}
          </button>
        )}
        <span style={{ fontSize: 11, color: 'var(--text-faint)', marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        loadingResults
          ? <div style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-faint)' }}>// завантаження...</div>
          : <ResultsPanel results={results ?? []} members={members} showAllMembers={canSeeAllResults} onViewAttempt={handleViewAttempt} />
      )}

      {confirmRemove && (
        <ConfirmModal
          message={`Точно видалити завдання «${gt.task.title}» з групи?`}
          confirmLabel="Видалити завдання"
          onConfirm={doRemove}
          onClose={() => setConfirmRemove(false)}
        />
      )}

    </div>
  );
}

// ── AddMemberModal ────────────────────────────────────────────────────────────

let _rowId = 0;
interface MemberRow {
  rowId: string;
  query: string;
  selected: UserSearchResult | null;
  results: UserSearchResult[];
  loading: boolean;
  open: boolean;
  role: 'Member' | 'Admin';
}
function emptyRow(): MemberRow {
  return { rowId: String(++_rowId), query: '', selected: null, results: [], loading: false, open: false, role: 'Member' };
}

interface AddMemberModalProps {
  groupId: string;
  token: string;
  canAssignAdmin: boolean;
  existingUserIds: Set<string>;
  onAdded: (member: GroupMemberResponse) => void;
  onClose: () => void;
}

function AddMemberModal({ groupId, token, canAssignAdmin, existingUserIds, onAdded, onClose }: AddMemberModalProps) {
  const [rows, setRows] = useState<MemberRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function updateRow(id: string, patch: Partial<MemberRow>) {
    setRows(rs => rs.map(r => r.rowId === id ? { ...r, ...patch } : r));
  }

  function handleQuery(id: string, val: string) {
    updateRow(id, { query: val, selected: null, open: false, results: [] });
    clearTimeout(timers.current[id]);
    if (!val.trim()) return;
    timers.current[id] = setTimeout(async () => {
      updateRow(id, { loading: true });
      try {
        const res = await searchUsers(token, val);
        const filtered = res.filter(u => !existingUserIds.has(u.id));
        updateRow(id, { results: filtered, loading: false, open: filtered.length > 0 });
      } catch {
        updateRow(id, { loading: false });
      }
    }, 300);
  }

  async function handleSave() {
    const toAdd = rows.filter(r => r.selected);
    if (toAdd.length === 0) return;
    setSaving(true);
    setError('');
    let lastAdded: GroupMemberResponse | null = null;
    for (const row of toAdd) {
      try {
        const member = await addMember(token, groupId, { userId: row.selected!.id, role: row.role });
        lastAdded = member;
        onAdded(member);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          setError(`${row.selected!.firstName} вже є учасником`);
        } else {
          setError('Помилка при додаванні учасника');
        }
        setSaving(false);
        return;
      }
    }
    if (lastAdded) onClose();
    setSaving(false);
  }

  return (
    <div className="grp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="grp-modal">
        <div className="grp-modal-header">
          <div>
            <div className="grp-modal-title">// Додати учасника</div>
            <div className="grp-modal-sub">Пошук за іменем або email</div>
          </div>
          <button className="grp-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="grp-modal-body">
          {rows.map(row => (
            <div key={row.rowId} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div className="share-input-wrap">
                  {row.selected ? (
                    <div className="share-selected-user">
                      <span className="share-user-name">{row.selected.firstName} {row.selected.lastName}</span>
                      <span className="share-user-email">{row.selected.email}</span>
                      <button className="share-chip-clear" onClick={() => updateRow(row.rowId, { selected: null, query: '', results: [], open: false })}>×</button>
                    </div>
                  ) : (
                    <>
                      <div className="share-input-row">
                        <input
                          className="share-input"
                          placeholder="// ім'я або email..."
                          value={row.query}
                          onChange={e => handleQuery(row.rowId, e.target.value)}
                          onBlur={() => setTimeout(() => updateRow(row.rowId, { open: false }), 150)}
                        />
                        {row.loading && <span className="share-spinner">...</span>}
                      </div>
                      {row.open && row.results.length > 0 && (
                        <div className="share-dropdown">
                          {row.results.map(u => (
                            <div
                              key={u.id}
                              className="share-dropdown-item"
                              onMouseDown={e => { e.preventDefault(); updateRow(row.rowId, { selected: u, query: `${u.firstName} ${u.lastName}`, open: false, results: [] }); }}
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
              </div>
              {canAssignAdmin && (
                <select
                  className="grp-role-select"
                  value={row.role}
                  onChange={e => updateRow(row.rowId, { role: e.target.value as 'Member' | 'Admin' })}
                >
                  <option value="Member">Учасник</option>
                  <option value="Admin">Адмін</option>
                </select>
              )}
              {rows.length > 1 && (
                <button className="grp-icon-btn" onClick={() => setRows(rs => rs.filter(r => r.rowId !== row.rowId))}>×</button>
              )}
            </div>
          ))}
          <button className="share-add-btn" onClick={() => setRows(rs => [...rs, emptyRow()])}>+ ще учасник</button>
          {error && <div className="grp-error">{error}</div>}
        </div>
        <div className="grp-modal-footer">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || rows.every(r => !r.selected)}
            style={{ opacity: rows.some(r => r.selected) ? 1 : 0.4 }}
          >
            {saving ? '...' : '+ Додати'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AddTaskModal ──────────────────────────────────────────────────────────────

interface AddTaskModalProps {
  groupId: string;
  token: string;
  currentUserId: string;
  existingTaskIds: Set<string>;
  onAdded: (gt: GroupTaskResponse) => void;
  onClose: () => void;
}

function AddTaskModal({ groupId, token, currentUserId, existingTaskIds, onAdded, onClose }: AddTaskModalProps) {
  const [tasks, setTasks] = useState<TaskDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TaskDetailResponse | null>(null);
  const [collectResults, setCollectResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getMyTasks(token);
        setTasks(data.filter(t => !existingTaskIds.has(t.id)));
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
    setSelected(null);
  }, [token, existingTaskIds]);

  const filtered = useMemo(() => {
    if (!search) return tasks;
    return tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  }, [tasks, search]);

  async function handleAdd() {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const gt = await addGroupTask(token, groupId, { taskId: selected.id, collectResults });
      onAdded(gt);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError('Це завдання вже додано до групи');
      } else {
        setError('Помилка при додаванні завдання');
      }
      setSaving(false);
    }
  }

  return (
    <div className="grp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="grp-modal" style={{ width: 560 }}>
        <div className="grp-modal-header">
          <div>
            <div className="grp-modal-title">// Додати завдання до групи</div>
            <div className="grp-modal-sub">Оберіть завдання зі свого контенту</div>
          </div>
          <button className="grp-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="grp-modal-body" style={{ padding: 0 }}>
          <div style={{ padding: '12px 20px 4px' }}>
            <input
              className="grp-search-input"
              placeholder="// пошук за назвою..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="grp-task-list">
            {loading ? (
              <div style={{ padding: '20px', fontSize: 11, color: 'var(--text-faint)' }}>// завантаження...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '20px', fontSize: 11, color: 'var(--text-faint)' }}>// немає доступних завдань</div>
            ) : filtered.map(t => (
              <div
                key={t.id}
                className={`grp-task-item${selected?.id === t.id ? ' selected' : ''}`}
                onClick={() => setSelected(t)}
              >
                <span className={`lang-tag ${LANG_TAG_CLASS[t.language] ?? ''}`}>{LANG_DISPLAY[t.language] ?? t.language}</span>
                <span className="grp-task-title">{t.title}</span>
                <span className="grp-task-items-count">{t.taskItems.length} пит.</span>
                {t.status === 'Private' && (
                  <span style={{ fontSize: 9, color: 'var(--text-faint)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>приватне</span>
                )}
              </div>
            ))}
          </div>
          {selected && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
              <div className="grp-toggle-row">
                <span className="grp-toggle-label">Збирати результати учасників</span>
                <button
                  className={`grp-toggle${collectResults ? ' on' : ''}`}
                  onClick={() => setCollectResults(v => !v)}
                />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 6 }}>
                {collectResults
                  ? '// ви зможете переглянути результати всіх учасників групи'
                  : '// учасники бачать лише свої результати'}
              </div>
            </div>
          )}
          {error && <div className="grp-error" style={{ margin: '0 20px 8px' }}>{error}</div>}
        </div>
        <div className="grp-modal-footer">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button
            className="btn-primary"
            onClick={handleAdd}
            disabled={saving || !selected}
            style={{ opacity: selected ? 1 : 0.4 }}
          >
            {saving ? '...' : '◈ Додати завдання'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditGroupModal ────────────────────────────────────────────────────────────

interface EditGroupModalProps {
  groupId: string;
  token: string;
  initialName: string;
  initialDesc: string;
  onUpdated: (name: string, desc: string) => void;
  onClose: () => void;
}

function EditGroupModal({ groupId, token, initialName, initialDesc, onUpdated, onClose }: EditGroupModalProps) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateGroup(token, groupId, { name: name.trim(), description: desc.trim() || undefined });
      onUpdated(name.trim(), desc.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="grp-modal">
        <div className="grp-modal-header">
          <div>
            <div className="grp-modal-title">// Редагувати групу</div>
          </div>
          <button className="grp-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="grp-modal-body">
          <div className="grp-field">
            <label>Назва групи</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grp-field">
            <label>Опис</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
        </div>
        <div className="grp-modal-footer">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? '...' : 'Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GroupDetail ───────────────────────────────────────────────────────────────

interface GroupDetailProps {
  groupId: string;
  token: string;
  currentUserId: string;
  onBack: () => void;
  onRun: (taskId: string, groupId: string) => void;
  onGroupDeleted: () => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
}

function GroupDetail({ groupId, token, currentUserId, onBack, onRun, onGroupDeleted, onViewAttempt }: GroupDetailProps) {
  const [detail, setDetail] = useState<GroupDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirm, setConfirm] = useState<{ message: string; label: string; onConfirm: () => void } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGroupDetail(token, groupId);
      setDetail(data);
    } finally {
      setLoading(false);
    }
  }, [token, groupId]);

  useEffect(() => { load(); }, [load]);

  if (loading || !detail) {
    return (
      <div className="content">
        <div className="grp-detail-page">
          <button className="grp-back-btn" onClick={onBack}>← // всі групи</button>
          <div style={{ color: 'var(--text-faint)', fontSize: 11 }}>// завантаження...</div>
        </div>
      </div>
    );
  }

  const myMember = detail.members.find(m => m.user.id === currentUserId);
  const myRole: GroupRole = myMember?.role ?? 'Member';
  const isOwner = myRole === 'Owner';
  const isAdmin = myRole === 'Admin';
  const canManageMembers = isOwner || isAdmin;

  const existingUserIds = new Set(detail.members.map(m => m.user.id));
  const existingTaskIds = new Set(detail.tasks.map(t => t.task.id));

  async function doRemoveMember(memberId: string) {
    setActionError('');
    try {
      await removeMember(token, groupId, memberId);
      setDetail(d => d ? { ...d, members: d.members.filter(m => m.id !== memberId) } : d);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setActionError('Недостатньо прав для видалення цього учасника');
      else setActionError('Помилка при видаленні учасника');
    }
  }

  function handleRemoveMember(memberId: string, name: string) {
    setConfirm({
      message: `Точно видалити «${name}» з групи?`,
      label: 'Видалити учасника',
      onConfirm: () => doRemoveMember(memberId),
    });
  }

  async function handleChangeRole(memberId: string, role: 'Member' | 'Admin') {
    setActionError('');
    try {
      const updated = await changeMemberRole(token, groupId, memberId, role);
      setDetail(d => d ? { ...d, members: d.members.map(m => m.id === memberId ? updated : m) } : d);
    } catch {
      setActionError('Помилка при зміні ролі');
    }
  }

  async function doLeave() {
    setActionError('');
    try {
      await leaveGroup(token, groupId);
      onBack();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setActionError('Власник не може покинути групу');
      else setActionError('Помилка');
    }
  }

  function handleLeave() {
    setConfirm({
      message: 'Точно вийти з групи?',
      label: 'Вийти',
      onConfirm: doLeave,
    });
  }

  async function doDeleteGroup() {
    setActionError('');
    try {
      await deleteGroup(token, groupId);
      onGroupDeleted();
    } catch {
      setActionError('Помилка при видаленні групи');
    }
  }

  function handleDeleteGroup() {
    setConfirm({
      message: `Точно видалити групу «${detail?.name ?? ''}»? Це видалить усіх учасників та завдання.`,
      label: 'Видалити групу',
      onConfirm: doDeleteGroup,
    });
  }

  function handleTaskRemoved(groupTaskId: string) {
    setDetail(d => d ? { ...d, tasks: d.tasks.filter(t => t.id !== groupTaskId) } : d);
  }

  function handleTaskAdded(gt: GroupTaskResponse) {
    setDetail(d => d ? { ...d, tasks: [...d.tasks, gt] } : d);
    setShowAddTask(false);
  }

  function handleMemberAdded(member: GroupMemberResponse) {
    setDetail(d => d ? { ...d, members: [...d.members, member] } : d);
    setShowAddMember(false);
  }

  async function handleRunTask(gt: GroupTaskResponse) {
    onRun(gt.task.id, groupId);
  }

  return (
    <div className="grp-detail-page">
      <button className="grp-back-btn" onClick={onBack}>← // всі групи</button>

      <div className="grp-detail-hero">
        <div className="grp-detail-hero-icon ic-green">⬡</div>
        <div style={{ flex: 1 }}>
          <div className="grp-detail-hero-name">{detail.name}</div>
          <div className="grp-detail-hero-meta">{detail.members.length} учасників · {detail.tasks.length} завдань</div>
        </div>
        {(isOwner || isAdmin) && (
          <button className="btn-ghost" onClick={() => setShowEdit(true)} style={{ fontSize: 11 }}>✎ Редагувати</button>
        )}
      </div>

      {actionError && (
        <div className="grp-error" style={{ marginBottom: 12 }}>{actionError}</div>
      )}

      <div className="grp-detail-cols">
        {/* Left: tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="grp-section-label">// завдання групи</div>
            <button className="btn-ghost" style={{ fontSize: 10, height: 28 }} onClick={() => setShowAddTask(true)}>
              + Додати завдання
            </button>
          </div>
          {detail.tasks.length === 0 ? (
            <div className="grp-empty-state" style={{ padding: '30px 0' }}>
              <div className="grp-empty-icon">◈</div>
              <div className="grp-empty-title">// завдань ще немає</div>
              <div className="grp-empty-sub">Поділіться своїм завданням з групою</div>
            </div>
          ) : (
            detail.tasks.map(gt => (
              <GroupTaskCard
                key={gt.id}
                gt={gt}
                currentUserId={currentUserId}
                currentUserRole={myRole}
                members={detail.members}
                groupId={groupId}
                token={token}
                onRun={handleRunTask}
                onRemoved={handleTaskRemoved}
                onViewAttempt={onViewAttempt}
              />
            ))
          )}
        </div>

        {/* Right: info + members */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="grp-info-card">
            <div className="grp-info-card-header">// інформація</div>
            <div className="grp-info-card-body">
              {detail.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
                  {detail.description}
                </div>
              )}
              <div className="grp-info-row">
                <span className="grp-info-label">Власник</span>
                <span className="grp-info-val">{detail.owner.firstName} {detail.owner.lastName}</span>
              </div>
              <div className="grp-info-row">
                <span className="grp-info-label">Учасників</span>
                <span className="grp-info-val">{detail.members.length}</span>
              </div>
              <div className="grp-info-row">
                <span className="grp-info-label">Завдань</span>
                <span className="grp-info-val">{detail.tasks.length}</span>
              </div>
              <div className="grp-info-row">
                <span className="grp-info-label">Ваша роль</span>
                <span className={roleBadgeClass(myRole)}>{roleLabel(myRole)}</span>
              </div>
            </div>
          </div>

          <div className="grp-info-card">
            <div className="grp-info-card-header">// учасники</div>
            <div className="grp-info-card-body">
              {detail.members.map(m => {
                const isMe = m.user.id === currentUserId;
                const canRemoveThis = (isOwner && !isMe) || (isAdmin && m.role === 'Member' && !isMe);
                return (
                  <div key={m.id} className="grp-member-row">
                    <div className="grp-member-ava-lg" style={avaStyle(m.user.firstName)}>
                      {initials(m.user.firstName, m.user.lastName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="grp-member-name">{m.user.firstName} {m.user.lastName}</div>
                      <div className="grp-member-handle">{m.user.email}</div>
                    </div>
                    {isOwner && m.role !== 'Owner' ? (
                      <select
                        className="grp-role-select"
                        value={m.role}
                        onChange={e => handleChangeRole(m.id, e.target.value as 'Member' | 'Admin')}
                      >
                        <option value="Member">Учасник</option>
                        <option value="Admin">Адмін</option>
                      </select>
                    ) : (
                      <span className={roleBadgeClass(m.role)}>{roleLabel(m.role)}</span>
                    )}
                    {canRemoveThis && (
                      <button
                        className="grp-icon-btn"
                        title="Видалити учасника"
                        onClick={() => handleRemoveMember(m.id, `${m.user.firstName} ${m.user.lastName}`)}
                        style={{ marginLeft: 4 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
              {canManageMembers && (
                <div style={{ paddingTop: 10 }}>
                  <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 10, height: 30 }} onClick={() => setShowAddMember(true)}>
                    + Додати учасника
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {!isOwner && (
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11, color: 'var(--red)' }} onClick={handleLeave}>
                Вийти з групи
              </button>
            )}
            {isOwner && (
              <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11, color: 'var(--red)' }} onClick={handleDeleteGroup}>
                Видалити групу
              </button>
            )}
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddMemberModal
          groupId={groupId}
          token={token}
          canAssignAdmin={isOwner}
          existingUserIds={existingUserIds}
          onAdded={handleMemberAdded}
          onClose={() => setShowAddMember(false)}
        />
      )}

      {showAddTask && (
        <AddTaskModal
          groupId={groupId}
          token={token}
          currentUserId={currentUserId}
          existingTaskIds={existingTaskIds}
          onAdded={handleTaskAdded}
          onClose={() => setShowAddTask(false)}
        />
      )}

      {showEdit && (
        <EditGroupModal
          groupId={groupId}
          token={token}
          initialName={detail.name}
          initialDesc={detail.description ?? ''}
          onUpdated={(name, desc) => {
            setDetail(d => d ? { ...d, name, description: desc || null } : d);
            setShowEdit(false);
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {confirm && (
        <ConfirmModal
          message={confirm.message}
          confirmLabel={confirm.label}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ── GroupCard (list) ──────────────────────────────────────────────────────────

function GroupCard({ group, onClick }: { group: GroupSummaryResponse; onClick: () => void }) {
  const seed = group.name;
  return (
    <div className="group-card" onClick={onClick}>
      <div className="group-card-accent accent-green" />
      <div className="group-card-header">
        <div className="group-icon ic-green">⬡</div>
        <div className="group-name">{group.name}</div>
      </div>
      <div className="group-stats">
        <div className="group-stat"><span className="group-stat-val">{group.memberCount}</span> учасників</div>
      </div>
      <div className="group-footer">
        <div className="group-members-row">
          <div className="group-member-avatar" style={avaStyle(seed)}>
            {group.name[0]?.toUpperCase()}
          </div>
          <span className="group-member-count">{group.memberCount} учасників</span>
        </div>
      </div>
    </div>
  );
}

// ── CreateModal ───────────────────────────────────────────────────────────────

interface CreateModalProps {
  token: string;
  onCreated: (group: GroupSummaryResponse) => void;
  onClose: () => void;
}

function CreateModal({ token, onCreated, onClose }: CreateModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [memberRows, setMemberRows] = useState<MemberRow[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function updateRow(id: string, patch: Partial<MemberRow>) {
    setMemberRows(rs => rs.map(r => r.rowId === id ? { ...r, ...patch } : r));
  }

  function handleQuery(id: string, val: string) {
    updateRow(id, { query: val, selected: null, open: false, results: [] });
    clearTimeout(timers.current[id]);
    if (!val.trim()) return;
    timers.current[id] = setTimeout(async () => {
      updateRow(id, { loading: true });
      try {
        const res = await searchUsers(token, val);
        updateRow(id, { results: res, loading: false, open: res.length > 0 });
      } catch {
        updateRow(id, { loading: false });
      }
    }, 300);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const group = await createGroup(token, { name: name.trim(), description: desc.trim() || undefined });
      const toAdd = memberRows.filter(r => r.selected);
      for (const row of toAdd) {
        try {
          await addMember(token, group.id, { userId: row.selected!.id, role: row.role });
        } catch {
          // ignore member add errors — group is already created
        }
      }
      onCreated({ id: group.id, name: group.name, memberCount: toAdd.length + 1 });
    } catch {
      setError('Помилка при створенні групи');
      setSaving(false);
    }
  }

  return (
    <div className="grp-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="grp-modal">
        <div className="grp-modal-header">
          <div>
            <div className="grp-modal-title">// Створити групу</div>
            <div className="grp-modal-sub">Нова навчальна спільнота</div>
          </div>
          <button className="grp-icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="grp-modal-body">
          <div className="grp-field">
            <label>Назва групи</label>
            <input
              type="text"
              placeholder="// наприклад: Python для початківців"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="grp-field">
            <label>Опис</label>
            <textarea
              placeholder="// про що ця група..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>
          <div className="grp-field">
            <label>Учасники (необов'язково)</label>
            <div className="share-recipients">
              {memberRows.map(row => (
                <div key={row.rowId} className="share-recipient-row">
                  <div className="share-input-wrap">
                    {row.selected ? (
                      <div className="share-selected-user">
                        <span className="share-user-name">{row.selected.firstName} {row.selected.lastName}</span>
                        <span className="share-user-email">{row.selected.email}</span>
                        <button className="share-chip-clear" onClick={() => updateRow(row.rowId, { selected: null, query: '', results: [], open: false })}>×</button>
                      </div>
                    ) : (
                      <>
                        <div className="share-input-row">
                          <input
                            className="share-input"
                            placeholder="// ім'я або email..."
                            value={row.query}
                            onChange={e => handleQuery(row.rowId, e.target.value)}
                            onBlur={() => setTimeout(() => updateRow(row.rowId, { open: false }), 150)}
                          />
                          {row.loading && <span className="share-spinner">...</span>}
                        </div>
                        {row.open && row.results.length > 0 && (
                          <div className="share-dropdown">
                            {row.results.map(u => (
                              <div
                                key={u.id}
                                className="share-dropdown-item"
                                onMouseDown={e => { e.preventDefault(); updateRow(row.rowId, { selected: u, query: `${u.firstName} ${u.lastName}`, open: false, results: [] }); }}
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
                  {memberRows.length > 1 && (
                    <button className="share-row-remove" onClick={() => setMemberRows(rs => rs.filter(r => r.rowId !== row.rowId))}>×</button>
                  )}
                </div>
              ))}
            </div>
            <button className="share-add-btn" onClick={() => setMemberRows(rs => [...rs, emptyRow()])}>+ додати учасника</button>
          </div>
          {error && <div className="grp-error">{error}</div>}
        </div>
        <div className="grp-modal-footer">
          <button className="btn-ghost" onClick={onClose}>Скасувати</button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            style={{ opacity: name.trim() ? 1 : 0.4 }}
          >
            {saving ? '...' : '⬡ Створити групу'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GroupsPage ────────────────────────────────────────────────────────────────

interface Props {
  onTakeTest: (taskId: string, groupId: string) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
}

export default function GroupsPage({ onTakeTest, onViewAttempt }: Props) {
  const { accessToken, user } = useAuth();
  const [groups, setGroups] = useState<GroupSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getGroups(accessToken);
      setGroups(data);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  }, [groups, search]);

  if (!accessToken || !user) return null;

  if (selectedId) {
    return (
      <div className="content">
        <GroupDetail
          groupId={selectedId}
          token={accessToken}
          currentUserId={user.id}
          onBack={() => setSelectedId(null)}
          onRun={onTakeTest}
          onGroupDeleted={() => {
            setGroups(gs => gs.filter(g => g.id !== selectedId));
            setSelectedId(null);
          }}
          onViewAttempt={onViewAttempt}
        />
      </div>
    );
  }

  return (
    <div className="content">
      <div className="grp-toolbar">
        <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>// груп: {filtered.length}</div>
        <div className="grp-spacer" />
        <div className="search-box">
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⌕</span>
          <input
            placeholder="// пошук..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}>⬡ Нова група</button>
      </div>

      {loading ? (
        <div className="grp-empty-state">
          <div className="grp-empty-icon">⬡</div>
          <div className="grp-empty-title">// завантаження...</div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="groups-grid">
          {filtered.map(g => (
            <GroupCard key={g.id} group={g} onClick={() => setSelectedId(g.id)} />
          ))}
        </div>
      ) : (
        <div className="grp-empty-state">
          <div className="grp-empty-icon">⬡</div>
          <div className="grp-empty-title">// груп не знайдено</div>
          <div className="grp-empty-sub">
            {search ? 'Спробуйте змінити пошук' : 'Створіть першу групу або дочекайтесь запрошення'}
          </div>
        </div>
      )}

      {creating && (
        <CreateModal
          token={accessToken}
          onCreated={group => {
            setGroups(gs => [group, ...gs]);
            setCreating(false);
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
