import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../common/Pagination';
import { getTemplates, createTemplate, deleteTemplate } from '../../api/templatesApi';
import type { TemplateDetailResponse, TemplateItemResponse, TaskType } from '../../types/template';
import { createTask, LANG_TO_ENUM, generateTask, LANG_TO_AI_LANG } from '../../api/tasksApi';
import type { CreateTaskItemRequest, AiGeneratedTaskItemResponse, GenerateTaskRequest } from '../../types/task';
import { ApiError } from '../../api/usersApi';
import TemplateCreateModal from './TemplateCreateModal';
import CustomSelect from '../common/CustomSelect';
import '../../styles/create-content.css';
import '../../styles/template-modal.css';

type Method = 'manual' | 'ai' | null;

const LANGS = ['Python', 'JavaScript', 'TypeScript', 'C#', 'C++', 'C', 'Java', 'Go', 'Rust'];
const STEP_LABELS = ['// метод', '// шаблон', '// деталі'];

const DEFAULT_CODE_FRAME: Record<string, string> = {
  Python:     'def solution():',
  JavaScript: 'function solution() {',
  TypeScript: 'function solution() {',
  'C#':       'public static void Solution() {',
  'C++':      'void solution() {',
  C:          'void solution() {',
  Java:       'public static void solution() {',
  Go:         'func solution() {',
  Rust:       'fn solution() {',
};

function defaultCodeFrame(lang: string): string {
  return DEFAULT_CODE_FRAME[lang] ?? DEFAULT_CODE_FRAME['Python'];
}
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  SingleChoice: 'Одна відповідь',
  MultiChoice:  'Кілька відповідей',
  Matching:     'Відповідність',
  Ordering:     'Послідовність',
  FillBlank:    'Заповнити пропуск',
  TrueFalse:    'Правда/Неправда',
  Open:         'Відкрита відповідь',
  FlashCards:   'Флеш-картки',
  Coding:       'Кодування',
};

interface FormState {
  title: string;
  desc: string;
  lang: string;
  topic: string;
  count: string;
  time: string;
}

/* ── task draft types ── */

interface OptionItem { label: string; text: string; }
interface MatchPair  { left: string; right: string; }
interface TestCase   { input: string[]; expected: string; }

interface TaskDraft {
  itemId: string;
  type: TaskType;
  question: string;
  explanation: string;
  points: number;
  options: OptionItem[];
  leftOptions: OptionItem[];
  rightOptions: OptionItem[];
  singleCorrect: string;
  multiCorrect: string[];
  orderCorrect: string[];
  matchPairs: MatchPair[];
  flashBack: string;
  codeFrame: string;
  testCases: TestCase[];
}

/* ── helpers ── */

function describeTemplate(tpl: TemplateDetailResponse): string {
  if (!tpl.items || tpl.items.length === 0) return '0 завдань';
  const TYPE_LABELS: Record<string, string> = {
    SingleChoice: 'одна відповідь', MultiChoice: 'кілька відповідей',
    Matching: 'відповідність',      Ordering: 'послідовність',
    FillBlank: 'заповнити пропуск', TrueFalse: 'правда/неправда',
    Open: 'відкрита відповідь',     FlashCards: 'флеш-картки',
    Coding: 'кодування',
  };
  const counts: Record<string, number> = {};
  for (const it of tpl.items) counts[it.type] = (counts[it.type] ?? 0) + 1;
  const parts = Object.entries(counts).map(([type, n]) => `${n} ${TYPE_LABELS[type] ?? type}`);
  return `${tpl.items.length} завдань: ${parts.join(', ')}`;
}

function nextAlpha(opts: OptionItem[]): string {
  const used = new Set(opts.map(o => o.label));
  for (let i = 0; i < ALPHA.length; i++) {
    if (!used.has(ALPHA[i])) return ALPHA[i];
  }
  return String(opts.length + 1);
}

function relabelAlpha(opts: OptionItem[]): { opts: OptionItem[]; map: Map<string, string> } {
  const map = new Map<string, string>();
  const relabeled = opts.map((o, i) => { const l = ALPHA[i]; map.set(o.label, l); return { ...o, label: l }; });
  return { opts: relabeled, map };
}

function relabelNumeric(opts: OptionItem[]): { opts: OptionItem[]; map: Map<string, string> } {
  const map = new Map<string, string>();
  const relabeled = opts.map((o, i) => { const l = String(i + 1); map.set(o.label, l); return { ...o, label: l }; });
  return { opts: relabeled, map };
}

function initDraft(item: TemplateItemResponse, lang = 'Python'): TaskDraft {
  const { type, id } = item;
  const base: TaskDraft = {
    itemId: id, type,
    question: '', explanation: '', points: 1,
    options: [], leftOptions: [], rightOptions: [],
    singleCorrect: '', multiCorrect: [], orderCorrect: [],
    matchPairs: [], flashBack: '',
    codeFrame: defaultCodeFrame(lang),
    testCases: [{ input: [], expected: '' }],
  };
  switch (type) {
    case 'SingleChoice':
      return { ...base,
        options: [{ label:'A',text:''},{label:'B',text:''},{label:'C',text:''},{label:'D',text:''}],
        singleCorrect: 'A' };
    case 'MultiChoice':
      return { ...base,
        options: [{ label:'A',text:''},{label:'B',text:''},{label:'C',text:''},{label:'D',text:''}],
        multiCorrect: ['A', 'B'] };
    case 'Ordering':
      return { ...base,
        options: [{ label:'1',text:''},{label:'2',text:''},{label:'3',text:''}],
        orderCorrect: ['1','2','3'] };
    case 'Matching':
      return { ...base,
        leftOptions:  [{ label:'1',text:''},{label:'2',text:''},{label:'3',text:''}],
        rightOptions: [{ label:'A',text:''},{label:'B',text:''},{label:'C',text:''}],
        matchPairs:   [{ left:'1',right:'A'},{left:'2',right:'B'},{left:'3',right:'C'}] };
    case 'TrueFalse':
      return { ...base, singleCorrect: 'true' };
    default:
      return base;
  }
}

/* ── allowed types based on template kind ── */

const TEST_TYPES: TaskType[] = ['SingleChoice','MultiChoice','Matching','Ordering','FillBlank','TrueFalse','Open'];

function getAllowedTypes(template: TemplateDetailResponse | null): TaskType[] {
  if (!template || template.items.length === 0) return TEST_TYPES;
  if (template.items.some(i => i.type === 'FlashCards')) return ['FlashCards'];
  if (template.items.some(i => i.type === 'Coding'))     return ['Coding'];
  return TEST_TYPES;
}

/* ── local id for user-added tasks (not from template) ── */

let _localSeq = 0;
function nextLocalId() { return `local-${++_localSeq}`; }

function newDraft(type: TaskType, lang = 'Python'): TaskDraft {
  return initDraft({ id: nextLocalId(), templateId: '', type, content: '', orderIndex: 0 }, lang);
}

/* ── serialization ── */

function serializeOptions(d: TaskDraft): string | null {
  switch (d.type) {
    case 'SingleChoice':
    case 'MultiChoice':
    case 'Ordering':
      return JSON.stringify(d.options);
    case 'Matching':
      return JSON.stringify({ left: d.leftOptions, right: d.rightOptions });
    case 'Coding':
      return d.codeFrame ? JSON.stringify({ signature: d.codeFrame }) : null;
    default:
      return null;
  }
}

function serializeCorrectAnswer(d: TaskDraft): string {
  switch (d.type) {
    case 'SingleChoice':
    case 'TrueFalse':
    case 'FillBlank':
      return JSON.stringify(d.singleCorrect);
    case 'MultiChoice':
      return JSON.stringify(d.multiCorrect);
    case 'Ordering':
      return JSON.stringify(d.orderCorrect);
    case 'Matching':
      return JSON.stringify(d.matchPairs);
    case 'FlashCards':
      return JSON.stringify(d.flashBack);
    case 'Coding':
      return JSON.stringify(d.testCases);
    default:
      return JSON.stringify('');
  }
}

function draftToItem(d: TaskDraft, index: number): CreateTaskItemRequest {
  return {
    orderIndex:    index,
    type:          d.type,
    question:      d.question,
    options:       serializeOptions(d),
    correctAnswer: serializeCorrectAnswer(d),
    multiAnswer:   d.type === 'MultiChoice',
    explanation:   d.explanation || null,
    points:        d.points,
  };
}

/* ── template content from draft structure (strips text, keeps shape) ── */

function draftToTemplateContent(d: TaskDraft): object {
  const empty = (opts: OptionItem[]) => opts.map(o => ({ label: o.label, text: '' }));
  switch (d.type) {
    case 'SingleChoice':
      return { question:'', options: empty(d.options), correct_answer: d.options[0]?.label ?? 'A', multi_answer:false, explanation:null };
    case 'MultiChoice':
      return { question:'', options: empty(d.options), correct_answer: d.options.slice(0,2).map(o => o.label), multi_answer:true, explanation:null };
    case 'Ordering':
      return { question:'', options: empty(d.options), correct_answer: d.options.map(o => o.label).join(','), multi_answer:false, explanation:null };
    case 'Matching':
      return {
        question:'',
        options: { left: empty(d.leftOptions), right: empty(d.rightOptions) },
        correct_answer: d.leftOptions.map((l, i) => ({ left: l.label, right: d.rightOptions[i]?.label ?? '' })),
        multi_answer:false, explanation:null,
      };
    case 'FillBlank':
      return { question:'Вкажіть пропущене слово: ____', options:null, correct_answer:'', multi_answer:false, explanation:null };
    case 'TrueFalse':
      return { question:'', options:null, correct_answer:'true', multi_answer:false, explanation:null };
    case 'Open':
      return { question:'', options:null, correct_answer:'', multi_answer:false, explanation:null };
    case 'FlashCards':
      return { question:'', options:null, correct_answer:'', multi_answer:false, explanation:null };
    case 'Coding':
      return { question:'', options: d.codeFrame || defaultCodeFrame('Python'), correct_answer: d.testCases.length > 0 ? d.testCases : [{ input: ['<arg1>'], expected: '<expected_output>' }], multi_answer:false, explanation:null };
  }
}

/* ── parse a field that may be a JSON string or already a parsed value ── */

function decodeUnicode(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function parseField<T>(val: unknown): T | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return null; }
  }
  return val as T;
}

function parseArr<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? (p as T[]) : []; } catch { return []; }
  }
  return [];
}

// converts {"A":"text","B":"text"} OR [{label,text}] → OptionItem[]
function toOptionItems(val: unknown): OptionItem[] {
  const v = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return null; } })() : val;
  if (!v) return [];
  if (Array.isArray(v)) return v as OptionItem[];
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, string>).map(([label, text]) => ({ label, text: String(text) }));
  }
  return [];
}

// converts {"A":"3","B":"1"} OR [{left,right}] → MatchPair[]
function toMatchPairs(val: unknown): MatchPair[] {
  const v = typeof val === 'string' ? (() => { try { return JSON.parse(val); } catch { return null; } })() : val;
  if (!v) return [];
  if (Array.isArray(v)) return v as MatchPair[];
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, string>).map(([left, right]) => ({ left, right: String(right) }));
  }
  return [];
}

/* ── convert AI-generated item response back to TaskDraft ── */

function taskItemToDraft(item: AiGeneratedTaskItemResponse, idx: number, lang = 'Python'): TaskDraft {
  const base: TaskDraft = {
    itemId: `ai-${idx}`,
    type: item.type,
    question: item.question,
    explanation: item.explanation ?? '',
    points: item.points,
    options: [], leftOptions: [], rightOptions: [],
    singleCorrect: '', multiCorrect: [], orderCorrect: [],
    matchPairs: [], flashBack: '',
    codeFrame: defaultCodeFrame(lang),
    testCases: [{ input: [], expected: '' }],
  };
  const opts = parseField<unknown>(item.options);
  const ans  = parseField<unknown>(item.correctAnswer);
  switch (item.type) {
    case 'SingleChoice':
      return { ...base, options: toOptionItems(opts), singleCorrect: (ans as string) ?? '' };
    case 'MultiChoice':
      return { ...base, options: toOptionItems(opts), multiCorrect: parseArr<string>(ans) };
    case 'Ordering':
      return { ...base, options: toOptionItems(opts), orderCorrect: parseArr<string>(ans) };
    case 'Matching': {
      const o = opts as { left?: unknown; right?: unknown } | null;
      return { ...base,
        leftOptions:  toOptionItems(o?.left),
        rightOptions: toOptionItems(o?.right),
        matchPairs:   toMatchPairs(ans) };
    }
    case 'TrueFalse':
      return { ...base, singleCorrect: (ans as string) ?? 'true' };
    case 'FillBlank':
      return { ...base, singleCorrect: (ans as string) ?? '' };
    case 'FlashCards':
      return { ...base, flashBack: (ans as string) ?? '' };
    case 'Coding': {
      const sig = (opts as { signature?: string } | null)?.signature ?? null;
      const cases = Array.isArray(ans) ? (ans as TestCase[]) : [{ input: [], expected: '' }];
      return { ...base, codeFrame: sig ?? defaultCodeFrame(lang), testCases: cases };
    }
    default:
      return base;
  }
}

/* ── Step bar ── */

function StepBar({ step }: { step: number }) {
  return (
    <div className="steps-row">
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
          <div className="step-item">
            <div className={`step-dot${i===step?' active':i<step?' done':''}`}>{i < step ? '✓' : i+1}</div>
            <div className={`step-label${i===step?' active':i<step?' done':''}`}>{label}</div>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`step-line${i < step ? ' done' : ''}`} style={{ flex: 1 }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Step 0: method ── */

function Step0({ method, setMethod, onNext }: {
  method: Method; setMethod: (m: Method) => void; onNext: () => void;
}) {
  return (
    <div className="wizard-section">
      <div className="wiz-section-title">
        Оберіть метод створення <span className="wiz-comment">// step 1/3</span>
      </div>
      <div className="method-grid">
        <div className={`method-card${method==='manual'?' method-selected':''}`} onClick={()=>setMethod('manual')}>
          {method==='manual' && <div className="selected-check">✓</div>}
          <div className="method-icon">✏</div>
          <div className="method-title">Самостійне створення</div>
          <div className="method-desc">Заповніть шаблон вручну — самі додаєте питання, варіанти відповідей та правильні відповіді.</div>
          <div className="method-tags">
            <span className="method-tag">повний контроль</span>
            <span className="method-tag">свій контент</span>
          </div>
        </div>
        <div className={`method-card${method==='ai'?' method-selected-ai':''}`} onClick={()=>setMethod('ai')}>
          {method==='ai' && <div className="selected-check ai">✓</div>}
          <div className="method-icon">⚡</div>
          <div className={`method-title${method==='ai'?' ai':''}`}>ШІ-генерація</div>
          <div className="method-desc">Вкажіть мову, шаблон і тему — ШІ автоматично згенерує завдання. Ви зможете переглянути та відредагувати результат.</div>
          <div className="method-tags">
            <span className="method-tag">швидко</span>
            <span className="method-tag">OpenAI GPT-4</span>
            <span className="method-tag">редагування</span>
          </div>
        </div>
      </div>
      <div className="action-bar">
        <div />
        <button className="btn-next" disabled={!method} onClick={onNext}>Далі →</button>
      </div>
    </div>
  );
}

/* ── Step 1: template selection ── */

function Step1({ method, template, setTemplate, templates, loadingTemplates, onNewTemplate, onDeleteTemplate, onBack, onNext }: {
  method: Method; template: string | null; setTemplate: (id: string) => void;
  templates: TemplateDetailResponse[]; loadingTemplates: boolean;
  onNewTemplate: () => void; onDeleteTemplate: (id: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  const isAI = method === 'ai';
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(templates.length / PAGE_SIZE);
  const paginated  = useMemo(
    () => templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [templates, page],
  );

  return (
    <div className="wizard-section">
      <div className="wiz-section-title">
        Оберіть шаблон <span className="wiz-comment">// step 2/3</span>
      </div>
      <div className="wiz-section-hint">// шаблон визначає кількість та набір типів завдань у комплексі</div>
      <div className="template-header">
        <div />
        <button className="btn-new-template" onClick={onNewTemplate}>
          <span className="btn-plus">+</span>Новий шаблон
        </button>
      </div>
      {loadingTemplates ? (
        <div style={{ fontSize:11, color:'var(--text-muted)', padding:'12px 0' }}>// завантаження шаблонів...</div>
      ) : templates.length === 0 ? (
        <div style={{ fontSize:11, color:'var(--text-faint)', padding:'12px 0' }}>// шаблони відсутні — створіть перший</div>
      ) : (
        <>
          <div className="template-grid">
            {paginated.map((t) => (
              <div key={t.id} className={`template-card${template===t.id?' tpl-selected':''}`} onClick={()=>setTemplate(t.id)}>
                {template===t.id && <div className="tpl-check">✓</div>}
                <div className="tpl-card-top">
                  <span className={`tpl-badge${t.isSystem ? ' tpl-badge-system' : ' tpl-badge-personal'}`}>
                    {t.isSystem ? '// system' : '// personal'}
                  </span>
                  {!t.isSystem && (
                    <button
                      className="tpl-delete-btn"
                      title="Видалити шаблон"
                      onClick={(e) => { e.stopPropagation(); onDeleteTemplate(t.id); }}
                    >×</button>
                  )}
                </div>
                <div className="template-name">{t.title}</div>
                <div className="template-desc">{describeTemplate(t)}</div>
                <div className="template-count">// {t.items.length} завдань</div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
      <div className="action-bar">
        <button className="btn-back" onClick={onBack}>← Назад</button>
        <button className={`btn-next${isAI?' ai':''}`} disabled={!template} onClick={onNext}>Далі →</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TASK EDITORS
══════════════════════════════════════════════ */

function OptionsList({ options, onUpdateText, onAdd, onRemove, labelHint }: {
  options: OptionItem[];
  onUpdateText: (i: number, val: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  labelHint?: string;
}) {
  return (
    <div className="options-section">
      <div className="task-sublabel">
        Варіанти {labelHint && <span className="task-hint">// {labelHint}</span>}
      </div>
      <div className="options-list">
        {options.map((opt, i) => (
          <div key={opt.label} className="option-row">
            <span className="option-label-badge">{opt.label}</span>
            <input
              className="wiz-input option-text-input"
              value={opt.text}
              onChange={(e) => onUpdateText(i, e.target.value)}
              placeholder="// текст варіанту"
            />
            <button className="option-rm-btn" onClick={() => onRemove(i)} disabled={options.length <= 2} title="Видалити варіант">×</button>
          </div>
        ))}
      </div>
      <button className="add-option-btn" onClick={onAdd}>+ Додати варіант</button>
    </div>
  );
}

function SingleChoiceEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  const options = parseArr<OptionItem>(draft.options);
  function updateText(i: number, val: string) {
    const opts = options.map((o, idx) => idx === i ? { ...o, text: val } : o);
    onUpdate({ ...draft, options: opts });
  }
  function addOpt() {
    const label = nextAlpha(options);
    onUpdate({ ...draft, options: [...options, { label, text: '' }] });
  }
  function removeOpt(i: number) {
    if (options.length <= 2) return;
    const filtered = options.filter((_, idx) => idx !== i);
    const { opts, map } = relabelAlpha(filtered);
    const correct = map.has(draft.singleCorrect) ? map.get(draft.singleCorrect)! : opts[0]?.label ?? '';
    onUpdate({ ...draft, options: opts, singleCorrect: correct });
  }
  return (
    <>
      <OptionsList options={options} onUpdateText={updateText} onAdd={addOpt} onRemove={removeOpt} />
      <div className="correct-section">
        <div className="task-sublabel">Правильна відповідь</div>
        <CustomSelect
          wrapClassName="select-wrap answer-select-wrap"
          triggerClassName="wiz-select"
          value={draft.singleCorrect}
          onChange={(v) => onUpdate({ ...draft, singleCorrect: v })}
          options={options.map(o => ({ value: o.label, label: o.label + (o.text ? ` — ${o.text}` : '') }))}
        />
      </div>
    </>
  );
}

function MultiChoiceEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  const options = parseArr<OptionItem>(draft.options);
  const multiCorrect = parseArr<string>(draft.multiCorrect);
  function updateText(i: number, val: string) {
    const opts = options.map((o, idx) => idx === i ? { ...o, text: val } : o);
    onUpdate({ ...draft, options: opts });
  }
  function addOpt() {
    const label = nextAlpha(options);
    onUpdate({ ...draft, options: [...options, { label, text: '' }] });
  }
  function removeOpt(i: number) {
    if (options.length <= 2) return;
    const removedLabel = options[i].label;
    const filtered = options.filter((_, idx) => idx !== i);
    const { opts, map } = relabelAlpha(filtered);
    const mc = multiCorrect
      .filter(l => l !== removedLabel)
      .map(l => map.get(l) ?? l);
    const safemc = mc.length >= 2 ? mc : [...mc, ...opts.filter(o => !mc.includes(o.label)).map(o => o.label)].slice(0, 2);
    onUpdate({ ...draft, options: opts, multiCorrect: safemc });
  }
  function setCorrect(i: number, val: string) {
    onUpdate({ ...draft, multiCorrect: multiCorrect.map((v, idx) => idx === i ? val : v) });
  }
  function addCorrect() {
    const unused = options.find(o => !multiCorrect.includes(o.label));
    if (unused) onUpdate({ ...draft, multiCorrect: [...multiCorrect, unused.label] });
  }
  function removeCorrect(i: number) {
    if (multiCorrect.length <= 2) return;
    onUpdate({ ...draft, multiCorrect: multiCorrect.filter((_, idx) => idx !== i) });
  }
  return (
    <>
      <OptionsList options={options} onUpdateText={updateText} onAdd={addOpt} onRemove={removeOpt} />
      <div className="correct-section">
        <div className="task-sublabel">Правильні відповіді</div>
        <div className="multi-correct-list">
          {multiCorrect.map((val, i) => (
            <div key={i} className="multi-correct-row">
              <CustomSelect
                wrapClassName="select-wrap answer-select-wrap"
                triggerClassName="wiz-select"
                value={val}
                onChange={(v) => setCorrect(i, v)}
                options={options.map(o => ({ value: o.label, label: o.label + (o.text ? ` — ${o.text}` : '') }))}
              />
              <button className="option-rm-btn" onClick={() => removeCorrect(i)} disabled={multiCorrect.length <= 1}>×</button>
            </div>
          ))}
          <button className="add-option-btn" onClick={addCorrect} disabled={multiCorrect.length >= options.length}>
            + Додати правильну відповідь
          </button>
        </div>
      </div>
    </>
  );
}

function OrderingEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  const options = parseArr<OptionItem>(draft.options);
  const orderCorrect = parseArr<string>(draft.orderCorrect);
  function updateText(i: number, val: string) {
    const opts = options.map((o, idx) => idx === i ? { ...o, text: val } : o);
    onUpdate({ ...draft, options: opts });
  }
  function addOpt() {
    const label = String(options.length + 1);
    onUpdate({ ...draft, options: [...options, { label, text: '' }], orderCorrect: [...orderCorrect, label] });
  }
  function removeOpt(i: number) {
    if (options.length <= 2) return;
    const removedLabel = options[i].label;
    const filtered = options.filter((_, idx) => idx !== i);
    const { opts, map } = relabelNumeric(filtered);
    const order = orderCorrect.filter(l => l !== removedLabel).map(l => map.get(l) ?? l);
    onUpdate({ ...draft, options: opts, orderCorrect: order });
  }
  function setOrder(i: number, val: string) {
    onUpdate({ ...draft, orderCorrect: orderCorrect.map((v, idx) => idx === i ? val : v) });
  }
  return (
    <>
      <OptionsList options={options} onUpdateText={updateText} onAdd={addOpt} onRemove={removeOpt} labelHint="1, 2, 3..." />
      <div className="correct-section">
        <div className="task-sublabel">Правильна послідовність</div>
        <div className="order-correct-list">
          {orderCorrect.map((val, i) => (
            <div key={i} className="order-correct-row">
              <span className="order-pos">{i + 1}.</span>
              <CustomSelect
                wrapClassName="select-wrap answer-select-wrap"
                triggerClassName="wiz-select"
                value={val}
                onChange={(v) => setOrder(i, v)}
                options={options.map(o => ({ value: o.label, label: o.label + (o.text ? ` — ${o.text}` : '') }))}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MatchingEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  const leftOptions  = parseArr<OptionItem>(draft.leftOptions);
  const rightOptions = parseArr<OptionItem>(draft.rightOptions);
  const matchPairs   = parseArr<MatchPair>(draft.matchPairs);
  function updateLeft(i: number, val: string) {
    onUpdate({ ...draft, leftOptions: leftOptions.map((o, idx) => idx === i ? { ...o, text: val } : o) });
  }
  function updateRight(i: number, val: string) {
    onUpdate({ ...draft, rightOptions: rightOptions.map((o, idx) => idx === i ? { ...o, text: val } : o) });
  }
  function addPair() {
    const leftLabel = String(leftOptions.length + 1);
    const rightLabel = nextAlpha(rightOptions);
    onUpdate({
      ...draft,
      leftOptions:  [...leftOptions,  { label: leftLabel,  text: '' }],
      rightOptions: [...rightOptions, { label: rightLabel, text: '' }],
      matchPairs:   [...matchPairs,   { left: leftLabel, right: rightLabel }],
    });
  }
  function removePair(i: number) {
    if (leftOptions.length <= 2) return;
    const filtLeft  = leftOptions.filter((_, idx) => idx !== i);
    const filtRight = rightOptions.filter((_, idx) => idx !== i);
    const filtPairs = matchPairs.filter((_, idx) => idx !== i);
    const { opts: newLeft,  map: leftMap  } = relabelNumeric(filtLeft);
    const { opts: newRight, map: rightMap } = relabelAlpha(filtRight);
    const newPairs = filtPairs.map(p => ({
      left:  leftMap.get(p.left)   ?? p.left,
      right: rightMap.get(p.right) ?? p.right,
    }));
    onUpdate({ ...draft, leftOptions: newLeft, rightOptions: newRight, matchPairs: newPairs });
  }
  function setPairLeft(i: number, val: string) {
    onUpdate({ ...draft, matchPairs: matchPairs.map((p, idx) => idx === i ? { ...p, left: val } : p) });
  }
  function setPairRight(i: number, val: string) {
    onUpdate({ ...draft, matchPairs: matchPairs.map((p, idx) => idx === i ? { ...p, right: val } : p) });
  }
  return (
    <>
      <div className="options-section">
        <div className="task-sublabel">Варіанти</div>
        <div className="matching-header">
          <span className="matching-col-label">Ліва частина</span>
          <span className="matching-col-label">Права частина</span>
          <span />
        </div>
        {leftOptions.map((lo, i) => (
          <div key={lo.label} className="matching-pair-row">
            <div className="match-side">
              <span className="option-label-badge">{lo.label}</span>
              <input className="wiz-input" value={lo.text} onChange={(e) => updateLeft(i, e.target.value)} placeholder="// ліва частина" />
            </div>
            <div className="match-side">
              <span className="option-label-badge">{rightOptions[i]?.label ?? ''}</span>
              <input className="wiz-input" value={rightOptions[i]?.text ?? ''} onChange={(e) => updateRight(i, e.target.value)} placeholder="// права частина" />
            </div>
            <button className="option-rm-btn" onClick={() => removePair(i)} disabled={leftOptions.length <= 2}>×</button>
          </div>
        ))}
        <button className="add-option-btn" onClick={addPair}>+ Додати пару</button>
      </div>
      <div className="correct-section">
        <div className="task-sublabel">Правильні відповідності</div>
        <div className="match-pairs-list">
          {matchPairs.map((pair, i) => (
            <div key={i} className="match-correct-row">
              <CustomSelect
                wrapClassName="select-wrap answer-select-wrap"
                triggerClassName="wiz-select"
                value={pair.left}
                onChange={(v) => setPairLeft(i, v)}
                options={leftOptions.map(o => ({ value: o.label, label: o.label + (o.text ? ` — ${o.text}` : '') }))}
              />
              <span className="match-arrow">→</span>
              <CustomSelect
                wrapClassName="select-wrap answer-select-wrap"
                triggerClassName="wiz-select"
                value={pair.right}
                onChange={(v) => setPairRight(i, v)}
                options={rightOptions.map(o => ({ value: o.label, label: o.label + (o.text ? ` — ${o.text}` : '') }))}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FillBlankEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  return (
    <div className="correct-section">
      <div className="task-sublabel">Правильна відповідь <span style={{ color: 'var(--red)' }}>*</span> <span className="task-hint">// пропущене слово або фраза</span></div>
      <input
        className="wiz-input"
        value={draft.singleCorrect}
        onChange={(e) => onUpdate({ ...draft, singleCorrect: e.target.value })}
        placeholder="// пропущене слово"
      />
    </div>
  );
}

function TrueFalseEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  return (
    <div className="correct-section">
      <div className="task-sublabel">Правильна відповідь</div>
      <CustomSelect
        wrapClassName="select-wrap answer-select-wrap"
        triggerClassName="wiz-select"
        value={draft.singleCorrect}
        onChange={(v) => onUpdate({ ...draft, singleCorrect: v })}
        options={[{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }]}
      />
    </div>
  );
}

function FlashCardsEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  return (
    <div className="wiz-field">
      <label className="task-sublabel">Зворотна сторона картки <span style={{ color: 'var(--red)' }}>*</span></label>
      <textarea
        className="wiz-textarea"
        value={draft.flashBack}
        onChange={(e) => onUpdate({ ...draft, flashBack: e.target.value })}
        placeholder="// визначення, відповідь або пояснення"
        style={{ minHeight: 60 }}
      />
    </div>
  );
}

function CodingEditor({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  function updateTestCase(i: number, field: 'input' | 'expected', val: string) {
    const cases = draft.testCases.map((tc, idx) => {
      if (idx !== i) return tc;
      if (field === 'input') {
        const parts = val.split(',').map(s => s.trim()).filter(Boolean);
        return { ...tc, input: parts };
      }
      return { ...tc, expected: val };
    });
    onUpdate({ ...draft, testCases: cases });
  }
  function addTestCase() {
    onUpdate({ ...draft, testCases: [...draft.testCases, { input: [], expected: '' }] });
  }
  function removeTestCase(i: number) {
    if (draft.testCases.length <= 1) return;
    onUpdate({ ...draft, testCases: draft.testCases.filter((_, idx) => idx !== i) });
  }

  return (
    <>
      <div className="wiz-field">
        <label className="task-sublabel">
          Шаблон коду <span className="task-hint">// необов'язково — каркас функції для студента</span>
        </label>
        <textarea
          className="wiz-textarea code-frame-textarea"
          value={draft.codeFrame}
          onChange={(e) => onUpdate({ ...draft, codeFrame: e.target.value })}
          placeholder="// def solution():\n//     pass"
          style={{ minHeight: 100 }}
          spellCheck={false}
        />
      </div>
      <div className="wiz-field">
        <label className="task-sublabel">
          Тест-кейси <span style={{ color: 'var(--red)' }}>*</span>
          <span className="task-hint"> // аргументи через кому → очікуваний результат</span>
        </label>
        {draft.testCases.map((tc, i) => (
          <div key={i} className="option-row" style={{ marginBottom: 6 }}>
            <span className="option-label-badge">{i + 1}</span>
            <input
              className="wiz-input"
              style={{ flex: 1 }}
              placeholder="// аргументи через кому, напр.: 5, 3"
              value={tc.input.join(', ')}
              onChange={(e) => updateTestCase(i, 'input', e.target.value)}
            />
            <span style={{ padding: '0 6px', color: 'var(--text-muted)', fontSize: 12 }}>→</span>
            <input
              className="wiz-input"
              style={{ flex: 1 }}
              placeholder="// очікуваний результат"
              value={tc.expected}
              onChange={(e) => updateTestCase(i, 'expected', e.target.value)}
            />
            <button className="option-rm-btn" onClick={() => removeTestCase(i)} disabled={draft.testCases.length <= 1}>×</button>
          </div>
        ))}
        <button className="add-option-btn" onClick={addTestCase}>+ Додати тест-кейс</button>
      </div>
    </>
  );
}

/* ── TaskStructureRow: simplified row used before AI generation ── */

function TaskStructureRow({ draft, index, total, allowedTypes, onChangeType, onMoveUp, onMoveDown, onRemove }: {
  draft: TaskDraft; index: number; total: number; allowedTypes: TaskType[];
  onChangeType: (type: TaskType) => void;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const singleType = allowedTypes.length === 1;
  return (
    <div className="task-list-row">
      <span className="task-row-index">{String(index + 1).padStart(2, '0')}</span>
      {singleType ? (
        <div className="task-row-select-wrap">
          <span className="task-row-select" style={{ cursor: 'default' }}>
            {TASK_TYPE_LABELS[draft.type]}
          </span>
        </div>
      ) : (
        <CustomSelect
          wrapClassName="task-row-select-wrap"
          triggerClassName="task-row-select"
          value={draft.type}
          onChange={(v) => onChangeType(v as TaskType)}
          options={allowedTypes.map(t => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
        />
      )}
      <div className="task-row-btns">
        <button className="task-row-btn" disabled={index === 0} onClick={onMoveUp} title="Вгору">↑</button>
        <button className="task-row-btn" disabled={index === total - 1} onClick={onMoveDown} title="Вниз">↓</button>
        <button className="task-row-btn del" onClick={onRemove} title="Видалити">×</button>
      </div>
    </div>
  );
}

/* ── TaskBody: dispatcher by type ── */

function TaskBody({ draft, onUpdate }: { draft: TaskDraft; onUpdate: (d: TaskDraft) => void }) {
  const isFlash = draft.type === 'FlashCards';
  return (
    <div className="task-body-inner">
      <div className="wiz-field">
        <label className="task-sublabel">
          {isFlash ? 'Лицьова сторона картки' : 'Питання'} <span style={{ color: 'var(--red)' }}>*</span>
        </label>
        <textarea
          className="wiz-textarea"
          value={draft.question}
          onChange={(e) => onUpdate({ ...draft, question: e.target.value })}
          placeholder={isFlash ? '// текст лицьової сторони' : '// текст питання'}
          style={{ minHeight: 60 }}
        />
        {draft.type === 'FillBlank' && (
          <div className="field-hint">// замість пропущеного слова використовуйте ____</div>
        )}
      </div>

      {draft.type === 'SingleChoice' && <SingleChoiceEditor draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'MultiChoice'  && <MultiChoiceEditor  draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'Ordering'     && <OrderingEditor      draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'Matching'     && <MatchingEditor      draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'FillBlank'    && <FillBlankEditor     draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'TrueFalse'    && <TrueFalseEditor     draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'FlashCards'   && <FlashCardsEditor    draft={draft} onUpdate={onUpdate} />}
      {draft.type === 'Coding'       && <CodingEditor        draft={draft} onUpdate={onUpdate} />}

      <div className="wiz-field explanation-field">
        <label className="task-sublabel">
          Пояснення <span className="task-hint">// необов'язково</span>
        </label>
        <textarea
          className="wiz-textarea"
          value={draft.explanation}
          onChange={(e) => onUpdate({ ...draft, explanation: e.target.value })}
          placeholder="// пояснення правильної відповіді..."
          style={{ minHeight: 50 }}
        />
      </div>
    </div>
  );
}

/* ── TaskCard ── */

function TaskCard({ draft, index, total, onUpdate, onMoveUp, onMoveDown, onRemove }: {
  draft: TaskDraft; index: number; total: number;
  onUpdate: (d: TaskDraft) => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onRemove: () => void;
}) {
  const isFlash = draft.type === 'FlashCards';
  return (
    <div className="task-card">
      <div className="task-card-header">
        <div className="task-card-left">
          <span className="task-card-num">{String(index + 1).padStart(2, '0')}</span>
          <span className="task-card-type">{TASK_TYPE_LABELS[draft.type]}</span>
        </div>
        <div className="task-card-right">
          <div className="task-move-btns">
              <button className="task-move-btn" disabled={index === 0} onClick={onMoveUp} title="Вгору">↑</button>
              <button className="task-move-btn" disabled={index === total - 1} onClick={onMoveDown} title="Вниз">↓</button>
              <button className="task-move-btn task-remove-btn" onClick={onRemove} title="Видалити завдання">×</button>
            </div>
          <div className="task-points">
            <span className="task-points-label">балів</span>
            {isFlash ? (
              <span className="task-points-fixed">1</span>
            ) : (
              <input
                type="number"
                className="task-points-input"
                min={0}
                value={draft.points}
                onChange={(e) => onUpdate({ ...draft, points: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
              />
            )}
          </div>
        </div>
      </div>
      <div className="task-card-body">
        <TaskBody draft={draft} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

/* ── Step 2: details ── */

function Step2({ method, form, setForm, selectedTemplate, token, onBack, onDone }: {
  method: Method; form: FormState; setForm: (f: FormState) => void;
  selectedTemplate: TemplateDetailResponse | null;
  token: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const isAI = method === 'ai';
  const update = (k: keyof FormState, v: string) => setForm({ ...form, [k]: v });

  const allowedTypes = getAllowedTypes(selectedTemplate);

  const [tasks, setTasks] = useState<TaskDraft[]>(() =>
    selectedTemplate
      ? [...selectedTemplate.items].sort((a, b) => a.orderIndex - b.orderIndex).map(initDraft)
      : []
  );
  const [addType, setAddType]               = useState<TaskType>(allowedTypes[0]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle]   = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [isAiGenerated, setIsAiGenerated]   = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [difficulty, setDifficulty]         = useState<'easy'|'medium'|'hard'>('easy');

  async function handleGenerate() {
    setError('');
    setGenerating(true);
    try {
      const req: GenerateTaskRequest = {
        topic:      form.topic.trim(),
        language:   LANG_TO_AI_LANG[form.lang] ?? 'python',
        difficulty,
        template: {
          title:       form.title.trim() || 'Generated',
          description: 'Генерувати всі запитання, варіанти відповідей та пояснення виключно українською мовою.',
          is_public:   false,
          items: tasks.map((t, i) => ({
            type:        t.type,
            order_index: i,
            content:     JSON.stringify(draftToTemplateContent(t)),
          })),
        },
      };
      const result = await generateTask(token, req);

      const drafts = [...result.taskItems]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((item, idx) => taskItemToDraft(item, idx, form.lang));
      setTasks(drafts);
      setIsAiGenerated(true);
      if (result.title) update('title', decodeUnicode(result.title));
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs = Object.values(err.errors).flat();
        setError(msgs[0] ?? `// помилка сервера (${err.status})`);
      } else {
        setError('// не вдалось згенерувати завдання');
      }
    } finally {
      setGenerating(false);
    }
  }

  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);

  function moveUp(i: number) {
    setTasks(prev => { const n = [...prev]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; });
  }
  function moveDown(i: number) {
    setTasks(prev => { const n = [...prev]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; });
  }
  function updateTask(i: number, d: TaskDraft) {
    setTasks(prev => prev.map((t, idx) => idx === i ? d : t));
  }
  function addTask() {
    setTasks(prev => [...prev, newDraft(addType, form.lang)]);
  }
  function removeTask(i: number) {
    setTasks(prev => prev.filter((_, idx) => idx !== i));
  }
  function changeTaskType(i: number, type: TaskType) {
    setTasks(prev => prev.map((t, idx) => idx === i ? { ...newDraft(type, form.lang), itemId: t.itemId } : t));
  }

  async function handleSubmit() {
    if (!form.title.trim()) return;
    if (saveAsTemplate && !templateTitle.trim()) {
      setError('// вкажіть назву шаблону');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const timeVal = Number(form.time);
      let templateId = selectedTemplate?.id ?? null;

      if (saveAsTemplate) {
        const created = await createTemplate(token, {
          title:       templateTitle.trim() || form.title.trim(),
          description: '',
          isPublic:    false,
          items:       tasks.map((t, i) => ({
            type:       t.type,
            orderIndex: i,
            content:    JSON.stringify(draftToTemplateContent(t)),
          })),
        });
        templateId = created.id;
      }

      await createTask(token, {
        title:            form.title.trim(),
        language:         LANG_TO_ENUM[form.lang] ?? 'Python',
        templateId,
        timeLimitSeconds: timeVal > 0 ? timeVal * 60 : null,
        aiGenerated:      isAiGenerated,
        taskItems:        tasks.map(draftToItem),
      });
      setSuccess(saveAsTemplate
        ? '// завдання та шаблон успішно створено'
        : '// завдання успішно створено',
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs = Object.values(err.errors).flat();
        setError(msgs[0] ?? `// помилка сервера (${err.status})`);
      } else {
        setError('// не вдалось створити завдання');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="submit-success-screen">
        <div className="submit-success-icon">✓</div>
        <div className="submit-success-msg">{success}</div>
        <button className="btn-next" onClick={onDone}>← На головну</button>
      </div>
    );
  }

  return (
    <div className="wizard-section">
      <div className="wiz-section-title">
        {isAI ? 'Деталі завдання' : 'Деталі завдання'}
        <span className="wiz-comment"> // step 3/3</span>
      </div>

      {isAI && (
        <div className="ai-panel">
          <div className="ai-header">
            <div className="ai-dot" />
            <div className="ai-title">
              {isAiGenerated ? '// ai.generated ✓' : '// ai.generate()'}
            </div>
            <div className="ai-comment">
              {isAiGenerated
                ? '// структура заблокована — контент редагується'
                : 'OpenAI GPT-4 · автогенерація'}
            </div>
          </div>
          {!isAiGenerated && (
            <div className="ai-note">
              {'// налаштуйте параметри та структуру завдань нижче, потім натисніть «⚡ Згенерувати»'}<br />
              {'// після генерації ви зможете переглянути та відредагувати кожне питання'}
            </div>
          )}
        </div>
      )}

      {generating && (
        <div className="ai-generating-bar">
          <div className="ai-gen-spinner" />
          <span className="ai-gen-text">// Generating your task, please wait...</span>
        </div>
      )}

      <div className="form-grid">
        <div className="wiz-field full">
          <label className="wiz-label">
            Назва <span style={{ color: 'var(--red)' }}>*</span>
          </label>
          <input
            type="text"
            className="wiz-input"
            placeholder="// наприклад: Цикли в Python"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            disabled={generating}
          />
        </div>

        <div className="wiz-field full">
          <label className="wiz-label">Опис</label>
          <textarea
            className="wiz-textarea"
            placeholder="// короткий опис змісту завдань..."
            value={form.desc}
            onChange={(e) => update('desc', e.target.value)}
            disabled={generating}
          />
        </div>

        <div className="wiz-field">
          <label className="wiz-label">Мова програмування</label>
          <CustomSelect
            wrapClassName="select-wrap"
            triggerClassName="wiz-select"
            value={form.lang}
            onChange={(v) => update('lang', v)}
            disabled={generating}
            options={LANGS.map(l => ({ value: l, label: l }))}
          />
        </div>

        <div className="wiz-field">
          <label className="wiz-label">
            Час <span className="wiz-label-hint">// хвилини, 0 = без ліміту</span>
          </label>
          <input
            type="number"
            className="wiz-input"
            placeholder="0"
            min={0}
            value={form.time}
            onChange={(e) => update('time', e.target.value)}
            disabled={generating}
          />
        </div>

        {isAI && (
          <div className="wiz-field full">
            <label className="wiz-label">
              Тема <span style={{ color: 'var(--red)' }}>*</span>
              <span className="wiz-label-hint"> // тема для генерації</span>
            </label>
            <input
              type="text"
              className="wiz-input"
              placeholder="// наприклад: рекурсія, цикли for та while"
              value={form.topic}
              onChange={(e) => update('topic', e.target.value)}
              disabled={generating || isAiGenerated}
            />
          </div>
        )}

        {isAI && (
          <div className="wiz-field">
            <label className="wiz-label">Складність</label>
            <CustomSelect
              wrapClassName="select-wrap"
              triggerClassName="wiz-select"
              value={difficulty}
              onChange={(v) => setDifficulty(v as 'easy' | 'medium' | 'hard')}
              disabled={generating || isAiGenerated}
              options={[
                { value: 'easy', label: 'easy' },
                { value: 'medium', label: 'medium' },
                { value: 'hard', label: 'hard' },
              ]}
            />
          </div>
        )}
      </div>

      {/* Before AI generation: structure-only rows (type + reorder/remove) */}
      {isAI && !isAiGenerated && (
        <div className="tasks-section">
          <div className="tasks-section-header">
            <span className="tasks-section-title">// структура завдань</span>
            <span className="wiz-comment">{tasks.length} завдань</span>
          </div>

          {tasks.length > 0 && (
            <div className="task-list">
              {tasks.map((draft, i) => (
                <TaskStructureRow
                  key={draft.itemId}
                  draft={draft}
                  index={i}
                  total={tasks.length}
                  allowedTypes={allowedTypes}
                  onChangeType={(type) => changeTaskType(i, type)}
                  onMoveUp={() => moveUp(i)}
                  onMoveDown={() => moveDown(i)}
                  onRemove={() => removeTask(i)}
                />
              ))}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="task-list-empty">// завдань ще немає — додайте хоча б одне</div>
          )}

          <div className="add-task-row" style={{ marginTop: 8 }}>
            <CustomSelect
              wrapClassName="select-wrap add-task-select-wrap"
              triggerClassName="wiz-select"
              value={addType}
              onChange={(v) => setAddType(v as TaskType)}
              disabled={generating}
              options={allowedTypes.map(t => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
            />
            <button className="add-task-btn" onClick={addTask} disabled={generating}>
              + Додати завдання
            </button>
          </div>
        </div>
      )}

      {/* After AI generation: full editors, locked structure */}
      {(!isAI || isAiGenerated) && tasks.length > 0 && (
        <div className="tasks-section">
          <div className="tasks-section-header">
            <span className="tasks-section-title">
              {isAI ? '// згенеровані завдання' : '// завдання'}
            </span>
            <span className="wiz-comment">{tasks.length} завдань</span>
          </div>

          {tasks.map((draft, i) => (
            <TaskCard
              key={draft.itemId}
              draft={draft}
              index={i}
              total={tasks.length}
              onUpdate={(d) => updateTask(i, d)}
              onMoveUp={() => moveUp(i)}
              onMoveDown={() => moveDown(i)}
              onRemove={() => removeTask(i)}
            />
          ))}

          {!isAI && (
            <div className="add-task-row">
              <CustomSelect
                wrapClassName="select-wrap add-task-select-wrap"
                triggerClassName="wiz-select"
                value={addType}
                onChange={(v) => setAddType(v as TaskType)}
                options={allowedTypes.map(t => ({ value: t, label: TASK_TYPE_LABELS[t] }))}
              />
              <button className="add-task-btn" onClick={addTask}>+ Додати завдання</button>
            </div>
          )}

          <div className="total-score-bar">
            <span className="total-score-label">// загальний бал:</span>
            <span className="total-score-value">{totalPoints}</span>
          </div>

          <div className="save-template-row">
            <label className="save-template-check">
              <input type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
              <span className="save-template-text">Зберегти як шаблон</span>
            </label>
            <span className="save-template-hint">// зберегти структуру як новий шаблон</span>
          </div>
          {saveAsTemplate && (
            <div className="wiz-field save-template-title-input">
              <label className="task-sublabel">
                Назва <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <input
                type="text"
                className="wiz-input"
                placeholder="// назва шаблону"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {!isAI && tasks.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-faint)', fontStyle: 'italic' }}>
          // завдання відсутні — шаблон не містить елементів
        </div>
      )}

      {error && <div className="wiz-error">{error}</div>}

      <div className="action-bar">
        <button className="btn-back" onClick={onBack} disabled={submitting || generating}>← Назад</button>
        {isAI && !isAiGenerated ? (
          <button
            className="btn-next ai"
            disabled={!form.topic.trim() || tasks.length === 0 || generating}
            onClick={handleGenerate}
          >
            {generating ? '// генерація...' : '⚡ Згенерувати'}
          </button>
        ) : (
          <button
            className={`btn-next${isAI ? ' ai' : ''}`}
            disabled={!form.title.trim() || (saveAsTemplate && !templateTitle.trim()) || submitting || generating}
            onClick={handleSubmit}
          >
            {submitting ? '// збереження...' : '✓ Створити завдання'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Root ── */

export default function CreateContentPage() {
  const { accessToken } = useAuth();

  const [step, setStep]       = useState(0);
  const [method, setMethod]   = useState<Method>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [form, setForm]       = useState<FormState>({ title: '', desc: '', lang: 'Python', topic: '', count: '5', time: '' });

  const [templates, setTemplates]           = useState<TemplateDetailResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showModal, setShowModal]           = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [deleteError, setDeleteError]       = useState('');

  useEffect(() => {
    if (step !== 1 || !accessToken) return;
    setLoadingTemplates(true);
    getTemplates(accessToken)
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoadingTemplates(false));
  }, [step, accessToken]);

  function handleTemplateCreated(tpl: TemplateDetailResponse) {
    setTemplates((prev) => [tpl, ...prev]);
    setTemplate(tpl.id);
    setShowModal(false);
  }

  async function confirmAndDelete() {
    if (!accessToken || !confirmDeleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteTemplate(accessToken, confirmDeleteId);
      setTemplates((prev) => prev.filter((t) => t.id !== confirmDeleteId));
      if (template === confirmDeleteId) setTemplate(null);
      setConfirmDeleteId(null);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setDeleteError(status === 403 ? '// немає прав для видалення' : '// помилка сервера — спробуйте ще раз');
    } finally {
      setDeleting(false);
    }
  }

  const selectedTemplate = templates.find(t => t.id === template) ?? null;

  return (
    <>
      {showModal && accessToken && (
        <TemplateCreateModal token={accessToken} onClose={() => setShowModal(false)} onCreated={handleTemplateCreated} />
      )}
      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => { if (!deleting) setConfirmDeleteId(null); }}>
          <div className="confirm-delete-box" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-delete-title">// видалити шаблон?</div>
            <div className="confirm-delete-msg">
              Цю дію неможливо скасувати. Шаблон буде видалено назавжди.
            </div>
            {deleteError && <div className="wiz-error">{deleteError}</div>}
            <div className="confirm-delete-actions">
              <button className="btn-back" disabled={deleting} onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}>
                Скасувати
              </button>
              <button className="btn-delete-confirm" disabled={deleting} onClick={confirmAndDelete}>
                {deleting ? '// видалення...' : 'Видалити'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="wizard">
        <StepBar step={step} />
        {step === 0 && <Step0 method={method} setMethod={setMethod} onNext={() => setStep(1)} />}
        {step === 1 && (
          <Step1
            method={method}
            template={template}
            setTemplate={setTemplate}
            templates={templates}
            loadingTemplates={loadingTemplates}
            onNewTemplate={() => setShowModal(true)}
            onDeleteTemplate={(id) => { setDeleteError(''); setConfirmDeleteId(id); }}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && accessToken && (
          <Step2
            method={method}
            form={form}
            setForm={setForm}
            selectedTemplate={selectedTemplate}
            token={accessToken}
            onBack={() => setStep(1)}
            onDone={() => {
              setStep(0);
              setMethod(null);
              setTemplate(null);
              setForm({ title: '', desc: '', lang: 'Python', topic: '', count: '5', time: '' });
            }}
          />
        )}
      </div>
    </>
  );
}
