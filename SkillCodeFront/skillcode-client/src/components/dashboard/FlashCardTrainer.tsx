import { useState, useEffect } from 'react';
import type { TaskDetailResponse } from '../../types/task';
import { startAttempt, saveAnswer, finishAttempt } from '../../api/attemptsApi';
import '../../styles/solve-task.css';

interface Props {
  task: TaskDetailResponse;
  token: string;
  userId: string;
  onBack: () => void;
  autoResume?: boolean;
  contextType?: string;
  previewMode?: boolean;
}

type CardState = 'know' | 'donno';

interface SessionState {
  attemptId: string;
  round: number;
  cardStates: Record<string, CardState>;
  currentRoundCards: string[];
  cardIdx: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sessionKey(userId: string, taskId: string) {
  return `sc_flashcards_${userId}_${taskId}`;
}

function loadSession(userId: string, taskId: string): SessionState | null {
  try {
    const raw = localStorage.getItem(sessionKey(userId, taskId));
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

function persistSession(userId: string, taskId: string, s: SessionState) {
  localStorage.setItem(sessionKey(userId, taskId), JSON.stringify(s));
}

function clearSession(userId: string, taskId: string) {
  localStorage.removeItem(sessionKey(userId, taskId));
}

type Phase = 'init' | 'modal' | 'training' | 'saving' | 'done';

export default function FlashCardTrainer({ task, token, userId, onBack, autoResume, contextType = 'Personal', previewMode = false }: Props) {
  const items = task.taskItems.slice().sort((a, b) => a.orderIndex - b.orderIndex);

  const [phase,     setPhase]     = useState<Phase>('init');
  const [session,   setSession]   = useState<SessionState | null>(null);
  const [flipped,   setFlipped]   = useState(false);
  const [doneStats, setDoneStats] = useState<{ known: number; total: number; rounds: number } | null>(null);

  useEffect(() => {
    const saved = loadSession(userId, task.id);
    if (saved) {
      setSession(saved);
      setPhase(autoResume ? 'training' : 'modal');
    } else {
      void beginFresh();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function beginFresh() {
    try {
      let attemptId = 'preview';
      if (!previewMode) {
        const attempt = await startAttempt(token, { taskId: task.id, contextType, contextId: null });
        attemptId = attempt.id;
      }
      const s: SessionState = {
        attemptId,
        round:             1,
        cardStates:        Object.fromEntries(items.map(i => [i.id, 'donno' as CardState])),
        currentRoundCards: shuffle(items.map(i => i.id)),
        cardIdx:           0,
      };
      setSession(s);
      persistSession(userId, task.id, s);
      setPhase('training');
    } catch (e) { console.error(e); }
  }

  function handleRestore() {
    setPhase('training');
  }

  function handleDiscard() {
    clearSession(userId, task.id);
    setSession(null);
    void beginFresh();
  }

  function markCard(known: boolean) {
    if (!session) return;
    const cardId = session.currentRoundCards[session.cardIdx];
    if (!cardId) return;

    const newStates: Record<string, CardState> = { ...session.cardStates, [cardId]: known ? 'know' : 'donno' };
    const isLastInRound = session.cardIdx === session.currentRoundCards.length - 1;

    if (isLastInRound) {
      const remaining = session.currentRoundCards.filter(id => newStates[id] === 'donno');
      if (remaining.length === 0) {
        const finalSession: SessionState = { ...session, cardStates: newStates };
        setSession(finalSession);
        persistSession(userId, task.id, finalSession);
        void completeTrainer(finalSession);
      } else {
        const nextSession: SessionState = {
          ...session,
          round:             session.round + 1,
          cardStates:        newStates,
          currentRoundCards: shuffle(remaining),
          cardIdx:           0,
        };
        setSession(nextSession);
        persistSession(userId, task.id, nextSession);
        setFlipped(false);
      }
    } else {
      const nextSession: SessionState = {
        ...session,
        cardStates: newStates,
        cardIdx:    session.cardIdx + 1,
      };
      setSession(nextSession);
      persistSession(userId, task.id, nextSession);
      setFlipped(false);
    }
  }

  async function completeTrainer(finalSession: SessionState) {
    setPhase('saving');
    if (!previewMode) {
      for (const item of items) {
        try {
          await saveAnswer(token, finalSession.attemptId, {
            taskItemId: item.id,
            userAnswer: finalSession.cardStates[item.id] === 'know',
            answeredAt: new Date().toISOString(),
          });
        } catch (e) { console.error(e); }
      }
      try {
        await finishAttempt(token, finalSession.attemptId);
      } catch (e) { console.error(e); }
    }

    clearSession(userId, task.id);
    setDoneStats({
      known:  items.filter(i => finalSession.cardStates[i.id] === 'know').length,
      total:  items.length,
      rounds: finalSession.round,
    });
    setPhase('done');
  }

  function handleExit() {
    if (session) persistSession(userId, task.id, session);
    onBack();
  }

  async function handleRestart() {
    clearSession(userId, task.id);
    setSession(null);
    setDoneStats(null);
    setFlipped(false);
    setPhase('init');
    await beginFresh();
  }

  const pathLabel = previewMode
    ? 'Повідомлення'
    : contextType === 'Saved'
    ? 'Збережений контент'
    : contextType === 'Group'
    ? 'Контент групи'
    : 'Мій контент';

  const backLabel = previewMode
    ? '← До повідомлень'
    : contextType === 'Saved'
    ? '← До збереженого'
    : contextType === 'Group'
    ? '← До контенту групи'
    : '← До мого контенту';

  const topbar = (
    <div className="st-topbar">
      <div className="st-topbar-title">
        <span className="st-path">SkillCode / {pathLabel} /</span> {task.title}
      </div>
    </div>
  );

  /* ── init / saving spinner ── */
  if (phase === 'init' || phase === 'saving') {
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-content">
          <div className="st-grading-screen">
            <div className="st-grading-spinner" />
            <div className="st-grading-title">
              {phase === 'saving' ? '// Збереження результатів...' : '// Завантаження тренажера...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── restore modal ── */
  if (phase === 'modal' && session) {
    const knownSoFar = Object.values(session.cardStates).filter(s => s === 'know').length;
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-content">
          <div className="st-fc-restore-modal">
            <div className="st-fc-restore-title">// Знайдено незавершену сесію</div>
            <div className="st-fc-restore-sub">
              Раунд {session.round} · {knownSoFar} / {items.length} карток знаю
            </div>
            <div className="st-fc-restore-actions">
              <button className="st-btn-primary" onClick={handleRestore}>Продовжити</button>
              <button className="st-btn-ghost"   onClick={handleDiscard}>Почати знову</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── done screen ── */
  if (phase === 'done' && doneStats) {
    const roundWord = doneStats.rounds === 1 ? 'раунд' : doneStats.rounds < 5 ? 'раунди' : 'раундів';
    return (
      <div className="st-wrapper">
        {topbar}
        <div className="st-progress-strip">
          <div className="st-progress-fill" style={{ width: '100%' }} />
        </div>
        <div className="st-content">
          <div className="st-results-screen">
            <div className="st-fc-done-icon">✓</div>
            <div className="st-results-title">Тренажер завершено</div>
            <div className="st-results-sub">
              {task.title} · {doneStats.known} / {doneStats.total} карток · {doneStats.rounds} {roundWord}
            </div>
            <div className="st-results-actions">
              <button className="st-btn-ghost"   onClick={() => void handleRestart()}>↺ Пройти знову</button>
              <button className="st-btn-primary" onClick={onBack}>{backLabel}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── training ── */
  if (!session) return null;

  const currentCardId = session.currentRoundCards[session.cardIdx];
  const currentItem   = currentCardId ? (items.find(i => i.id === currentCardId) ?? null) : null;
  if (!currentItem) return null;

  const knownCount    = Object.values(session.cardStates).filter(s => s === 'know').length;
  const totalInRound  = session.currentRoundCards.length;
  const progressPct   = totalInRound > 0 ? (session.cardIdx / totalInRound) * 100 : 0;
  const cardBack      = currentItem.correctAnswer ?? '// визначення не задано';

  return (
    <div className="st-wrapper">
      <div className="st-topbar">
        <div className="st-topbar-title">
          <span className="st-path">SkillCode / {pathLabel} /</span> {task.title}
          {session.round > 1 && (
            <span style={{ color: 'var(--text-faint)', marginLeft: 10 }}>// раунд {session.round}</span>
          )}
        </div>
        <div className="st-topbar-meta">
          <span style={{ color: 'var(--text-faint)' }}>{task.language}</span>
          <span style={{ color: 'var(--accent)' }}>✓ {knownCount} / {items.length}</span>
          <span style={{ color: 'var(--text-faint)' }}>{session.cardIdx + 1} / {totalInRound}</span>
        </div>
      </div>

      <div className="st-progress-strip">
        <div className="st-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="st-content">
        <div className="st-q-header">
          <div>
            <div className="st-q-meta">
              <span className="st-q-type-badge">// флеш-картки</span>
              <span className="st-q-num">картка {session.cardIdx + 1} з {totalInRound}</span>
            </div>
          </div>
        </div>

        <div className="st-answer-area">
          <div className="st-flashcard-wrap">
            <div className="st-flashcard-scene" onClick={() => setFlipped(f => !f)}>
              <div className={`st-flashcard-inner${flipped ? ' flipped' : ''}`}>
                <div className="st-flashcard-face st-flashcard-front">
                  <div className="st-card-label">// термін</div>
                  <div className="st-card-term">{currentItem.question}</div>
                  <div className="st-card-hint">// натисніть, щоб побачити визначення</div>
                </div>
                <div className="st-flashcard-face st-flashcard-back">
                  <div className="st-card-label">// визначення</div>
                  <div className="st-card-def">{cardBack}</div>
                </div>
              </div>
            </div>

            {flipped ? (
              <div className="st-flashcard-controls">
                <button className="st-fc-btn dunno" onClick={() => markCard(false)}>✕ Не знаю</button>
                <button className="st-fc-btn know"  onClick={() => markCard(true)}>✓ Знаю</button>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>
                // натисніть картку, щоб перевернути
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="st-bottom-bar">
        <button className="st-btn-ghost" onClick={handleExit}>← вийти</button>
        <div className="st-bbar-spacer" />
        <span className="st-q-progress-text">{knownCount} / {items.length} знаю</span>
      </div>
    </div>
  );
}
