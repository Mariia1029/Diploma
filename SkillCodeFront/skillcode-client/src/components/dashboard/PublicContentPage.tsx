import { useState, useEffect, useMemo } from 'react';
import CustomSelect from '../common/CustomSelect';
import Pagination from '../common/Pagination';
import '../../styles/public-content.css';
import { useAuth } from '../../context/AuthContext';
import { getPublicTasks, getSavedTasks, saveTask } from '../../api/tasksApi';
import { ApiError } from '../../api/usersApi';
import type { PublicTaskResponse, TaskItemResponse } from '../../types/task';
import type { TaskType } from '../../types/template';

const LANG_DISPLAY: Record<string, string> = {
  Python: 'Python', JavaScript: 'JavaScript', TypeScript: 'TypeScript',
  CSharp: 'C#', Cpp: 'C++', C: 'C', Java: 'Java', Go: 'Go', Rust: 'Rust',
};

const LANG_TAG_CLASS: Record<string, string> = {
  Python: 'tag-py', JavaScript: 'tag-js', TypeScript: 'tag-ts',
  CSharp: 'tag-cs', Cpp: 'tag-cpp', C: 'tag-c', Java: 'tag-java',
  Go: 'tag-go', Rust: 'tag-rs',
};

const TYPE_LABEL: Partial<Record<TaskType, string>> = {
  SingleChoice: 'Тест',
  MultiChoice:  'Тест',
  TrueFalse:    'Тест',
  FlashCards:   'Флеш-картки',
  Coding:       'Кодування',
  Open:         'Відкрита відп.',
  Matching:     'Відповідність',
  Ordering:     'Порядок',
  FillBlank:    'Заповнення',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

type Category = 'all' | 'test' | 'flashcards' | 'coding';

function taskCategory(items: TaskItemResponse[]): 'test' | 'flashcards' | 'coding' {
  if (items.length === 0) return 'test';
  const flash = items.filter(i => i.type === 'FlashCards').length;
  const code  = items.filter(i => i.type === 'Coding').length;
  const test  = items.length - flash - code;
  if (flash >= test && flash >= code) return 'flashcards';
  if (code >= test && code > flash)  return 'coding';
  return 'test';
}

function uniqueTypeLabels(items: TaskItemResponse[]): string[] {
  const seen = new Set<string>();
  for (const item of items) {
    const label = TYPE_LABEL[item.type];
    if (label) seen.add(label);
    if (seen.size >= 2) break;
  }
  return [...seen];
}

/* ── Public Card ── */
interface PublicCardProps {
  task: PublicTaskResponse;
  saved: boolean;
  onSave: (id: string) => void;
  currentUser: { firstName: string; lastName: string; id: string } | null;
  saveMsg?: string;
}

function PublicCard({ task, saved, onSave, currentUser, saveMsg }: PublicCardProps) {
  const langDisplay = LANG_DISPLAY[task.language] ?? task.language;
  const langClass   = LANG_TAG_CLASS[task.language] ?? 'tag-dim';
  const typeLabels  = uniqueTypeLabels(task.taskItems);

  const firstName = task.ownerFirstName || (task.ownerId === currentUser?.id ? currentUser?.firstName : '') || '';
  const lastName  = task.ownerLastName  || (task.ownerId === currentUser?.id ? currentUser?.lastName  : '') || '';

  return (
    <div className="pc-card">
      {task.aiGenerated && <div className="pc-ai-badge">// AI</div>}

      <div className="pc-card-title" style={{ paddingRight: task.aiGenerated ? 40 : 0 }}>
        {task.title}
      </div>

      <div className="pc-card-tags">
        <span className={`tag ${langClass}`}>{langDisplay}</span>
        {typeLabels.map(label => (
          <span key={label} className="tag tag-dim">{label}</span>
        ))}
      </div>

      <div className="pc-card-footer">
        <div className="pc-card-author">
          <span className="pc-author-icon">◉</span>
          <span>{firstName} {lastName}</span>
        </div>
        <div className="pc-card-right">
          <span className="pc-card-meta">
            {task.taskItems.length} питань · {formatDate(task.createdAt)}
          </span>
          <div className="pc-card-actions">
            <button className="pc-icon-btn" title="Поділитись">↗</button>
            <button
              className={`pc-icon-btn${saved ? ' pc-saved' : ''}`}
              title={saved ? 'Збережено' : 'Зберегти'}
              onClick={e => { e.stopPropagation(); onSave(task.id); }}
            >
              {saved ? '◆' : '◇'}
            </button>
          </div>
        </div>
      </div>

      {saveMsg && (
        <div className="pc-save-msg">{saveMsg}</div>
      )}
    </div>
  );
}

/* ── Main Page ── */
const FILTERS: { id: Category; label: string }[] = [
  { id: 'all',        label: '// всі' },
  { id: 'test',       label: '// тестування' },
  { id: 'flashcards', label: '// флеш-картки' },
  { id: 'coding',     label: '// кодування' },
];

const LANG_OPTIONS = [
  { value: 'all',        label: 'всі' },
  { value: 'Python',     label: 'Python' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'CSharp',     label: 'C#' },
  { value: 'Cpp',        label: 'C++' },
  { value: 'Java',       label: 'Java' },
  { value: 'Go',         label: 'Go' },
  { value: 'Rust',       label: 'Rust' },
];

export default function PublicContentPage() {
  const { accessToken, user } = useAuth();
  const token = accessToken ?? '';

  const [tasks,    setTasks]    = useState<PublicTaskResponse[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [filter,   setFilter]   = useState<Category>('all');
  const [lang,     setLang]     = useState('all');
  const [sort,     setSort]     = useState<'date' | 'title'>('date');
  const [search,   setSearch]   = useState('');
  const [saved,    setSaved]    = useState<Set<string>>(new Set());
  const [saveMsgs, setSaveMsgs] = useState<Record<string, string>>({});
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 9;

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    Promise.all([
      getPublicTasks(accessToken),
      getSavedTasks(accessToken).catch(() => [] as { id: string }[]),
    ]).then(([publicData, savedData]) => {
      setTasks(publicData);
      setSaved(new Set(savedData.map(t => t.id)));
      setLoading(false);
    }).catch(() => { setError('Не вдалося завантажити публічні завдання'); setLoading(false); });
  }, [accessToken]);

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter !== 'all') list = list.filter(t => taskCategory(t.taskItems) === filter);
    if (lang !== 'all')   list = list.filter(t => t.language === lang);
    if (search)           list = list.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
    if (sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    else                  list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [tasks, filter, lang, search, sort]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function showSaveMsg(id: string, msg: string) {
    setSaveMsgs(prev => ({ ...prev, [id]: msg }));
    setTimeout(() => setSaveMsgs(prev => { const next = { ...prev }; delete next[id]; return next; }), 3000);
  }

  async function handleSave(id: string) {
    if (saved.has(id)) return;
    try {
      await saveTask(token, id);
      setSaved(prev => new Set(prev).add(id));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSaved(prev => new Set(prev).add(id));
          showSaveMsg(id, 'Це завдання вже у збережених');
        } else if (err.status === 403) {
          showSaveMsg(id, 'Неможливо зберегти власне завдання');
        }
      }
    }
  }

  return (
    <div className="content">

      {/* Toolbar */}
      <div className="pc-toolbar">
        <div className="pc-filter-tabs">
          {FILTERS.map(f => (
            <div
              key={f.id}
              className={`pc-filter-tab${filter === f.id ? ' active' : ''}`}
              onClick={() => { setFilter(f.id); setPage(1); }}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      {/* Meta row */}
      <div className="pc-meta-row">
        <span className="pc-meta-count">
          // знайдено:{' '}
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{filtered.length}</span>
        </span>
        <div className="pc-spacer" />

        <div className="pc-select-wrap">
          <span className="pc-select-label">мова:</span>
          <CustomSelect
            value={lang}
            onChange={v => { setLang(v); setPage(1); }}
            options={LANG_OPTIONS}
          />
        </div>

        <div className="pc-select-wrap">
          <span className="pc-select-label">сорт:</span>
          <CustomSelect
            value={sort}
            onChange={v => { setSort(v as 'date' | 'title'); setPage(1); }}
            options={[
              { value: 'date', label: 'за датою' },
              { value: 'title', label: 'за назвою' },
            ]}
          />
        </div>

        <div className="search-box" style={{ width: 180, height: 30 }}>
          <span className="search-icon">⌕</span>
          <input
            placeholder="// пошук..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="pc-empty">
          <div className="pc-empty-icon">◌</div>
          <div className="pc-empty-title">// завантаження...</div>
        </div>
      )}

      {error && (
        <div className="pc-empty">
          <div className="pc-empty-icon">✕</div>
          <div className="pc-empty-title" style={{ color: 'var(--red)' }}>{error}</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="pc-empty">
          <div className="pc-empty-icon">◉</div>
          <div className="pc-empty-title">// завдань не знайдено</div>
          <div className="pc-empty-sub">Спробуйте змінити фільтр або пошуковий запит</div>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && filtered.length > 0 && (
        <>
          <div className="pc-grid">
            {paginated.map(task => (
              <PublicCard
                key={task.id}
                task={task}
                saved={saved.has(task.id)}
                onSave={handleSave}
                currentUser={user}
                saveMsg={saveMsgs[task.id]}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

    </div>
  );
}
