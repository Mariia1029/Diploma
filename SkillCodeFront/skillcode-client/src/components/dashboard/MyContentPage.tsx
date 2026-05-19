import { useState, useEffect, useMemo } from 'react';
import '../../styles/my-content.css';
import Pagination from '../common/Pagination';
import { useAuth } from '../../context/AuthContext';
import { getMyTasks, deleteTask, setTaskStatus } from '../../api/tasksApi';
import { getAttemptsByTask, getAttemptById, deleteAttempt } from '../../api/attemptsApi';
import type { AttemptResponse } from '../../api/attemptsApi';
import type { TaskDetailResponse, TaskItemResponse } from '../../types/task';
import type { TaskType } from '../../types/template';
import type { ViewAttemptInput } from './ViewAttemptPage';
import ShareModal from './ShareModal';

/* ── Language display helpers ── */
const LANG_DISPLAY: Record<string, string> = {
  Python: 'Python', JavaScript: 'JavaScript', TypeScript: 'TypeScript',
  CSharp: 'C#', Cpp: 'C++', C: 'C', Java: 'Java', Go: 'Go', Rust: 'Rust',
};

const LANG_TAG_CLASS: Record<string, string> = {
  Python: 'tag-py', JavaScript: 'tag-js', TypeScript: 'tag-ts',
  CSharp: 'tag-cs', Cpp: 'tag-cpp', C: 'tag-c', Java: 'tag-java',
  Go: 'tag-go', Rust: 'tag-rs',
};

const TYPE_LABELS: Record<TaskType, string> = {
  SingleChoice: 'Одиночний вибір',
  MultiChoice:  'Множинний вибір',
  Matching:     'Відповідність',
  Ordering:     'Порядок',
  FillBlank:    'Заповнення',
  TrueFalse:    'Правда/Хибність',
  Open:         'Відкрите питання',
  FlashCards:   'Флеш-картки',
  Coding:       'Кодування',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatAttemptDate(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m === 0 ? `${s} с` : `${m} хв ${s} с`;
}

function scoreColor(pct: number): string {
  if (pct >= 80) return 'var(--accent)';
  if (pct >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

function pluralAttempts(n: number): string {
  if (n === 1) return '1 спроба';
  if (n >= 2 && n <= 4) return `${n} спроби`;
  return `${n} спроб`;
}

/* ── Confirm Dialog ── */
interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, confirmLabel = 'Так, видалити', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="mc-confirm-overlay" onClick={e => { e.stopPropagation(); onCancel(); }}>
      <div className="mc-confirm-dialog" onClick={e => e.stopPropagation()}>
        <p className="mc-confirm-msg">{message}</p>
        <div className="mc-confirm-actions">
          <button className="mc-confirm-yes" onClick={onConfirm}>{confirmLabel}</button>
          <button className="mc-confirm-cancel" onClick={onCancel}>Скасувати</button>
        </div>
      </div>
    </div>
  );
}

type Category = 'test' | 'flashcards' | 'coding';

function taskCategory(items: TaskItemResponse[]): Category {
  if (items.length === 0) return 'test';
  const flashCount = items.filter(i => i.type === 'FlashCards').length;
  const codeCount  = items.filter(i => i.type === 'Coding').length;
  const testCount  = items.length - flashCount - codeCount;
  if (flashCount >= testCount && flashCount >= codeCount) return 'flashcards';
  if (codeCount >= testCount && codeCount > flashCount) return 'coding';
  return 'test';
}

/* ── Task Card ── */
interface TaskCardProps {
  task: TaskDetailResponse;
  token: string;
  onTakeTest: (task: TaskDetailResponse) => void;
  onResumeAttempt: (task: TaskDetailResponse, attemptId: string) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
  onDeleted: (taskId: string) => void;
  onStatusChanged: (taskId: string, newStatus: string) => void;
}

function TaskCard({ task, token, onTakeTest, onResumeAttempt, onViewAttempt, onDeleted, onStatusChanged }: TaskCardProps) {
  const [attemptsOpen,      setAttemptsOpen]      = useState(false);
  const [contentOpen,       setContentOpen]        = useState(false);
  const [attempts,          setAttempts]           = useState<AttemptResponse[]>([]);
  const [attemptsLoading,   setAttemptsLoading]    = useState(false);
  const [expandedAttemptId, setExpandedAttemptId]  = useState<string | null>(null);
  const [viewingAttemptId,  setViewingAttemptId]   = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask]  = useState(false);
  const [deletingTask,      setDeletingTask]       = useState(false);
  const [confirmDeleteAttemptId, setConfirmDeleteAttemptId] = useState<string | null>(null);
  const [deletingAttemptId,      setDeletingAttemptId]      = useState<string | null>(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [togglingStatus,      setTogglingStatus]      = useState(false);
  const [shareOpen,           setShareOpen]           = useState(false);

  const langDisplay = LANG_DISPLAY[task.language] ?? task.language;
  const langClass   = LANG_TAG_CLASS[task.language] ?? 'tag-dim';

  const isPublic = task.status === 'Public';
  const category = taskCategory(task.taskItems);

  async function handleToggleStatus() {
    const next = isPublic ? 'Private' : 'Public';
    setTogglingStatus(true);
    try {
      await setTaskStatus(token, task.id, next);
      onStatusChanged(task.id, next);
    } finally {
      setTogglingStatus(false);
      setConfirmStatusChange(false);
    }
  }

  async function handleDeleteTask() {
    setDeletingTask(true);
    try {
      await deleteTask(token, task.id);
      onDeleted(task.id);
    } finally {
      setDeletingTask(false);
      setConfirmDeleteTask(false);
    }
  }

  async function handleDeleteAttempt(attemptId: string) {
    setDeletingAttemptId(attemptId);
    try {
      await deleteAttempt(token, attemptId);
      setAttempts(prev => prev.filter(a => a.id !== attemptId));
      if (expandedAttemptId === attemptId) setExpandedAttemptId(null);
    } finally {
      setDeletingAttemptId(null);
      setConfirmDeleteAttemptId(null);
    }
  }

  function toggleAttempts() {
    const next = !attemptsOpen;
    setAttemptsOpen(next);
    if (next && attempts.length === 0 && !attemptsLoading) {
      setAttemptsLoading(true);
      getAttemptsByTask(token, task.id, 'Personal')
        .then(data => { setAttempts(data); setAttemptsLoading(false); })
        .catch(() => setAttemptsLoading(false));
    }
  }

  const toggleAttempt = (id: string) =>
    setExpandedAttemptId(prev => (prev === id ? null : id));

  async function handleViewAttempt(attempt: AttemptResponse) {
    if (viewingAttemptId === attempt.id) return;
    setViewingAttemptId(attempt.id);
    try {
      const detail = await getAttemptById(token, attempt.id);
      const answerMap = Object.fromEntries(detail.answers.map(a => [a.taskItemId, a]));
      const sortedItems = [...task.taskItems].sort((a, b) => a.orderIndex - b.orderIndex);
      const questions = sortedItems.map(item => {
        const ans = answerMap[item.id];
        return {
          item,
          userAnswerJson: ans?.userAnswer ?? null,
          isCorrect: ans?.isCorrect ?? null,
          earnedPoints: ans?.earnedPoints ?? null,
          answerId: ans?.id ?? '',
          aiExplanation: ans?.aiExplanation ?? null,
        };
      });
      onViewAttempt({ task, questions, finishData: detail });
    } finally {
      setViewingAttemptId(null);
    }
  }

  return (
    <div className="mc-card">
      {shareOpen && (
        <ShareModal
          taskId={task.id}
          taskTitle={task.title}
          onClose={() => setShareOpen(false)}
        />
      )}

      {confirmDeleteTask && (
        <ConfirmDialog
          message="Ви впевнені, що хочете видалити цей контент? Якщо він публічний, користувачі, які ним користуються, також втратять його."
          onConfirm={handleDeleteTask}
          onCancel={() => setConfirmDeleteTask(false)}
        />
      )}

      {confirmStatusChange && (
        <ConfirmDialog
          message={isPublic
            ? 'Ви хочете зробити це завдання приватним? Воно зникне з публічного списку.'
            : 'Ви хочете зробити це завдання публічним? Інші користувачі зможуть його бачити та проходити.'
          }
          confirmLabel="Так, змінити"
          onConfirm={handleToggleStatus}
          onCancel={() => setConfirmStatusChange(false)}
        />
      )}

      {/* ── Header — click toggles attempts ── */}
      <div className="mc-card-header" onClick={toggleAttempts}>
        <span className="mc-card-icon">◈</span>
        <span className="mc-card-name">{task.title}</span>

        <span className={`tag ${langClass}`} style={{ marginRight: 6 }}>{langDisplay}</span>

        {task.aiGenerated && (
          <span className="badge badge-ai" style={{ marginRight: 8 }}>// ai</span>
        )}

        {task.timeLimitSeconds != null && (
          <span className="mc-card-timelimit" title={`Обмеження часу: ${Math.floor(task.timeLimitSeconds / 60)} хв`}>
            ⏱
          </span>
        )}

        <span className="mc-card-meta">{formatDate(task.createdAt)}</span>

        <button
          className={`mc-status-badge${isPublic ? ' mc-status-public' : ' mc-status-private'}`}
          disabled={togglingStatus}
          onClick={e => { e.stopPropagation(); setConfirmStatusChange(true); }}
          title={isPublic ? 'Зробити приватним' : 'Зробити публічним'}
        >
          {isPublic ? '◉ публічний' : '◌ приватний'}
        </button>

        <button
          className="btn-run"
          onClick={e => { e.stopPropagation(); onTakeTest(task); }}
        >
          ▶ Пройти
        </button>

        <button
          className={`btn-content-toggle${contentOpen ? ' open' : ''}`}
          onClick={e => { e.stopPropagation(); setContentOpen(o => !o); }}
        >
          вміст {contentOpen ? '▲' : '▼'}
        </button>

        <button
          className="mc-card-share"
          onClick={e => { e.stopPropagation(); setShareOpen(true); }}
          title="Поділитись"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <path d="M8 2v8" />
            <path d="M5 5l3-3 3 3" />
            <path d="M4 9v4h8V9" />
          </svg>
        </button>

        <button
          className="mc-card-del"
          disabled={deletingTask}
          onClick={e => { e.stopPropagation(); setConfirmDeleteTask(true); }}
          title="Видалити завдання"
        >
          ✕
        </button>

        <span className="mc-chevron" style={{ marginLeft: 4 }}>
          {attemptsOpen ? '▲' : '▼'}
        </span>
      </div>

      {/* ── Attempts section ── */}
      {attemptsOpen && (
        <div className="mc-attempts">
          <div className="mc-attempts-head">
            <span>// мої спроби</span>
            {attempts.length > 0 && (
              <span className="mc-attempts-count">{pluralAttempts(attempts.length)}</span>
            )}
          </div>

          {attemptsLoading ? (
            <div className="mc-no-attempts">// завантаження...</div>
          ) : attempts.length === 0 ? (
            <div className="mc-no-attempts">
              // спроб ще немає — натисніть «Пройти», щоб розпочати
            </div>
          ) : (
            attempts.map((attempt, idx) => {
              const isFinished = attempt.status === 'Finished';
              const pct = isFinished && attempt.maxPoints > 0
                ? Math.round((attempt.earnedPoints / attempt.maxPoints) * 100)
                : 0;
              return (
                <div key={attempt.id}>
                  {confirmDeleteAttemptId === attempt.id && (
                    <ConfirmDialog
                      message="Ви впевнені, що хочете видалити цю спробу?"
                      onConfirm={() => handleDeleteAttempt(attempt.id)}
                      onCancel={() => setConfirmDeleteAttemptId(null)}
                    />
                  )}
                  <div className={`mc-attempt-row${!isFinished ? ' mc-attempt-row--inprogress' : ''}`}>
                    <span className="mc-attempt-idx">#{attempts.length - idx}</span>
                    {isFinished ? (
                      <>
                        <span className="mc-attempt-date">
                          {attempt.finishedAt ? formatAttemptDate(attempt.finishedAt) : '—'}
                        </span>
                        <span className="mc-attempt-pct" style={{ color: scoreColor(pct) }}>
                          {pct}%
                        </span>
                        <span className="mc-attempt-pts">
                          {attempt.earnedPoints} / {attempt.maxPoints} балів
                          {attempt.durationSeconds != null && ` · ${fmtDuration(attempt.durationSeconds)}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="mc-attempt-date">
                          розпочато: {formatAttemptDate(attempt.startedAt)}
                        </span>
                        <span className="mc-attempt-inprogress-label">// незавершена</span>
                      </>
                    )}
                    <div className="mc-attempt-actions">
                      {isFinished && (
                        <button
                          className={`mc-attempt-view${expandedAttemptId === attempt.id ? ' active' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleAttempt(attempt.id); }}
                        >
                          {expandedAttemptId === attempt.id ? '▲ згорнути' : '▼ деталі'}
                        </button>
                      )}
                      {isFinished && category !== 'flashcards' ? (
                        <button
                          className="mc-attempt-view-full"
                          disabled={viewingAttemptId === attempt.id}
                          onClick={e => { e.stopPropagation(); handleViewAttempt(attempt); }}
                        >
                          {viewingAttemptId === attempt.id ? '...' : '◎ переглянути спробу'}
                        </button>
                      ) : !isFinished ? (
                        <button
                          className="mc-attempt-resume"
                          onClick={e => { e.stopPropagation(); onResumeAttempt(task, attempt.id); }}
                        >
                          ▶ продовжити спробу
                        </button>
                      ) : null}
                      <button
                        className="mc-attempt-del"
                        disabled={deletingAttemptId === attempt.id}
                        onClick={e => { e.stopPropagation(); setConfirmDeleteAttemptId(attempt.id); }}
                        title="Видалити спробу"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {isFinished && expandedAttemptId === attempt.id && (
                    <div className="mc-attempt-detail">
                      <div className="mc-attempt-detail-row">
                        <span>// дата завершення</span>
                        <span>{attempt.finishedAt ? formatAttemptDate(attempt.finishedAt) : '—'}</span>
                      </div>
                      <div className="mc-attempt-detail-row">
                        <span>// набрано балів</span>
                        <span style={{ color: 'var(--accent)' }}>{attempt.earnedPoints}</span>
                      </div>
                      <div className="mc-attempt-detail-row">
                        <span>// максимум балів</span>
                        <span style={{ color: 'var(--blue)' }}>{attempt.maxPoints}</span>
                      </div>
                      <div className="mc-attempt-detail-row">
                        <span>// час виконання</span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {attempt.durationSeconds != null ? fmtDuration(attempt.durationSeconds) : '—'}
                        </span>
                      </div>
                      <div className="mc-attempt-detail-row">
                        <span>// результат</span>
                        <span style={{ color: scoreColor(pct), fontWeight: 600 }}>{pct}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Content (questions) section ── */}
      {contentOpen && (
        <div className="mc-card-expanded">
          <div className="mc-items-head">
            <div>#</div>
            <div>Тип</div>
            <div>Питання</div>
            <div>Балів</div>
          </div>
          {task.taskItems.length > 0
            ? [...task.taskItems]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item, i) => (
                  <div key={item.id} className="mc-item-row">
                    <div className="mc-item-cell">{i + 1}</div>
                    <div>
                      <span className="badge badge-type">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </span>
                    </div>
                    <div className="mc-item-question">{item.question}</div>
                    <div className="mc-item-cell">{item.points}</div>
                  </div>
                ))
            : <div className="mc-no-items">// питань немає</div>
          }
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
type Filter    = 'all' | 'test' | 'flashcards' | 'coding';
type VisFilter = 'all' | 'public' | 'private';

interface Props {
  onTakeTest: (task: TaskDetailResponse) => void;
  onResumeAttempt: (task: TaskDetailResponse, attemptId: string) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
}

export default function MyContentPage({ onTakeTest, onResumeAttempt, onViewAttempt }: Props) {
  const { accessToken } = useAuth();
  const token = accessToken ?? '';
  const [tasks, setTasks]     = useState<TaskDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter,    setFilter]    = useState<Filter>('all');
  const [visFilter, setVisFilter] = useState<VisFilter>('all');
  const [search,    setSearch]    = useState('');
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    getMyTasks(accessToken)
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Не вдалося завантажити завдання'); setLoading(false); });
  }, [accessToken]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter !== 'all')    list = list.filter(t => taskCategory(t.taskItems) === filter);
    if (visFilter === 'public')  list = list.filter(t => t.status === 'Public');
    if (visFilter === 'private') list = list.filter(t => t.status !== 'Public');
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tasks, filter, visFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalItems  = tasks.reduce((s, t) => s + t.taskItems.length, 0);
  const aiCount     = tasks.filter(t => t.aiGenerated).length;
  const uniqueLangs = new Set(tasks.map(t => t.language)).size;

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all',        label: '// всі' },
    { id: 'test',       label: '// тестування' },
    { id: 'flashcards', label: '// флеш-картки' },
    { id: 'coding',     label: '// кодування' },
  ];

  const VIS_FILTERS: { id: VisFilter; label: string }[] = [
    { id: 'all',     label: '// всі' },
    { id: 'public',  label: '// публічні' },
    { id: 'private', label: '// приватні' },
  ];

  return (
    <div className="content">

      {/* Stats strip */}
      <div className="stats-row">
        <div className="stat-card green">
          <div className="stat-label">Завдань створено</div>
          <div className="stat-val green">{tasks.length}</div>
          <div className="stat-sub">за весь час</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Питань всього</div>
          <div className="stat-val blue">{totalItems}</div>
          <div className="stat-sub">у всіх завданнях</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">AI-генерація</div>
          <div className="stat-val yellow">{aiCount}</div>
          <div className="stat-sub">з {tasks.length} завдань</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Мов охоплено</div>
          <div className="stat-val purple">{uniqueLangs}</div>
          <div className="stat-sub">різних мов</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mc-toolbar">
        <div className="mc-filter-tabs">
          {FILTERS.map(f => (
            <div
              key={f.id}
              className={`mc-filter-tab${filter === f.id ? ' active' : ''}`}
              onClick={() => { setFilter(f.id); setPage(1); }}
            >
              {f.label}
            </div>
          ))}
        </div>
        <div className="mc-filter-sep" />
        <div className="mc-filter-tabs">
          {VIS_FILTERS.map(f => (
            <div
              key={f.id}
              className={`mc-filter-tab${visFilter === f.id ? ' active' : ''}`}
              onClick={() => { setVisFilter(f.id); setPage(1); }}
            >
              {f.label}
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div className="search-box" style={{ width: 200, height: 30 }}>
          <span className="search-icon">⌕</span>
          <input
            placeholder="// пошук..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Meta count */}
      <div className="mc-meta-row">
        <span className="mc-meta-count">
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{filtered.length}</span> завдань
        </span>
      </div>

      {loading && (
        <div className="mc-empty">
          <div className="mc-empty-icon">◌</div>
          <div className="mc-empty-title">// завантаження...</div>
        </div>
      )}

      {error && (
        <div className="mc-empty">
          <div className="mc-empty-icon">✕</div>
          <div className="mc-empty-title" style={{ color: 'var(--red)' }}>{error}</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mc-empty">
          <div className="mc-empty-icon">◈</div>
          <div className="mc-empty-title">// завдань не знайдено</div>
          <div className="mc-empty-sub">Спробуйте змінити фільтр або пошуковий запит</div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          {paginated.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              token={token}
              onTakeTest={onTakeTest}
              onResumeAttempt={onResumeAttempt}
              onViewAttempt={onViewAttempt}
              onDeleted={id => setTasks(prev => prev.filter(t => t.id !== id))}
              onStatusChanged={(id, status) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))}
            />
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

    </div>
  );
}
