import { useState, useEffect, useMemo } from 'react';
import '../../styles/my-content.css';
import { useAuth } from '../../context/AuthContext';
import { getSavedTasks, unsaveTask } from '../../api/tasksApi';
import { getAttemptsByTask, getAttemptAnswers, deleteAttempt } from '../../api/attemptsApi';
import type { AttemptResponse } from '../../api/attemptsApi';
import type { TaskDetailResponse, TaskItemResponse } from '../../types/task';
import type { TaskType } from '../../types/template';
import type { ViewAttemptInput } from './ViewAttemptPage';

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

/* ── Confirm Dialog ── */
interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="mc-confirm-overlay" onClick={e => { e.stopPropagation(); onCancel(); }}>
      <div className="mc-confirm-dialog" onClick={e => e.stopPropagation()}>
        <p className="mc-confirm-msg">{message}</p>
        <div className="mc-confirm-actions">
          <button className="mc-confirm-yes" onClick={onConfirm}>Так, видалити</button>
          <button className="mc-confirm-cancel" onClick={onCancel}>Скасувати</button>
        </div>
      </div>
    </div>
  );
}

/* ── Saved Task Card ── */
interface SavedCardProps {
  task: TaskDetailResponse;
  token: string;
  onTakeTest: (task: TaskDetailResponse) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
  onRemoved: (taskId: string) => void;
}

function SavedCard({ task, token, onTakeTest, onViewAttempt, onRemoved }: SavedCardProps) {
  const [attemptsOpen,      setAttemptsOpen]      = useState(false);
  const [contentOpen,       setContentOpen]        = useState(false);
  const [attempts,          setAttempts]           = useState<AttemptResponse[]>([]);
  const [attemptsLoading,   setAttemptsLoading]    = useState(false);
  const [expandedAttemptId, setExpandedAttemptId]  = useState<string | null>(null);
  const [viewingAttemptId,  setViewingAttemptId]   = useState<string | null>(null);
  const [confirmUnsave,     setConfirmUnsave]      = useState(false);
  const [unsaving,          setUnsaving]           = useState(false);
  const [confirmDeleteAttemptId, setConfirmDeleteAttemptId] = useState<string | null>(null);
  const [deletingAttemptId,      setDeletingAttemptId]      = useState<string | null>(null);

  const langDisplay = LANG_DISPLAY[task.language] ?? task.language;
  const langClass   = LANG_TAG_CLASS[task.language] ?? 'tag-dim';

  async function handleUnsave() {
    setUnsaving(true);
    try {
      await unsaveTask(token, task.id);
      onRemoved(task.id);
    } finally {
      setUnsaving(false);
      setConfirmUnsave(false);
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
      getAttemptsByTask(token, task.id, 'Saved')
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
      const answers = await getAttemptAnswers(token, attempt.id);
      const answerMap = Object.fromEntries(answers.map(a => [a.taskItemId, a]));
      const sortedItems = [...task.taskItems].sort((a, b) => a.orderIndex - b.orderIndex);
      const questions = sortedItems.map(item => {
        const ans = answerMap[item.id];
        return {
          item,
          userAnswerJson: ans?.userAnswer ?? null,
          isCorrect: ans?.isCorrect ?? null,
          earnedPoints: ans?.earnedPoints ?? null,
        };
      });
      onViewAttempt({ task, questions, finishData: attempt });
    } finally {
      setViewingAttemptId(null);
    }
  }

  return (
    <div className="mc-card">
      {confirmUnsave && (
        <ConfirmDialog
          message="Ви впевнені, що хочете видалити цей контент зі збережених?"
          onConfirm={handleUnsave}
          onCancel={() => setConfirmUnsave(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="mc-card-header" onClick={toggleAttempts}>
        <span className="mc-card-icon">◇</span>
        <span className="mc-card-name">{task.title}</span>

        <span className={`tag ${langClass}`} style={{ marginRight: 6 }}>{langDisplay}</span>

        {task.aiGenerated && (
          <span className="badge badge-ai" style={{ marginRight: 8 }}>// ai</span>
        )}

        <span className="mc-card-meta">
          {task.taskItems.length}&nbsp;{task.taskItems.length === 1 ? 'питання' : 'питань'}
        </span>
        <span className="mc-card-meta">{formatDate(task.createdAt)}</span>

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
          className="mc-card-del"
          disabled={unsaving}
          onClick={e => { e.stopPropagation(); setConfirmUnsave(true); }}
          title="Видалити зі збережених"
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
              const pct = attempt.maxPoints > 0
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
                  <div className="mc-attempt-row">
                    <span className="mc-attempt-idx">#{attempts.length - idx}</span>
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
                    <div className="mc-attempt-actions">
                      <button
                        className={`mc-attempt-view${expandedAttemptId === attempt.id ? ' active' : ''}`}
                        onClick={e => { e.stopPropagation(); toggleAttempt(attempt.id); }}
                      >
                        {expandedAttemptId === attempt.id ? '▲ згорнути' : '▼ деталі'}
                      </button>
                      <button
                        className="mc-attempt-view-full"
                        disabled={viewingAttemptId === attempt.id}
                        onClick={e => { e.stopPropagation(); handleViewAttempt(attempt); }}
                      >
                        {viewingAttemptId === attempt.id ? '...' : '◎ переглянути спробу'}
                      </button>
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

                  {expandedAttemptId === attempt.id && (
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
type Filter = 'all' | 'test' | 'flashcards' | 'coding';

interface Props {
  onTakeTest: (task: TaskDetailResponse) => void;
  onViewAttempt: (input: ViewAttemptInput) => void;
}

export default function SavedContentPage({ onTakeTest, onViewAttempt }: Props) {
  const { accessToken } = useAuth();
  const token = accessToken ?? '';
  const [tasks,   setTasks]   = useState<TaskDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<Filter>('all');
  const [search,  setSearch]  = useState('');

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    getSavedTasks(accessToken)
      .then(data => { setTasks(data); setLoading(false); })
      .catch(() => { setError('Не вдалося завантажити збережені завдання'); setLoading(false); });
  }, [accessToken]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter !== 'all') list = list.filter(t => taskCategory(t.taskItems) === filter);
    if (search) list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [tasks, filter, search]);

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all',        label: '// всі' },
    { id: 'test',       label: '// тестування' },
    { id: 'flashcards', label: '// флеш-картки' },
    { id: 'coding',     label: '// кодування' },
  ];

  return (
    <div className="content">

      {/* Toolbar */}
      <div className="mc-toolbar">
        <div className="mc-filter-tabs">
          {FILTERS.map(f => (
            <div
              key={f.id}
              className={`mc-filter-tab${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
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
            onChange={e => setSearch(e.target.value)}
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
          <div className="mc-empty-icon">◇</div>
          <div className="mc-empty-title">// збережених завдань не знайдено</div>
          <div className="mc-empty-sub">Зберігайте публічні завдання, щоб вони з'явились тут</div>
        </div>
      )}

      {!loading && !error && filtered.map(task => (
        <SavedCard
          key={task.id}
          task={task}
          token={token}
          onTakeTest={onTakeTest}
          onViewAttempt={onViewAttempt}
          onRemoved={id => setTasks(prev => prev.filter(t => t.id !== id))}
        />
      ))}

    </div>
  );
}
