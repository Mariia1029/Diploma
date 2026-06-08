import { useState } from 'react';
import type { TaskType, TemplateDetailResponse, CreateTemplateRequest } from '../../types/template';
import { createTemplate } from '../../api/templatesApi';
import { ApiError } from '../../api/usersApi';
import CustomSelect from '../common/CustomSelect';
import '../../styles/template-modal.css';

/* ── task type config ── */

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  SingleChoice: 'Одна відповідь',
  MultiChoice:  'Кілька відповідей',
  Matching:     'Відповідність',
  Ordering:     'Послідовність',
  FillBlank:    'Заповнити пропуск',
  TrueFalse:    'Правда/Неправда',
  Open:         'Відкрита відповідь',
  FlashCards:   'Флеш-картки',
  Coding:    'Кодування',
};

const DEFAULT_CONTENT: Record<TaskType, object> = {
  SingleChoice: {
    question: '',
    options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }],
    correct_answer: 'A',
    multi_answer: false,
    explanation: null,
  },
  MultiChoice: {
    question: '',
    options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }],
    correct_answer: ['A', 'B'],
    multi_answer: true,
    explanation: null,
  },
  Matching: {
    question: '',
    options: {
      left:  [{ label: '1', text: '' }, { label: '2', text: '' }, { label: '3', text: '' }],
      right: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }],
    },
    correct_answer: [{ left: '1', right: 'A' }, { left: '2', right: 'B' }, { left: '3', right: 'C' }],
    multi_answer: false,
    explanation: null,
  },
  Ordering: {
    question: '',
    options: [{ label: '1', text: '' }, { label: '2', text: '' }, { label: '3', text: '' }],
    correct_answer: '1,2,3',
    multi_answer: false,
    explanation: null,
  },
  FillBlank: {
    question: 'Вкажіть пропущене слово: ___',
    options: null,
    correct_answer: '',
    multi_answer: false,
    explanation: null,
  },
  TrueFalse: {
    question: '',
    options: null,
    correct_answer: 'true',
    multi_answer: false,
    explanation: null,
  },
  Open: {
    question: '',
    options: null,
    correct_answer: ' ',
    multi_answer: false,
    explanation: null,
  },
  FlashCards: {
    question: '',
    options: null,
    correct_answer: '',
    multi_answer: false,
    explanation: null,
  },
  Coding: {
    question: '',
    options: 'def solution():\n    pass',
    correct_answer: [{ input: [], expected: '' }],
    multi_answer: false,
    explanation: null,
  },
};

type TemplateKind = 'test' | 'flash' | 'coding';

interface KindMeta {
  key: TemplateKind;
  icon: string;
  title: string;
  desc: string;
  types: TaskType[];
  selClass: string;
  checkClass: string;
}

const KINDS: KindMeta[] = [
  {
    key:        'test',
    icon:       '📋',
    title:      'Тестування',
    desc:       'Перевірка знань з різними типами завдань. Підходить для іспитів та самоперевірки.',
    types:      ['SingleChoice', 'MultiChoice', 'Matching', 'Ordering', 'FillBlank', 'TrueFalse', 'Open'],
    selClass:   'sel-test',
    checkClass: 'test',
  },
  {
    key:        'flash',
    icon:       '🃏',
    title:      'Флеш-картки',
    desc:       'Тренажер для запам\'ятовування термінів, понять та визначень.',
    types:      ['FlashCards'],
    selClass:   'sel-flash',
    checkClass: 'flash',
  },
  {
    key:        'coding',
    icon:       '💻',
    title:      'Кодування',
    desc:       'Тренажер з написання та виправлення коду. Підходить для практики програмування.',
    types:      ['Coding'],
    selClass:   'sel-coding',
    checkClass: 'coding',
  },
];

const STEP_LABELS = ['// тип', '// деталі', '// структура'];

interface TaskRow {
  key: number;
  type: TaskType;
}

interface Props {
  token: string;
  onClose: () => void;
  onCreated: (tpl: TemplateDetailResponse) => void;
  createFn?: (token: string, data: CreateTemplateRequest) => Promise<TemplateDetailResponse>;
}

let keySeq = 0;
const nextKey = () => ++keySeq;

/* ── step bar ── */

function ModalStepBar({ step }: { step: number }) {
  return (
    <div className="modal-step-bar">
      {STEP_LABELS.map((label, i) => (
        <div
          key={i}
          style={{ display: 'flex', alignItems: 'center', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}
        >
          <div className="modal-step-item">
            <div className={`modal-step-dot${i === step ? ' active' : i < step ? ' done' : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className={`modal-step-label${i === step ? ' active' : i < step ? ' done' : ''}`}>
              {label}
            </div>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`modal-step-line${i < step ? ' done' : ''}`} style={{ flex: 1 }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── step 0: kind picker ── */

function KindStep({
  kind, setKind, onClose, onNext,
}: {
  kind: TemplateKind | null;
  setKind: (k: TemplateKind) => void;
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="modal-body">
        <div className="tpl-type-grid">
          {KINDS.map((k) => {
            const selected = kind === k.key;
            return (
              <div
                key={k.key}
                className={`tpl-type-card${selected ? ` ${k.selClass}` : ''}`}
                onClick={() => setKind(k.key)}
              >
                <div className="tpl-type-icon">{k.icon}</div>
                <div className="tpl-type-body">
                  <div className="tpl-type-title">{k.title}</div>
                  <div className="tpl-type-desc">{k.desc}</div>
                  <div className="tpl-type-tags">
                    {k.types.map((t) => (
                      <span key={t} className="tpl-type-tag">{TASK_TYPE_LABELS[t]}</span>
                    ))}
                  </div>
                </div>
                {selected && <div className={`tpl-type-check ${k.checkClass}`}>✓</div>}
              </div>
            );
          })}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-back" onClick={onClose}>Скасувати</button>
        <button className="btn-next" disabled={!kind} onClick={onNext}>Далі →</button>
      </div>
    </>
  );
}

/* ── step 1: details ── */

function DetailsStep({
  title, setTitle, description, setDesc, onBack, onNext,
}: {
  title: string; setTitle: (v: string) => void;
  description: string; setDesc: (v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <>
      <div className="modal-body">
        <div className="wiz-field">
          <label className="wiz-label">
            Назва <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            type="text"
            className="wiz-input"
            placeholder="// наприклад: Основи Python"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="wiz-field">
          <label className="wiz-label">
            Опис{' '}
            <span style={{ color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              // необов'язково
            </span>
          </label>
          <textarea
            className="wiz-textarea"
            placeholder="// короткий опис вмісту шаблону..."
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            style={{ minHeight: 70 }}
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn-back" onClick={onBack}>← Назад</button>
        <button className="btn-next" disabled={!title.trim()} onClick={onNext}>Далі →</button>
      </div>
    </>
  );
}

/* ── step 2: structure ── */

function StructureStep({
  allowedTypes, tasks, setTasks, onBack, onSubmit, submitting, error,
}: {
  allowedTypes: TaskType[];
  tasks: TaskRow[];
  setTasks: React.Dispatch<React.SetStateAction<TaskRow[]>>;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  const singleType = allowedTypes.length === 1;

  function addTask() {
    setTasks((prev) => [...prev, { key: nextKey(), type: allowedTypes[0] }]);
  }

  function removeTask(key: number) {
    setTasks((prev) => prev.filter((t) => t.key !== key));
  }

  function changeType(key: number, type: TaskType) {
    setTasks((prev) => prev.map((t) => (t.key === key ? { ...t, type } : t)));
  }

  function moveUp(index: number) {
    setTasks((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    setTasks((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  return (
    <>
      <div className="modal-body">
        {tasks.length > 0 && (
          <div className="task-list">
            {tasks.map((row, i) => (
              <div key={row.key} className="task-list-row">
                <span className="task-row-index">{String(i + 1).padStart(2, '0')}</span>

                {singleType ? (
                  <div className="task-row-select-wrap">
                    <span className="task-row-select" style={{ cursor: 'default' }}>
                      {TASK_TYPE_LABELS[row.type]}
                    </span>
                  </div>
                ) : (
                  <CustomSelect
                    wrapClassName="task-row-select-wrap"
                    triggerClassName="task-row-select"
                    value={row.type}
                    onChange={(v) => changeType(row.key, v as TaskType)}
                    options={allowedTypes.map(t => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
                  />
                )}

                <div className="task-row-btns">
                  <button className="task-row-btn" disabled={i === 0} onClick={() => moveUp(i)} title="Вгору">↑</button>
                  <button className="task-row-btn" disabled={i === tasks.length - 1} onClick={() => moveDown(i)} title="Вниз">↓</button>
                  <button className="task-row-btn del" onClick={() => removeTask(row.key)} title="Видалити">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div className="task-list-empty">// завдань ще немає — натисніть «Додати завдання»</div>
        )}

        <button className="add-task-btn" onClick={addTask}>
          + Додати завдання
        </button>
      </div>

      {error && <div className="modal-error">{error}</div>}

      <div className="modal-footer">
        <button className="btn-back" onClick={onBack}>← Назад</button>
        <button
          className="btn-next"
          disabled={submitting || tasks.length === 0}
          onClick={onSubmit}
        >
          {submitting ? '// збереження...' : '✓ Створити шаблон'}
        </button>
      </div>
    </>
  );
}

/* ── root ── */

export default function TemplateCreateModal({ token, onClose, onCreated, createFn }: Props) {
  const [step, setStep]         = useState(0);
  const [kind, setKind]         = useState<TemplateKind | null>(null);
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [tasks, setTasks]       = useState<TaskRow[]>([]);
  const [submitting, setSub]    = useState(false);
  const [error, setError]       = useState('');

  const kindMeta     = KINDS.find((k) => k.key === kind);
  const allowedTypes = kindMeta?.types ?? [];

  const kindComment =
    kind === 'test'      ? '// тестування' :
    kind === 'flash'     ? '// флеш-картки' :
    kind === 'coding'    ? '// кодування' :
    '// новий шаблон';

  async function handleSubmit() {
    if (tasks.length === 0) { setError('// додайте хоча б одне завдання'); return; }
    setError('');
    setSub(true);
    try {
      const fn = createFn ?? createTemplate;
      const tpl = await fn(token, {
        title:       title.trim(),
        description: description.trim(),
        isPublic:    false,
        items: tasks.map((t, i) => ({
          type:       t.type,
          content:    JSON.stringify(DEFAULT_CONTENT[t.type]),
          orderIndex: i,
        })),
      });
      onCreated(tpl);
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs = Object.values(err.errors).flat();
        setError(msgs[0] ?? `// помилка сервера (${err.status})`);
      } else {
        setError('// не вдалось зберегти шаблон');
      }
    } finally {
      setSub(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div className="modal-title">
            Новий шаблон <span className="modal-comment">{kindComment}</span>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <ModalStepBar step={step} />

        {step === 0 && (
          <KindStep kind={kind} setKind={setKind} onClose={onClose} onNext={() => setStep(1)} />
        )}
        {step === 1 && (
          <DetailsStep
            title={title} setTitle={setTitle}
            description={description} setDesc={setDesc}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StructureStep
            allowedTypes={allowedTypes}
            tasks={tasks}
            setTasks={setTasks}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}
      </div>
    </div>
  );
}
