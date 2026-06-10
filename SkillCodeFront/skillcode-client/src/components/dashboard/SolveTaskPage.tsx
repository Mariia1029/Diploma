import { useState, useRef, useEffect, useCallback, useMemo, Fragment } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { testCode } from '../../api/codeApi';
import type { TestCasesResponse } from '../../api/codeApi';
import { gradeAnswer } from '../../api/aiApi';
import type { TaskDetailResponse, TaskItemResponse } from '../../types/task';
import type { TaskType } from '../../types/template';
import { useAuth } from '../../context/AuthContext';
import { startAttempt, saveAnswer, finishAttempt, updateAnswerGrade, getAttemptById } from '../../api/attemptsApi';
import type { AttemptResponse, AttemptAnswerResponse } from '../../api/attemptsApi';
import { runShareAttempt } from '../../api/sharesApi';
import type { EphemeralAnswer } from '../../types/share';
import type { ViewAttemptInput } from './ViewAttemptPage';
import FlashCardTrainer from './FlashCardTrainer';
import CustomSelect from '../common/CustomSelect';
import '../../styles/solve-task.css';

interface Props {
  task: TaskDetailResponse;
  onBack: () => void;
  onViewAttempt?: (input: ViewAttemptInput) => void;
  previewMode?: boolean;
  shareId?: string;
  resumeAttemptId?: string;
  contextType?: string;
  contextId?: string | null;
}

/* ── Labels ── */
const TYPE_LABELS: Record<TaskType, string> = {
  SingleChoice: 'одна відповідь',
  MultiChoice:  'декілька відповідей',
  Matching:     'відповідність',
  Ordering:     'послідовність',
  FillBlank:    'заповнити пропуск',
  TrueFalse:    'правда / неправда',
  Open:         'відкрите питання',
  FlashCards:   'флеш-картки',
  Coding:       'кодування',
};

/* ── Internal question shape ── */
interface OptionItem { label: string; text: string; }

interface ParsedQuestion {
  id: string;
  type: TaskType;
  typeLabel: string;
  question: string;
  points: number;
  explanation: string | null;
  lang: string;
  options?: OptionItem[];
  matchLeft?: OptionItem[];
  matchRight?: OptionItem[];
  starterCode?: string;
  signature?: string;
}

type AnswerValue =
  | string
  | string[]
  | Record<number, string>
  | boolean
  | { code: string };

type QuestionGrade = {
  qId: string;
  type: TaskType;
  question: string;
  maxPoints: number;
  earnedPoints: number;
  skipped: boolean;
  codeTestResult?: TestCasesResponse;
  aiFeedback?: string;
  isCorrect?: boolean | null;
};

/* ── Parse one task item into UI-ready shape ── */
function parseQuestion(item: TaskItemResponse, lang: string): ParsedQuestion {
  const base: ParsedQuestion = {
    id:          item.id,
    type:        item.type,
    typeLabel:   TYPE_LABELS[item.type] ?? item.type,
    question:    item.question,
    points:      item.points,
    explanation: item.explanation,
    lang,
  };

  let opts: unknown = null;
  try { opts = item.options ? JSON.parse(item.options) : null; } catch { /* ignore */ }

  switch (item.type) {
    case 'SingleChoice':
    case 'MultiChoice':
      return { ...base, options: (opts as OptionItem[]) ?? [] };

    case 'Ordering': {
      const arr = (opts as OptionItem[]) ?? [];
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return { ...base, options: shuffled };
    }

    case 'Matching': {
      const m = opts as { left: OptionItem[]; right: OptionItem[] } | null;
      return { ...base, matchLeft: m?.left ?? [], matchRight: m?.right ?? [] };
    }

    case 'Coding': {
      const sig = (opts as { signature?: string } | null)?.signature ?? null;
      return {
        ...base,
        signature: sig ?? undefined,
        starterCode: sig ?? '',
      };
    }

    default:
      return base;
  }
}

/* ── Serialize answer to backend-compatible JSON value ── */
function serializeAnswer(q: ParsedQuestion, value: AnswerValue): unknown {
  switch (q.type) {
    case 'SingleChoice':
    case 'FillBlank':
    case 'Open':
      return value as string;

    case 'TrueFalse':
      return (value as string) === 'true';

    case 'MultiChoice':
    case 'Ordering':
      return value as string[];

    case 'Matching': {
      const sel = value as Record<number, string>;
      return (q.matchLeft ?? [])
        .map((left, i) => ({ left: left.label, right: sel[i] ?? '' }))
        .filter(pair => pair.right !== '');
    }

    case 'FlashCards':
      return value as boolean;

    case 'Coding':
      return (value as { code: string }).code;

    default:
      return value;
  }
}

/* ── Deserialize answer from server back to UI value ── */
function deserializeAnswer(q: ParsedQuestion, raw: string | null): AnswerValue | undefined {
  if (raw === null || raw === '') return undefined;

  switch (q.type) {
    case 'SingleChoice':
    case 'FillBlank':
    case 'Open': {
      // Server might double-encode as JSON string
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') return parsed;
      } catch { /* ignore */ }
      return raw;
    }

    case 'TrueFalse': {
      try {
        const parsed = JSON.parse(raw);
        return String(parsed);
      } catch {
        return raw === 'true' || raw === 'false' ? raw : undefined;
      }
    }

    case 'MultiChoice':
    case 'Ordering': {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch { /* ignore */ }
      return undefined;
    }

    case 'Matching': {
      try {
        const pairs = JSON.parse(raw) as { left: string; right: string }[];
        if (!Array.isArray(pairs)) return undefined;
        const result: Record<number, string> = {};
        (q.matchLeft ?? []).forEach((leftItem, i) => {
          const pair = pairs.find(p => p.left === leftItem.label);
          if (pair) result[i] = pair.right;
        });
        return result;
      } catch {
        return undefined;
      }
    }

    case 'FlashCards': {
      try { return JSON.parse(raw) as boolean; } catch { return raw === 'true'; }
    }

    case 'Coding': {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'string') return { code: parsed };
      } catch { /* ignore */ }
      return { code: raw };
    }

    default:
      return undefined;
  }
}

function fmtCountdown(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ── Timer ── */
function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const runningRef = useRef(true);
  useEffect(() => {
    const id = setInterval(() => { if (runningRef.current) setSeconds(s => s + 1); }, 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return fmt(seconds);
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s} с`;
  return `${m} хв ${s} с`;
}

/* ── SingleChoice ── */
function SingleChoice({ q, answer, setAnswer, disabled }: {
  q: ParsedQuestion; answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const sel = answer as string | undefined;
  return (
    <div className="st-options-list">
      {(q.options ?? []).map(opt => (
        <div
          key={opt.label}
          className={`st-option-item${sel === opt.label ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
          onClick={() => { if (!disabled) setAnswer(opt.label); }}
        >
          <div className="st-option-marker">{opt.label}</div>
          <div className="st-option-text">{opt.text}</div>
        </div>
      ))}
    </div>
  );
}

/* ── MultiChoice ── */
function MultiChoice({ q, answer, setAnswer, disabled }: {
  q: ParsedQuestion; answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const sel = (answer as string[] | undefined) ?? [];
  const toggle = (label: string) =>
    setAnswer(sel.includes(label) ? sel.filter(x => x !== label) : [...sel, label]);
  return (
    <div className="st-options-list">
      {(q.options ?? []).map(opt => {
        const selected = sel.includes(opt.label);
        return (
          <div
            key={opt.label}
            className={`st-option-item${selected ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
            onClick={() => { if (!disabled) toggle(opt.label); }}
          >
            <div className="st-option-marker square">{selected ? '✓' : opt.label}</div>
            <div className="st-option-text">{opt.text}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Ordering (drag & drop) ── */
function Ordering({ q, answer, setAnswer, disabled }: {
  q: ParsedQuestion; answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const opts = q.options ?? [];
  const orderedLabels = (answer as string[] | undefined) ?? opts.map(o => o.label);
  const getOpt = (label: string) => opts.find(o => o.label === label);

  const handleDragOver = (e: React.DragEvent, i: number) => { if (disabled) return; e.preventDefault(); setOverIdx(i); };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (disabled || dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
    const next = [...orderedLabels];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(i, 0, moved);
    setAnswer(next);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <div className="st-seq-list">
      {orderedLabels.map((label, i) => (
        <div
          key={label}
          className={`st-seq-item${dragIdx === i ? ' dragging' : ''}${overIdx === i && dragIdx !== i ? ' drag-over' : ''}${disabled ? ' disabled' : ''}`}
          draggable={!disabled}
          onDragStart={() => { if (!disabled) setDragIdx(i); }}
          onDragOver={e => handleDragOver(e, i)}
          onDrop={e => handleDrop(e, i)}
          onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
        >
          <span className="st-seq-handle">⠿⠿</span>
          <div className="st-seq-num">{i + 1}</div>
          <div className="st-seq-text">{getOpt(label)?.text ?? label}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Matching ── */
function Matching({ q, answer, setAnswer, disabled }: {
  q: ParsedQuestion; answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const sel = (answer as Record<number, string> | undefined) ?? {};
  const rights = q.matchRight ?? [];

  return (
    <div className="st-match-grid">
      {(q.matchLeft ?? []).map((left, i) => (
        <Fragment key={i}>
          <div className="st-match-left">{left.text}</div>
          <div className="st-match-connector">→</div>
          <div>
            <CustomSelect
              triggerClassName="st-match-select"
              value={sel[i] ?? ''}
              onChange={v => setAnswer({ ...sel, [i]: v })}
              disabled={disabled}
              options={[
                { value: '', label: '// оберіть...' },
                ...rights.map(r => ({ value: r.label, label: r.text })),
              ]}
            />
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/* ── TrueFalse ── */
function TrueFalse({ answer, setAnswer, disabled }: {
  answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const sel = answer as string | undefined;
  return (
    <div className="st-tf-row">
      <button
        className={`st-tf-btn${sel === 'true' ? ' true-sel' : ''}`}
        disabled={disabled}
        onClick={() => setAnswer('true')}
      >
        ✓ Правда
      </button>
      <button
        className={`st-tf-btn${sel === 'false' ? ' false-sel' : ''}`}
        disabled={disabled}
        onClick={() => setAnswer('false')}
      >
        ✕ Неправда
      </button>
    </div>
  );
}

/* ── FillBlank ── */
function FillBlank({ answer, setAnswer, disabled }: {
  answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const val = (answer as string | undefined) ?? '';
  return (
    <input
      className="st-fillin-input"
      type="text"
      value={val}
      disabled={disabled}
      placeholder="// введіть відповідь..."
      onChange={e => setAnswer(e.target.value)}
    />
  );
}

/* ── Open question ── */
function OpenQuestion({ answer, setAnswer, disabled }: {
  answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const val = (answer as string | undefined) ?? '';
  return (
    <div>
      <textarea
        className="st-open-textarea"
        placeholder="// введіть вашу відповідь..."
        value={val}
        disabled={disabled}
        onChange={e => setAnswer(e.target.value)}
      />
      <div className="st-char-count">{val.length} символів</div>
    </div>
  );
}

/* ── Language → Monaco language ID ── */
const MONACO_LANG: Record<string, string> = {
  Python: 'python', JavaScript: 'javascript', TypeScript: 'typescript',
  CSharp: 'csharp', Cpp: 'cpp', C: 'c', Java: 'java', Go: 'go', Rust: 'rust',
};

type ConsoleEntry = { kind: 'info' | 'out' | 'err' | 'done' | 'pass' | 'fail'; text: string };
type RunState = 'idle' | 'testing';

function nowTs() {
  return new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function PanelHeader({ lang, label }: { lang?: string; label: string }) {
  return (
    <div className="st-code-panel-header">
      <div className="st-panel-dots">
        <span className="st-dot red" />
        <span className="st-dot yellow" />
        <span className="st-dot green" />
      </div>
      {lang && <span className="st-lang-tag">{lang}</span>}
      <span className="st-panel-label">{label}</span>
    </div>
  );
}

/* ── Code editor ── */
function CodeEditor({ q, answer, setAnswer, onProceed, onTestComplete, token, disabled }: {
  q: ParsedQuestion;
  answer: AnswerValue | undefined;
  setAnswer: (v: AnswerValue) => void;
  onProceed: () => void;
  onTestComplete: (result: TestCasesResponse) => void;
  token: string;
  disabled?: boolean;
}) {
  const initialCode = (() => {
    const saved = (answer as { code: string } | undefined)?.code;
    if (saved) return saved;
    return q.starterCode ?? '';
  })();
  const [code,     setCode]     = useState(initialCode);

  // Sync when answer is restored asynchronously (resume flow)
  useEffect(() => {
    const saved = (answer as { code: string } | undefined)?.code;
    if (saved !== undefined && saved !== code) setCode(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);
  const [log,      setLog]      = useState<ConsoleEntry[]>([]);
  const [runState, setRunState] = useState<RunState>('idle');
  const [testResult, setTestResult] = useState<TestCasesResponse | null>(null);
  const consoleRef = useRef<HTMLDivElement>(null);
  const monacoLang = MONACO_LANG[q.lang] ?? 'plaintext';

  const appendLog = (entries: ConsoleEntry[]) =>
    setLog(prev => {
      const next = [...prev, ...entries];
      setTimeout(() => {
        if (consoleRef.current) consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }, 30);
      return next;
    });

  const handleCodeChange = (next: string | undefined) => {
    const val = next ?? '';
    setCode(val);
    setAnswer({ code: val });
    setTestResult(null);
  };

  async function handleTestCases() {
    if (runState !== 'idle') return;
    setRunState('testing');
    setTestResult(null);
    const ts = nowTs();
    setLog([{ kind: 'info', text: `[${ts}] $ перевірка тест-кейсів...` }]);
    try {
      const reqBody = { taskItemId: q.id, code, language: q.lang };
      console.log('[testCode] REQUEST', JSON.stringify(reqBody, null, 2));
      const res = await testCode(token, reqBody);
      console.log('[testCode] RESPONSE', JSON.stringify(res, null, 2));
      const ts2 = nowTs();
      const caseLines: ConsoleEntry[] = res.testResults.flatMap((r, i) => {
        const label = r.index ?? i + 1;
        const header: ConsoleEntry = {
          kind: r.passed ? 'pass' : 'fail',
          text: `  тест ${label}: ${r.passed ? '✓ пройдено' : '✕ не пройдено'}`,
        };
        const details: ConsoleEntry[] = [];
        if (r.input !== undefined && r.input !== null && r.input !== '') {
          details.push({ kind: 'info', text: `    вхід:     ${r.input.trim()}` });
        }
        const actual = r.output ?? r.stdout;
        if (actual !== undefined && actual !== null && actual !== '') {
          details.push({ kind: 'out', text: `    вивід:    ${actual.trim()}` });
        }
        if (r.expected !== undefined && r.expected !== null && r.expected !== '') {
          details.push({ kind: 'out', text: `    очікув.: ${r.expected.trim()}` });
        }
        if (r.stderr) {
          r.stderr.split('\n').filter(Boolean).forEach(line => {
            details.push({ kind: 'err', text: `    stderr:   ${line}` });
          });
        }
        if (r.exitCode !== undefined && r.exitCode !== 0) {
          details.push({ kind: 'err', text: `    exit:     ${r.exitCode}` });
        }
        return [header, ...details];
      });
      appendLog([
        ...caseLines,
        {
          kind: res.passed ? 'pass' : 'fail',
          text: `[${ts2}] ${res.passed ? '✓' : '✕'}  результат: ${res.passedCount}/${res.totalCount} тестів пройдено`,
        },
      ]);
      setTestResult(res);
      onTestComplete(res);
    } catch (e: unknown) {
      const ts2 = nowTs();
      const msg = e instanceof Error ? e.message : String(e);
      appendLog([
        { kind: 'err',  text: `[${ts2}] ✕  помилка: ${msg}` },
        { kind: 'done', text: `[${ts2}] — запит не вдався` },
      ]);
    } finally {
      setRunState('idle');
    }
  }

  function handleClear() {
    setLog([]);
    setTestResult(null);
  }

  const busy = runState !== 'idle';

  return (
    <div className="st-code-pane">

      {/* ── LEFT: Monaco editor ── */}
      <div className="st-code-panel">
        <PanelHeader lang={q.lang} label="// редактор" />
        <div className="st-monaco-wrap">
          <MonacoEditor
            height="100%"
            language={monacoLang}
            value={code}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontLigatures: true,
              lineHeight: 22,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              tabSize: 4,
              insertSpaces: true,
              automaticLayout: true,
              padding: { top: 14, bottom: 14 },
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              bracketPairColorization: { enabled: true },
              suggest: { preview: true },
              readOnly: disabled,
            }}
          />
        </div>
        <div className="st-code-hint">
          // не змінюй назву та сигнатуру функції solution — бекенд викликає її автоматично
        </div>
      </div>

      {/* ── RIGHT: console + button ── */}
      <div className="st-code-right">

        {/* Button bar — above console */}
        <div className="st-code-btn-bar">
          <button className="st-btn-test" onClick={handleTestCases} disabled={busy || disabled}>
            {runState === 'testing' ? '⌛ перевірка...' : '✓ перевірити тести'}
          </button>
        </div>

        {/* Console */}
        <div className="st-console-header">
          <div className="st-panel-dots">
            <span className="st-dot red" />
            <span className="st-dot yellow" />
            <span className="st-dot green" />
          </div>
          <span className="st-panel-label">// консоль</span>
          <button className="st-console-clear" onClick={handleClear} title="очистити">⌫ очистити</button>
        </div>
        <div className="st-console-body" ref={consoleRef}>
          {log.length === 0 ? (
            <div className="st-console-empty">
              <span className="st-console-prompt">$</span>
              <span className="st-console-cursor" />
            </div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className={`st-console-line st-console-${entry.kind}`}>
                {entry.text}
              </div>
            ))
          )}
        </div>

        {/* Result banner — shown after testCode completes */}
        {testResult && (
          <div className={`st-result-banner ${testResult.passed ? 'pass' : 'fail'}`}>
            <div className="st-result-banner-msg">
              {testResult.passed
                ? `✓ усі ${testResult.totalCount} тести пройдено — код правильний`
                : `✕ ${testResult.passedCount} з ${testResult.totalCount} тестів — код невірний`}
            </div>
            {!testResult.passed && (
              <div className="st-result-banner-actions">
                <button className="st-result-proceed" onClick={onProceed}>
                  завершити з цим результатом
                </button>
                <button className="st-result-retry" onClick={() => setTestResult(null)}>
                  спробувати ще раз
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── FlashCard (single card) ── */
function FlashCard({ q, answer, setAnswer, disabled }: {
  q: ParsedQuestion; answer: AnswerValue | undefined; setAnswer: (v: AnswerValue) => void; disabled?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const known = answer as boolean | undefined;
  const back = q.explanation ?? '(визначення не задано)';

  const mark = (val: boolean) => {
    if (disabled) return;
    setAnswer(val);
    setFlipped(false);
  };

  return (
    <div className="st-flashcard-wrap">
      <div className="st-flashcard-scene" onClick={() => { if (!disabled) setFlipped(f => !f); }}>
        <div className={`st-flashcard-inner${flipped ? ' flipped' : ''}`}>
          <div className="st-flashcard-face st-flashcard-front">
            <div className="st-card-label">// термін</div>
            <div className="st-card-term">{q.question}</div>
            <div className="st-card-hint">// натисніть, щоб побачити визначення</div>
          </div>
          <div className="st-flashcard-face st-flashcard-back">
            <div className="st-card-label">// визначення</div>
            <div className="st-card-def">{back}</div>
          </div>
        </div>
      </div>

      {flipped && known === undefined && (
        <div className="st-flashcard-controls">
          <button className="st-fc-btn dunno" onClick={() => mark(false)}>✕ Не знаю</button>
          <button className="st-fc-btn know"  onClick={() => mark(true)}>✓ Знаю</button>
        </div>
      )}

      {known !== undefined && (
        <div className="st-fc-result" style={{ color: known ? 'var(--accent)' : 'var(--red)' }}>
          {known ? '✓ Знаю' : '✕ Не знаю'} · натисніть картку, щоб переглянути знову
        </div>
      )}
    </div>
  );
}

/* ── Detailed results screen ── */
function DetailedResults({ breakdown, finishData, serverEarnedPoints, serverMaxPoints, taskTitle, onRestart, onBack, onViewAttempt, backLabel }: {
  breakdown: QuestionGrade[];
  finishData: AttemptResponse | null;
  serverEarnedPoints?: number;
  serverMaxPoints?: number;
  taskTitle: string;
  onRestart: () => void;
  onBack: () => void;
  onViewAttempt?: () => void;
  backLabel?: string;
}) {
  const localEarned = breakdown.reduce((s, g) => s + g.earnedPoints, 0);
  const localMax    = breakdown.reduce((s, g) => s + g.maxPoints, 0);
  const totalEarned = serverEarnedPoints ?? localEarned;
  const totalMax    = serverMaxPoints    ?? localMax;
  const pct  = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;
  const deg  = `${pct * 3.6}deg`;
  const pctColor = pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';
  const fmtPts = (n: number) => n % 1 === 0 ? String(n) : Number(n.toFixed(2)).toString();

  return (
    <div className="st-results-screen st-results-detailed">
      <div className="st-results-ring" style={{ '--pct': deg } as React.CSSProperties}>
        <div className="st-results-score" style={{ color: pctColor }}>{pct}%</div>
        <div className="st-results-score-sub">результат</div>
      </div>
      <div className="st-results-title">Завдання виконано</div>
      <div className="st-results-sub">
        {taskTitle} · {fmtPts(totalEarned)} / {totalMax} балів
        {finishData?.durationSeconds != null && ` · ${fmtDuration(finishData.durationSeconds)}`}
      </div>

      <div className="st-grade-list">
        {breakdown.map((g, i) => {
          const full    = !g.skipped && g.earnedPoints >= g.maxPoints;
          const partial = !g.skipped && g.earnedPoints > 0 && g.earnedPoints < g.maxPoints;
          const ptsClass = full ? 'full' : partial ? 'partial' : 'zero';

          return (
            <div key={g.qId} className="st-grade-row">
              <div className="st-grade-row-header">
                <span className="st-grade-idx">{i + 1}.</span>
                <span className="st-grade-q">{g.question}</span>
                <span className={`st-grade-pts ${ptsClass}`}>
                  {fmtPts(g.earnedPoints)} / {g.maxPoints} б
                </span>
              </div>
              <div className="st-grade-detail">
                {g.skipped && <span className="gd-muted">// пропущено</span>}
                {!g.skipped && g.type === 'Coding' && !g.codeTestResult &&
                  <span className="gd-muted">// тести не запускались</span>}
                {!g.skipped && g.type === 'Coding' && g.codeTestResult && (
                  <span className={g.codeTestResult.passed ? 'gd-pass' : 'gd-fail'}>
                    {g.codeTestResult.passed ? '✓' : '✕'} Тест: {g.codeTestResult.passedCount}/{g.codeTestResult.totalCount} кейсів
                  </span>
                )}
                {!g.skipped && g.type === 'Open' && (
                  <span className="gd-ai">{g.aiFeedback ?? '// оцінка AI недоступна'}</span>
                )}
                {!g.skipped && g.type !== 'Coding' && g.type !== 'Open' && (
                  <span className={g.isCorrect === true ? 'gd-pass' : g.isCorrect === false ? 'gd-fail' : 'gd-muted'}>
                    {g.isCorrect === true ? '✓ Правильно' : g.isCorrect === false ? '✕ Неправильно' : '— не перевірено'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="st-results-actions">
        <button className="st-btn-ghost" onClick={onRestart}>↺ Пройти знову</button>
        {onViewAttempt && (
          <button className="st-btn-ghost" onClick={onViewAttempt}>◎ Переглянути відповіді</button>
        )}
        <button className="st-btn-primary" onClick={onBack}>{backLabel ?? '← До мого контенту'}</button>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function SolveTaskPage({ task, onBack, onViewAttempt, previewMode = false, shareId, resumeAttemptId, contextType = 'Personal', contextId }: Props) {
  const { accessToken, user } = useAuth();
  const token = accessToken ?? '';

  const questions = useMemo(
    () => [...task.taskItems]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map(item => parseQuestion(item, task.language)),
    [task],
  );

  const isFlashCardTask = questions.length > 0 && questions.every(q => q.type === 'FlashCards');

  const [qIdx,          setQIdx]          = useState(0);
  const [answers,       setAnswers]       = useState<Record<string, AnswerValue>>({});
  const [answerResults, setAnswerResults] = useState<Record<string, AttemptAnswerResponse>>({});
  const [done,           setDone]           = useState(false);
  const [finishData,     setFinishData]     = useState<AttemptResponse | null>(null);
  const [codeTestResults, setCodeTestResults] = useState<Record<string, TestCasesResponse>>({});
  const [isGrading,          setIsGrading]          = useState(false);
  const [gradeBreakdown,     setGradeBreakdown]     = useState<QuestionGrade[] | null>(null);
  const [serverEarnedPoints, setServerEarnedPoints] = useState<number | undefined>(undefined);
  const [serverMaxPoints,    setServerMaxPoints]    = useState<number | undefined>(undefined);
  const [openAiGrades,       setOpenAiGrades]       = useState<Record<string, { score: number; feedback: string }>>({});
  const [serverAnswerMap,    setServerAnswerMap]    = useState<Record<string, AttemptAnswerResponse>>({});
  const attemptIdRef  = useRef<string | null>(null);
  const finishingRef  = useRef(false);
  const time = useTimer();

  const [sessionTimeLimitSeconds, setSessionTimeLimitSeconds] = useState<number | null>(null);
  const [sessionStartedAt,        setSessionStartedAt]        = useState<string | null>(null);
  const [countdown,     setCountdown]     = useState<number | null>(null);
  const [timerExpired,  setTimerExpired]  = useState(false);
  const [inputsBlocked, setInputsBlocked] = useState(false);
  const [timeUpOverlay, setTimeUpOverlay] = useState(false);
  const [resumeBanner,  setResumeBanner]  = useState(false);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Set<string>>(new Set());

  /* Start or resume attempt on mount */
  useEffect(() => {
    if (isFlashCardTask || previewMode) return;
    if (resumeAttemptId) {
      attemptIdRef.current = resumeAttemptId;
      getAttemptById(token, resumeAttemptId)
        .then(detail => {
          if (detail.timeLimitSeconds) {
            const elapsed = (Date.now() - new Date(detail.startedAt).getTime()) / 1000;
            if (elapsed >= detail.timeLimitSeconds) {
              setTimerExpired(true);
              return;
            }
          }
          setSessionTimeLimitSeconds(detail.timeLimitSeconds ?? null);
          setSessionStartedAt(detail.startedAt);

          const restored: Record<string, AnswerValue> = {};
          const savedIds = new Set<string>();
          for (const ans of detail.answers) {
            if (ans.userAnswer !== null && ans.userAnswer !== '') {
              const q = questions.find(q => q.id === ans.taskItemId);
              if (q) {
                const val = deserializeAnswer(q, ans.userAnswer);
                if (val !== undefined) {
                  restored[q.id] = val;
                  savedIds.add(q.id);
                }
              }
            }
          }
          // Merge: keep any local changes the user made while loading
          setAnswers(prev => ({ ...restored, ...prev }));
          setSavedQuestionIds(savedIds);
          setResumeBanner(true);
        })
        .catch(console.error);
    } else {
      startAttempt(token, { taskId: task.id, contextType, contextId: contextId ?? null })
        .then(a => {
          attemptIdRef.current = a.id;
          setSessionTimeLimitSeconds(a.timeLimitSeconds ?? null);
          setSessionStartedAt(a.startedAt);
        })
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, token, isFlashCardTask, previewMode, resumeAttemptId]);

  /* Countdown timer — runs when timeLimitSeconds and startedAt are known */
  useEffect(() => {
    if (!sessionTimeLimitSeconds || !sessionStartedAt) return;
    const computeRemaining = () => {
      const elapsed = (Date.now() - new Date(sessionStartedAt).getTime()) / 1000;
      return Math.ceil(sessionTimeLimitSeconds - elapsed);
    };
    const initial = computeRemaining();
    if (initial <= 0) { setTimerExpired(true); return; }
    setCountdown(initial);
    const id = setInterval(() => {
      const rem = computeRemaining();
      if (rem <= 0) { clearInterval(id); setCountdown(0); setTimerExpired(true); }
      else setCountdown(rem);
    }, 1000);
    return () => clearInterval(id);
  }, [sessionTimeLimitSeconds, sessionStartedAt]);

  /* Handle timer expiry */
  useEffect(() => {
    if (!timerExpired) return;
    if (finishingRef.current) return;
    finishingRef.current = true;
    setInputsBlocked(true);
    setTimeUpOverlay(true);
    const doFinish = async () => {
      if (attemptIdRef.current) {
        try {
          const r = await finishAttempt(token, attemptIdRef.current);
          setFinishData(r);
          setServerEarnedPoints(r.earnedPoints);
          setServerMaxPoints(r.maxPoints);
        } catch (e: unknown) {
          if ((e as { status?: number })?.status !== 409) console.error(e);
        }
      }
      setGradeBreakdown(questions.map(q => {
        const result = answerResults[q.id];
        const skipped = answers[q.id] === undefined;
        if (q.type === 'Coding') {
          return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: result?.earnedPoints ?? 0, skipped, codeTestResult: codeTestResults[q.id] };
        }
        return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: result?.earnedPoints ?? 0, skipped, isCorrect: result?.isCorrect ?? null };
      }));
      setTimeUpOverlay(false);
      setDone(true);
    };
    void doFinish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerExpired]);

  /* FlashCard tasks are handled by FlashCardTrainer (except in preview mode — inline flow) */
  if (isFlashCardTask && !previewMode) {
    return (
      <FlashCardTrainer
        task={task}
        token={token}
        userId={user?.id ?? ''}
        onBack={onBack}
        autoResume={!!resumeAttemptId}
      />
    );
  }

  const q      = questions[qIdx];
  const answer = q ? answers[q.id] : undefined;

  const answeredCount = Object.keys(answers).length;
  const progress      = questions.length > 0 ? (qIdx / questions.length) * 100 : 0;

  const setAnswer = useCallback((val: AnswerValue) => {
    if (!q) return;
    setAnswers(prev => ({ ...prev, [q.id]: val }));
  }, [q]);

  /* Save answer to server; confirm with savedQuestionIds; handle 409 (time limit) */
  function fireSaveAnswer(questionIndex: number) {
    const qToSave = questions[questionIndex];
    const val = qToSave ? answers[qToSave.id] : undefined;
    if (!qToSave || val === undefined || !attemptIdRef.current) return;
    saveAnswer(token, attemptIdRef.current, {
      taskItemId: qToSave.id,
      userAnswer: serializeAnswer(qToSave, val),
      answeredAt: new Date().toISOString(),
    })
      .then(r => {
        setAnswerResults(prev => ({ ...prev, [qToSave.id]: r }));
        setSavedQuestionIds(prev => new Set([...prev, qToSave.id]));
      })
      .catch((e: unknown) => {
        if ((e as { status?: number })?.status === 409) {
          setInputsBlocked(true);
          setTimerExpired(true);
        } else {
          console.error(e);
        }
      });
  }

  /* Build QuestionView[] for the ViewAttemptPage — prefers server results after finish */
  function buildQuestionViews() {
    return questions.map(q => ({
      item:           task.taskItems.find(i => i.id === q.id)!,
      userAnswerJson: answers[q.id] !== undefined
        ? JSON.stringify(serializeAnswer(q, answers[q.id]))
        : (serverAnswerMap[q.id]?.userAnswer ?? null),
      isCorrect:    serverAnswerMap[q.id]?.isCorrect    ?? answerResults[q.id]?.isCorrect    ?? null,
      earnedPoints: serverAnswerMap[q.id]?.earnedPoints ?? (q.type === 'Open' ? (openAiGrades[q.id]?.score ?? null) : (answerResults[q.id]?.earnedPoints ?? null)),
      answerId:     serverAnswerMap[q.id]?.id           ?? '',
      aiExplanation: serverAnswerMap[q.id]?.aiExplanation ?? null,
    }));
  }

  async function handleFinish() {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setIsGrading(true);

    /* ── Preview mode: ephemeral grading, no DB writes ── */
    if (previewMode) {
      // Grade Open questions via AI
      const openEntries = await Promise.all(
        questions
          .filter(q => q.type === 'Open')
          .map(async q => {
            const val = answers[q.id];
            const userAnswerStr = typeof val === 'string' ? val : '';
            if (!userAnswerStr.trim()) {
              return [q.id, { score: 0, feedback: '// відповідь не надано' }] as const;
            }
            try {
              const res = await gradeAnswer(token, {
                question:   q.question,
                userAnswer: userAnswerStr,
                maxScore:   q.points,
              });
              return [q.id, res] as const;
            } catch {
              return [q.id, { score: 0, feedback: '// не вдалося оцінити' }] as const;
            }
          }),
      );
      const openGrades = Object.fromEntries(openEntries) as Record<string, { score: number; feedback: string }>;

      // Submit non-Open / non-Coding / non-FlashCards answers to ephemeral endpoint
      const ephemeralAnswerList: EphemeralAnswer[] = questions
        .filter(q => q.type !== 'Open' && q.type !== 'Coding' && q.type !== 'FlashCards' && answers[q.id] !== undefined)
        .map(q => ({
          taskItemId: q.id,
          answer: serializeAnswer(q, answers[q.id]),
        }));

      const ephemeralResultMap: Record<string, boolean | null> = {};
      let ephemeralEarned: number | undefined;
      let ephemeralMax: number | undefined;
      if (ephemeralAnswerList.length > 0 && shareId != null) {
        try {
          const result = await runShareAttempt(token, shareId, ephemeralAnswerList);
          for (const r of result.results) {
            ephemeralResultMap[r.taskItemId] = r.isCorrect;
          }
          ephemeralEarned = result.earnedPoints;
          ephemeralMax    = result.maxPoints;
        } catch (e) {
          console.error(e);
        }
      }

      const breakdown: QuestionGrade[] = questions.map(q => {
        const skipped = answers[q.id] === undefined;

        if (q.type === 'Coding') {
          const testRes = codeTestResults[q.id];
          const earned  = testRes
            ? (testRes.passed
                ? q.points
                : Math.round((testRes.passedCount / testRes.totalCount) * q.points))
            : 0;
          return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: earned, skipped: skipped || !testRes, codeTestResult: testRes };
        }

        if (q.type === 'Open') {
          const grade = openGrades[q.id];
          return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: skipped ? 0 : (grade?.score ?? 0), skipped, aiFeedback: skipped ? undefined : grade?.feedback };
        }

        if (q.type === 'FlashCards') {
          const known = !skipped && (answers[q.id] as boolean);
          return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: known ? q.points : 0, skipped, isCorrect: skipped ? null : known };
        }

        const isCorrect = skipped ? null : (ephemeralResultMap[q.id] ?? null);
        return {
          qId: q.id, type: q.type, question: q.question,
          maxPoints: q.points,
          earnedPoints: isCorrect === true ? q.points : 0,
          skipped,
          isCorrect,
        };
      });

      // Merge server totals (ephemeral endpoint only scores non-Open/Coding/Flash questions)
      // Add locally-computed Open, Coding, and FlashCards points on top.
      const localExtra = breakdown.reduce((sum, g) => {
        if (g.type === 'Open' || g.type === 'Coding' || g.type === 'FlashCards') {
          return { earned: sum.earned + g.earnedPoints, max: sum.max + g.maxPoints };
        }
        return sum;
      }, { earned: 0, max: 0 });
      if (ephemeralEarned !== undefined && ephemeralMax !== undefined) {
        setServerEarnedPoints(ephemeralEarned + localExtra.earned);
        setServerMaxPoints(ephemeralMax    + localExtra.max);
      }

      setGradeBreakdown(breakdown);
      setIsGrading(false);
      setDone(true);
      return;
    }

    // Await the current question's save so its result is in latestResults
    const qNow = questions[qIdx];
    const valNow = qNow ? answers[qNow.id] : undefined;
    let latestResults = { ...answerResults };
    if (qNow && valNow !== undefined && attemptIdRef.current) {
      try {
        const saved = await saveAnswer(token, attemptIdRef.current, {
          taskItemId: qNow.id,
          userAnswer: serializeAnswer(qNow, valNow),
          answeredAt: new Date().toISOString(),
        });
        console.log('[saveAnswer] backend response:', saved);
        latestResults = { ...latestResults, [qNow.id]: saved };
        setAnswerResults(latestResults);
      } catch (e) { console.error(e); }
    }

    // Grade all Open questions in parallel via AI
    const openEntries = await Promise.all(
      questions
        .filter(q => q.type === 'Open')
        .map(async q => {
          const val = answers[q.id];
          const userAnswerStr = typeof val === 'string' ? val : '';
          if (!userAnswerStr.trim()) {
            return [q.id, { score: 0, feedback: '// відповідь не надано' }] as const;
          }
          try {
            const res = await gradeAnswer(token, {
              question:   q.question,
              userAnswer: userAnswerStr,
              maxScore:   q.points,
            });
            return [q.id, res] as const;
          } catch {
            return [q.id, { score: 0, feedback: '// не вдалося оцінити' }] as const;
          }
        }),
    );
    const openGrades = Object.fromEntries(openEntries) as Record<string, { score: number; feedback: string }>;
    setOpenAiGrades(openGrades);

    // Persist AI grades for Open questions to DB via PATCH
    if (attemptIdRef.current) {
      await Promise.all(
        questions
          .filter(q => q.type === 'Open')
          .map(async q => {
            const grade    = openGrades[q.id];
            const answerId = latestResults[q.id]?.id;
            if (!answerId || !grade) return;
            try {
              await updateAnswerGrade(token, attemptIdRef.current!, answerId, {
                earnedPoints:  grade.score,
                aiExplanation: grade.feedback,
              });
            } catch (e) { console.error(e); }
          }),
      );
    }

    // Finish attempt, then fetch per-question results (isCorrect / earnedPoints set by server)
    if (attemptIdRef.current) {
      try {
        const r = await finishAttempt(token, attemptIdRef.current);
        setFinishData(r);
        setServerEarnedPoints(r.earnedPoints);
        setServerMaxPoints(r.maxPoints);

        // Fetch detailed per-question grades from server
        const detail = await getAttemptById(token, attemptIdRef.current);
        const srvMap = Object.fromEntries(detail.answers.map(a => [a.taskItemId, a]));
        setServerAnswerMap(srvMap);

        const breakdown: QuestionGrade[] = questions.map(q => {
          const srv     = srvMap[q.id];
          const skipped = answers[q.id] === undefined;

          if (q.type === 'Coding') {
            const testRes = codeTestResults[q.id];
            return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: srv?.earnedPoints ?? 0, skipped, codeTestResult: testRes };
          }
          if (q.type === 'Open') {
            const grade = openGrades[q.id];
            return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: srv?.earnedPoints ?? grade?.score ?? 0, skipped, aiFeedback: grade?.feedback ?? srv?.aiExplanation ?? undefined };
          }
          return { qId: q.id, type: q.type, question: q.question, maxPoints: q.points, earnedPoints: srv?.earnedPoints ?? 0, skipped, isCorrect: srv?.isCorrect ?? null };
        });

        setGradeBreakdown(breakdown);
      } catch (e) { console.error(e); }
    }

    setIsGrading(false);
    setDone(true);
  }

  const advance = () => {
    if (qIdx < questions.length - 1) {
      fireSaveAnswer(qIdx);
      setQIdx(qIdx + 1);
    } else {
      void handleFinish();
    }
  };

  function handleRestart() {
    setQIdx(0);
    setAnswers({});
    setAnswerResults({});
    setCodeTestResults({});
    setGradeBreakdown(null);
    setIsGrading(false);
    setDone(false);
    setFinishData(null);
    setServerEarnedPoints(undefined);
    setServerMaxPoints(undefined);
    setSessionTimeLimitSeconds(null);
    setSessionStartedAt(null);
    setCountdown(null);
    setTimerExpired(false);
    setInputsBlocked(false);
    setTimeUpOverlay(false);
    setResumeBanner(false);
    setSavedQuestionIds(new Set());
    setServerAnswerMap({});
    finishingRef.current = false;
    attemptIdRef.current = null;
    if (!previewMode) {
      startAttempt(token, { taskId: task.id, contextType, contextId: contextId ?? null })
        .then(a => {
          attemptIdRef.current = a.id;
          setSessionTimeLimitSeconds(a.timeLimitSeconds ?? null);
          setSessionStartedAt(a.startedAt);
        })
        .catch(console.error);
    }
  }

  const getDotClass = (i: number) => {
    if (i === qIdx) return 'current';
    const qId = questions[i]?.id;
    if (!qId) return '';
    if (savedQuestionIds.has(qId)) return 'saved';
    if (answers[qId] !== undefined) return 'answered';
    return '';
  };

  const renderQuestion = () => {
    if (!q) return null;
    const shared = { q, answer, setAnswer, disabled: inputsBlocked };
    switch (q.type) {
      case 'SingleChoice': return <SingleChoice {...shared} />;
      case 'MultiChoice':  return <MultiChoice  {...shared} />;
      case 'Ordering':     return <Ordering     {...shared} />;
      case 'Matching':     return <Matching     {...shared} />;
      case 'TrueFalse':    return <TrueFalse answer={answer} setAnswer={setAnswer} disabled={inputsBlocked} />;
      case 'FillBlank':    return <FillBlank  answer={answer} setAnswer={setAnswer} disabled={inputsBlocked} />;
      case 'Open':         return <OpenQuestion answer={answer} setAnswer={setAnswer} disabled={inputsBlocked} />;
      case 'Coding':       return <CodeEditor   {...shared} onProceed={advance} token={token} onTestComplete={r => setCodeTestResults(prev => ({ ...prev, [q.id]: r }))} />;
      case 'FlashCards':   return <FlashCard    {...shared} />;
      default:
        return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>// тип не підтримується</div>;
    }
  };

  /* ── topbar shared across question and results views ── */
  const pathLabel = previewMode
    ? 'Повідомлення'
    : contextType === 'Saved'
    ? 'Збережений контент'
    : contextType === 'Group'
    ? 'Контент групи'
    : 'Мій контент';

  const topbar = (
    <div className="st-topbar">
      <div className="st-topbar-title">
        <span className="st-path">SkillCode / {pathLabel} /</span> {task.title}
      </div>
      {!done && (
        <div className="st-topbar-meta">
          <span style={{ color: 'var(--text-faint)' }}>{task.language}</span>
          {countdown !== null && (
            <span className={`st-timer${countdown < 60 ? ' st-timer-urgent' : ''}`}>⏱ {fmtCountdown(countdown)}</span>
          )}
          <span style={{ color: 'var(--text-faint)' }}>{qIdx + 1} / {questions.length}</span>
        </div>
      )}
    </div>
  );

  /* ── grading spinner ── */
  if (isGrading) {
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-progress-strip">
          <div className="st-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="st-content">
          <div className="st-grading-screen">
            <div className="st-grading-spinner" />
            <div className="st-grading-title">// Ваші відповіді перевіряються та зберігаються...</div>
            <div className="st-grading-sub">Це може зайняти кілька секунд</div>
          </div>
        </div>
      </div>
    );
  }

  /* ── results view ── */
  if (done && gradeBreakdown) {
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-progress-strip">
          <div className="st-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="st-content">
          <DetailedResults
            breakdown={gradeBreakdown}
            finishData={finishData}
            serverEarnedPoints={serverEarnedPoints}
            serverMaxPoints={serverMaxPoints}
            taskTitle={task.title}
            onRestart={handleRestart}
            onBack={onBack}
            backLabel={
              previewMode
                ? '← До повідомлень'
                : contextType === 'Saved'
                ? '← До збереженого контенту'
                : contextType === 'Group'
                ? '← До контенту групи'
                : '← До мого контенту'
            }
            onViewAttempt={onViewAttempt && finishData
              ? () => onViewAttempt({ task, questions: buildQuestionViews(), finishData })
              : undefined
            }
          />
        </div>
      </div>
    );
  }

  /* ── empty task ── */
  if (!q) {
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-content">
          <div className="st-empty">
            <div style={{ fontSize: 24, color: 'var(--text-faint)' }}>◈</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>// питань немає</div>
            <button className="st-btn-ghost" onClick={onBack}>← назад</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── question view ── */
  return (
    <div className="st-wrapper">
      {topbar}

      <div className="st-progress-strip">
        <div className="st-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {resumeBanner && (
        <div className="st-resume-banner">
          <span>// Ви продовжуєте незавершену спробу</span>
          <button className="st-resume-banner-close" onClick={() => setResumeBanner(false)}>✕</button>
        </div>
      )}

      <div className="st-content">
        <div className="st-q-header">
          <div>
            <div className="st-q-meta">
              <span className="st-q-type-badge">// {q.typeLabel}</span>
              <span className="st-q-num">питання {qIdx + 1}</span>
            </div>
            <div className="st-q-text">{q.question}</div>
            {q.type === 'MultiChoice' && (
              <div className="st-q-subtext">// оберіть усі правильні варіанти</div>
            )}
            {q.type === 'Ordering' && (
              <div className="st-q-subtext">// перетягніть елементи у правильному порядку</div>
            )}
          </div>

          <div className="st-nav-dots">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`st-nav-dot ${getDotClass(i)}`}
                onClick={() => { if (i !== qIdx) { fireSaveAnswer(qIdx); setQIdx(i); } }}
                title={`Питання ${i + 1}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="st-answer-area" key={q.id}>
          {renderQuestion()}
        </div>
      </div>

      <div className="st-bottom-bar">
        <button
          className="st-btn-ghost"
          disabled={qIdx === 0 || inputsBlocked}
          onClick={() => { fireSaveAnswer(qIdx); setQIdx(qIdx - 1); }}
        >
          ← назад
        </button>

        <button className="st-btn-primary" disabled={inputsBlocked} onClick={advance}>
          {qIdx === questions.length - 1 ? 'завершити →' : 'далі →'}
        </button>

        <div className="st-bbar-spacer" />
        <button className="st-btn-skip" disabled={inputsBlocked} onClick={advance}>пропустити</button>
        <span className="st-q-progress-text">
          {answeredCount} / {questions.length} відповідей
        </span>
      </div>

      {timeUpOverlay && (
        <div className="st-timeup-overlay">
          <div className="st-timeup-box">
            <div className="st-timeup-title">⏱ Час вийшов</div>
            <div className="st-timeup-sub">// завершуємо спробу...</div>
          </div>
        </div>
      )}
    </div>
  );
}
