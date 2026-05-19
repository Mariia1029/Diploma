import { useState } from 'react';
import type { TaskDetailResponse, TaskItemResponse } from '../../types/task';
import type { TaskType } from '../../types/template';
import type { AttemptResponse } from '../../api/attemptsApi';
import { explainAttemptAnswer } from '../../api/attemptsApi';
import { useAuth } from '../../context/AuthContext';
import '../../styles/solve-task.css';
import '../../styles/view-attempt.css';

/* ── Exported types (used by SolveTaskPage to build the data) ── */
export interface QuestionView {
  item: TaskItemResponse;
  userAnswerJson: string | null;
  isCorrect: boolean | null;
  earnedPoints: number | null;
  answerId: string;
  aiExplanation: string | null;
}

export interface ViewAttemptInput {
  task: TaskDetailResponse;
  questions: QuestionView[];
  finishData: AttemptResponse;
}

/* ── Props ── */
interface Props extends ViewAttemptInput {
  onBack: () => void;
}

/* ── Helpers ── */
interface OptionItem { label: string; text: string; }

function parseJson<T>(json: string | null): T | null {
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

function parseOptions(item: TaskItemResponse) {
  try { return item.options ? JSON.parse(item.options) : null; } catch { return null; }
}

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

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m === 0 ? `${s} с` : `${m} хв ${s} с`;
}

function fmtPts(n: number): string {
  return n % 1 === 0 ? String(n) : Number(n.toFixed(2)).toString();
}

/* ── Render user answer by type ── */
function UserAnswer({ item, userAnswerJson, isCorrect }: { item: TaskItemResponse; userAnswerJson: string | null; isCorrect: boolean | null }) {
  const opts = parseOptions(item);

  switch (item.type as TaskType) {
    case 'SingleChoice': {
      const selectedLabel = parseJson<string>(userAnswerJson);
      const options = opts as OptionItem[] | null;
      if (!options) return <span className="va-no-answer">// питання пропущено</span>;
      return (
        <>
          {options.map(o => {
            const sel = o.label === selectedLabel;
            const cls = sel ? (isCorrect === false ? 'wrong-selected' : 'selected') : 'unselected';
            return (
              <div key={o.label} className={`va-answer-option ${cls}`}>
                <span className="lbl">{o.label}</span>
                <span>{o.text}</span>
              </div>
            );
          })}
        </>
      );
    }

    case 'MultiChoice': {
      const selectedLabels = parseJson<string[]>(userAnswerJson) ?? [];
      const correctLabels  = parseJson<string[]>(item.correctAnswer ?? null) ?? [];
      const options = opts as OptionItem[] | null;
      if (!options) return <span className="va-no-answer">// питання пропущено</span>;
      return (
        <>
          {options.map(o => {
            const sel = selectedLabels.includes(o.label);
            let cls = 'unselected';
            if (sel) cls = correctLabels.includes(o.label) ? 'selected' : 'wrong-selected';
            return (
              <div key={o.label} className={`va-answer-option ${cls}`}>
                <span className="lbl">{o.label}</span>
                <span>{o.text}</span>
              </div>
            );
          })}
        </>
      );
    }

    case 'Ordering': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      const labels        = parseJson<string[]>(userAnswerJson) ?? [];
      const correctLabels = parseJson<string[]>(item.correctAnswer ?? null) ?? [];
      const options = opts as OptionItem[] | null;
      return (
        <>
          {labels.map((l, i) => {
            const correct = correctLabels[i] === l;
            const cls = isCorrect === false ? (correct ? 'selected' : 'wrong-selected') : 'selected';
            return (
              <div key={l} className={`va-answer-option ${cls}`}>
                <span className="lbl">{i + 1}.</span>
                <span>{options?.find(o => o.label === l)?.text ?? l}</span>
              </div>
            );
          })}
        </>
      );
    }

    case 'Matching': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      const pairs        = parseJson<{ left: string; right: string }[]>(userAnswerJson) ?? [];
      const correctPairs = parseJson<{ left: string; right: string }[]>(item.correctAnswer ?? null) ?? [];
      const m = opts as { left: OptionItem[]; right: OptionItem[] } | null;
      return (
        <>
          {pairs.map((p, i) => {
            const lt = m?.left.find(o => o.label === p.left)?.text ?? p.left;
            const rt = m?.right.find(o => o.label === p.right)?.text ?? p.right;
            const pairCorrect = correctPairs.some(cp => cp.left === p.left && cp.right === p.right);
            const wrong = isCorrect === false && !pairCorrect;
            return (
              <div key={i} className={`va-answer-pair${wrong ? ' wrong-pair' : ''}`}>
                <span>{lt}</span>
                <span className="arrow">→</span>
                <span>{rt}</span>
              </div>
            );
          })}
        </>
      );
    }

    case 'TrueFalse': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      const val = parseJson<boolean>(userAnswerJson);
      return (
        <span className={`va-tf-badge ${val ? 'true' : 'false'}`}>
          {val ? '✓ Правда' : '✕ Неправда'}
        </span>
      );
    }

    case 'FillBlank':
    case 'Open': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      return <div className="va-answer-text">{parseJson<string>(userAnswerJson) ?? ''}</div>;
    }

    case 'FlashCards': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      const known = parseJson<boolean>(userAnswerJson);
      return (
        <span className={`va-tf-badge ${known ? 'true' : 'false'}`}>
          {known ? '✓ Знаю' : '✕ Не знаю'}
        </span>
      );
    }

    case 'Coding': {
      if (!userAnswerJson) return <span className="va-no-answer">// питання пропущено</span>;
      return <pre className="va-answer-code">{parseJson<string>(userAnswerJson) ?? ''}</pre>;
    }

    default:
      return userAnswerJson
        ? <span className="va-answer-text">{userAnswerJson}</span>
        : <span className="va-no-answer">// питання пропущено</span>;
  }
}

/* ── Render the correct answer for a question type ── */
function CorrectAnswerContent({ item, correctAnswerJson }: { item: TaskItemResponse; correctAnswerJson: string }) {
  const opts = parseOptions(item);

  switch (item.type as TaskType) {
    case 'SingleChoice': {
      const correctLabel = parseJson<string>(correctAnswerJson);
      const options = opts as OptionItem[] | null;
      if (!options) return <span className="va-answer-text">{correctAnswerJson}</span>;
      return (
        <>
          {options.map(o => (
            <div key={o.label} className={`va-answer-option ${o.label === correctLabel ? 'correct-opt' : 'unselected'}`}>
              <span className="lbl">{o.label}</span>
              <span>{o.text}</span>
            </div>
          ))}
        </>
      );
    }

    case 'MultiChoice': {
      const correctLabels = parseJson<string[]>(correctAnswerJson) ?? [];
      const options = opts as OptionItem[] | null;
      if (!options) return <span className="va-answer-text">{correctAnswerJson}</span>;
      return (
        <>
          {options.map(o => (
            <div key={o.label} className={`va-answer-option ${correctLabels.includes(o.label) ? 'correct-opt' : 'unselected'}`}>
              <span className="lbl">{o.label}</span>
              <span>{o.text}</span>
            </div>
          ))}
        </>
      );
    }

    case 'Ordering': {
      const labels = parseJson<string[]>(correctAnswerJson) ?? [];
      const options = opts as OptionItem[] | null;
      return (
        <>
          {labels.map((l, i) => (
            <div key={l} className="va-answer-option correct-opt">
              <span className="lbl">{i + 1}.</span>
              <span>{options?.find(o => o.label === l)?.text ?? l}</span>
            </div>
          ))}
        </>
      );
    }

    case 'Matching': {
      const pairs = parseJson<{ left: string; right: string }[]>(correctAnswerJson) ?? [];
      const m = opts as { left: OptionItem[]; right: OptionItem[] } | null;
      return (
        <>
          {pairs.map((p, i) => {
            const lt = m?.left.find(o => o.label === p.left)?.text ?? p.left;
            const rt = m?.right.find(o => o.label === p.right)?.text ?? p.right;
            return (
              <div key={i} className="va-answer-pair">
                <span>{lt}</span>
                <span className="arrow">→</span>
                <span>{rt}</span>
              </div>
            );
          })}
        </>
      );
    }

    case 'TrueFalse': {
      const val = parseJson<boolean>(correctAnswerJson);
      return (
        <span className={`va-tf-badge ${val ? 'true' : 'false'}`}>
          {val ? '✓ Правда' : '✕ Неправда'}
        </span>
      );
    }

    case 'FillBlank':
    case 'Open':
      return <div className="va-answer-text">{parseJson<string>(correctAnswerJson) ?? correctAnswerJson}</div>;

    case 'Coding':
      return <pre className="va-answer-code">{parseJson<string>(correctAnswerJson) ?? correctAnswerJson}</pre>;

    default:
      return <span className="va-answer-text">{correctAnswerJson}</span>;
  }
}

/* ── Correct answer section ── */
function CorrectAnswerValue({ q }: { q: QuestionView }) {
  if (q.isCorrect === true) {
    return <div className="va-footer-value muted">// ваша відповідь правильна ✓</div>;
  }
  if (q.isCorrect === null) {
    return <div className="va-footer-value muted">// перевіряється вручну</div>;
  }
  if (q.item.correctAnswer) {
    return (
      <div className="va-footer-value">
        <CorrectAnswerContent item={q.item} correctAnswerJson={q.item.correctAnswer} />
      </div>
    );
  }
  return <div className="va-footer-value muted">// дивіться AI-пояснення вище</div>;
}

/* ── Main page ── */
export default function ViewAttemptPage({ task, questions, finishData, onBack }: Props) {
  const { accessToken } = useAuth();
  const token = accessToken ?? '';

  const [qIdx,      setQIdx]      = useState(0);
  const [aiResults, setAiResults] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      questions
        .filter(q => q.aiExplanation)
        .map(q => [q.item.id, q.aiExplanation!]),
    ),
  );
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});

  const q   = questions[qIdx];
  const pct = finishData.maxPoints > 0
    ? Math.round((finishData.earnedPoints / finishData.maxPoints) * 100)
    : 0;

  async function handleAiExplain() {
    const id = q.item.id;
    if (aiResults[id] || aiLoading[id]) return;
    setAiLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await explainAttemptAnswer(token, finishData.id, q.answerId, {
        question:      q.item.question,
        userAnswer:    q.userAnswerJson,
        correctAnswer: q.item.correctAnswer ?? '',
        language:      task.language ?? null,
        options:       q.item.options ?? null,
      });
      setAiResults(prev => ({ ...prev, [id]: res.aiExplanation ?? '' }));
    } catch {
      setAiResults(prev => ({ ...prev, [id]: '// не вдалося отримати пояснення' }));
    } finally {
      setAiLoading(prev => ({ ...prev, [id]: false }));
    }
  }

  const getDotClass = (i: number) => {
    if (i === qIdx) return 'current';
    const qi = questions[i];
    if (qi.isCorrect === true)  return 'answered'; // reuse green dot style
    if (qi.isCorrect === false) return 'wrong-dot';
    return qi.userAnswerJson ? 'answered' : '';
  };

  const resultBadge = () => {
    if (q.isCorrect === true)  return <span className="va-result-badge correct">✓ Правильно</span>;
    if (q.isCorrect === false) return <span className="va-result-badge wrong">✕ Неправильно</span>;
    return <span className="va-result-badge neutral">— Не перевірено</span>;
  };

  if (!q) return null;

  return (
    <div className="st-wrapper">
      {/* ── Topbar ── */}
      <div className="st-topbar">
        <div className="st-topbar-title">
          <span className="st-path">SkillCode / Мій контент /</span> {task.title}
          <span style={{ color: 'var(--text-faint)', marginLeft: 10 }}>// перегляд спроби</span>
        </div>
        <div className="st-topbar-meta">
          <span style={{ color: 'var(--text-faint)' }}>{task.language}</span>
          <span style={{ color: pct >= 80 ? 'var(--accent)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)', fontWeight: 600 }}>
            {pct}%
          </span>
          <span style={{ color: 'var(--text-faint)' }}>
            {fmtPts(finishData.earnedPoints)} / {fmtPts(finishData.maxPoints)} балів
          </span>
          {finishData.durationSeconds != null && (
            <span style={{ color: 'var(--text-faint)' }}>⏱ {fmtDuration(finishData.durationSeconds)}</span>
          )}
        </div>
      </div>

      {/* ── Progress strip ── */}
      <div className="st-progress-strip">
        <div className="st-progress-fill" style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
      </div>

      {/* ── Content ── */}
      <div className="st-content">
        <div className="st-q-header">
          <div>
            <div className="st-q-meta">
              <span className="st-q-type-badge">// {TYPE_LABELS[q.item.type as TaskType] ?? q.item.type}</span>
              <span className="st-q-num">питання {qIdx + 1} з {questions.length}</span>
            </div>
            <div className="st-q-text">{q.item.question}</div>
          </div>

          <div className="st-nav-dots">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`st-nav-dot ${getDotClass(i)}`}
                onClick={() => setQIdx(i)}
                title={`Питання ${i + 1}`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="st-answer-area">
          {/* ── Result badge + points ── */}
          <div className="va-result-row">
            {resultBadge()}
            <span className="va-result-pts">
              <span>{(q.earnedPoints ?? 0) % 1 === 0 ? (q.earnedPoints ?? 0) : Number((q.earnedPoints ?? 0).toFixed(2))}</span> / {q.item.points} балів
            </span>
          </div>

          {/* ── User's answer ── */}
          <div className="va-answer-block">
            <div className="va-answer-label">// ваша відповідь:</div>
            <UserAnswer item={q.item} userAnswerJson={q.userAnswerJson} isCorrect={q.isCorrect} />
          </div>

          {/* ── AI explanation ── */}
          <div className="va-ai-section">
            <button
              className="va-ai-btn"
              disabled={!!aiLoading[q.item.id]}
              onClick={handleAiExplain}
            >
              {aiLoading[q.item.id] ? '⌛ завантаження...' : '◎ Детальне пояснення від AI'}
            </button>
            {aiLoading[q.item.id] && (
              <div className="va-ai-loading">// запит до AI...</div>
            )}
            {aiResults[q.item.id] && (
              <div className="va-ai-result">{aiResults[q.item.id]}</div>
            )}
          </div>

          {/* ── Footer: correct answer + creator explanation ── */}
          <div className="va-footer">
            <div className="va-footer-item">
              <div className="va-footer-label">// правильна відповідь:</div>
              <CorrectAnswerValue q={q} />
            </div>

            <div className="va-footer-item">
              <div className="va-footer-label">// пояснення від автора:</div>
              {q.item.explanation
                ? <div className="va-footer-value">{q.item.explanation}</div>
                : <div className="va-footer-value muted">// не задано</div>
              }
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="st-bottom-bar">
        <button
          className="st-btn-ghost"
          disabled={qIdx === 0}
          onClick={() => setQIdx(qIdx - 1)}
        >
          ← назад
        </button>

        {qIdx < questions.length - 1
          ? <button className="st-btn-primary" onClick={() => setQIdx(qIdx + 1)}>далі →</button>
          : <button className="st-btn-primary" onClick={onBack}>завершити перегляд ✓</button>
        }

        <div className="st-bbar-spacer" />
        <span className="st-q-progress-text">
          {questions.filter(q => q.userAnswerJson !== null).length} / {questions.length} відповідей
        </span>
      </div>
    </div>
  );
}
