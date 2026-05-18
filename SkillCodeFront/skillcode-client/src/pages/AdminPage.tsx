import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import '../styles/admin.css';
import type { AdminUserResponse } from '../api/adminApi';
import {
  getBlockedUsers,
  getAdminUsers,
  blockUser,
  unblockUser,
  setUserRole,
  getSystemTemplates,
  createSystemTemplate,
  getTotalUsersCount,
} from '../api/adminApi';
import { searchUsers } from '../api/sharesApi';
import type { UserSearchResult } from '../api/sharesApi';
import type { TemplateDetailResponse, CreateTemplateRequest } from '../types/template';
import type { UserRole } from '../types/user';
import TemplateCreateModal from '../components/dashboard/TemplateCreateModal';
import ProfilePage from '../components/dashboard/ProfilePage';

// ─── HELPERS ─────────────────────────────────────────────────────
function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function systemCreateFn(token: string, data: CreateTemplateRequest): Promise<TemplateDetailResponse> {
  return createSystemTemplate(token, {
    title: data.title,
    description: data.description,
    items: data.items,
  });
}

function userSearchResultToAdminUser(u: UserSearchResult): AdminUserResponse {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: 'Student' as UserRole,
    isDeleted: false,
    isBlocked: false,
    blockedUntil: null,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── ICONS ───────────────────────────────────────────────────────
function BlockIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M5.5 5.5l13 13" />
    </svg>
  );
}
function UnlockIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" />
    </svg>
  );
}
function ShieldIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
    </svg>
  );
}
function TplIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18v4H3z" /><path d="M3 12h11v9H3z" />
      <path d="M17 12h4v4h-4z" /><path d="M17 19h4" />
    </svg>
  );
}
function DemoteIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  );
}
function SignOutIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function PersonIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────────
type TabId = 'overview' | 'templates' | 'admins' | 'blocked' | 'profile';

interface AdminSidebarProps {
  active: TabId;
  setActive: (id: TabId) => void;
  userName: string;
  userInitials: string;
  onLogout: () => void;
}

function AdminSidebar({
  active, setActive, userName, userInitials, onLogout,
}: AdminSidebarProps) {
  const navItems: { id: TabId; icon: React.ReactElement; label: string }[] = [
    { id: 'overview',  icon: <ShieldIco />, label: '// огляд'       },
    { id: 'templates', icon: <TplIco />,    label: '// шаблони'     },
    { id: 'admins',    icon: <ShieldIco />, label: '// адміни'      },
    { id: 'blocked',   icon: <BlockIco />,  label: '// заблоковані' },
  ];

  return (
    <aside className="adm-sidebar">
      <div className="adm-sidebar-logo">
        <div className="adm-logo-text">
          <span className="adm-brace">{'{'}</span>SkillCode<span className="adm-brace">{'}'}</span>
        </div>
        <div className="adm-admin-flag">
          <span className="adm-admin-dot" />
          admin console
        </div>
      </div>

      <nav className="adm-sidebar-nav">
        <div className="adm-nav-section-label">// панель</div>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`adm-nav-item${active === item.id ? ' active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            <span className="adm-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="adm-sidebar-bottom">
        <div
          className={`adm-profile-btn${active === 'profile' ? ' active' : ''}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setActive('profile')}
        >
          <div className="adm-avatar">{userInitials}</div>
          <div className="adm-profile-info">
            <div className="adm-profile-name">{userName}</div>
            <div className="adm-profile-role">// admin</div>
          </div>
          <button
            className="adm-signout-btn"
            title="вийти"
            onClick={e => { e.stopPropagation(); onLogout(); }}
          >
            <SignOutIco />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── BLOCK MODAL ─────────────────────────────────────────────────
const DURATION_OPTS = [
  { v: '1',    label: '1',  sub: 'день'     },
  { v: '7',    label: '7',  sub: 'днів'     },
  { v: '30',   label: '30', sub: 'днів'     },
  { v: 'perm', label: '∞',  sub: 'назавжди' },
];

interface BlockModalProps {
  user: AdminUserResponse;
  onClose: () => void;
  onConfirm: (blockedUntil: string | null, reason: string) => void;
}

function BlockModal({ user, onClose, onConfirm }: BlockModalProps) {
  const [dur, setDur] = useState('7');
  const [reason, setReason] = useState('');
  const isPerm = dur === 'perm';
  const opt = DURATION_OPTS.find(d => d.v === dur);

  function handleConfirm() {
    const blockedUntil = isPerm ? null : addDays(parseInt(dur));
    onConfirm(blockedUntil, reason);
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div className={`adm-modal-icon ${isPerm ? 'danger' : 'warn'}`}>
            <BlockIco />
          </div>
          <div>
            <div className="adm-modal-title">Заблокувати користувача</div>
            <div className="adm-modal-sub">// доступ буде обмежено на вказаний термін</div>
          </div>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-target">
            <div className="adm-user-ava">{initials(user.firstName, user.lastName)}</div>
            <div>
              <div className="adm-user-name">{user.firstName} {user.lastName}</div>
              <div className="adm-user-email">{user.email}</div>
            </div>
          </div>

          <div className="adm-modal-label">// тривалість блокування</div>
          <div className="adm-duration-grid">
            {DURATION_OPTS.map(o => (
              <div
                key={o.v}
                className={`adm-duration-opt${dur === o.v ? ' active' : ''}`}
                onClick={() => setDur(o.v)}
              >
                {o.label}
                <small>{o.sub}</small>
              </div>
            ))}
          </div>

          <div className="adm-modal-label">// причина (видно тільки адмінам)</div>
          <textarea
            className="adm-textarea"
            rows={2}
            placeholder="// напр., спам, токсична поведінка..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />

          {isPerm && (
            <div className="adm-confirm-strip danger">
              <span className="adm-warn-icon">⚠</span>
              <div className="adm-strip-text">
                <strong>Перманентне блокування.</strong> Користувач не зможе увійти доки інший адмін не зніме блокування вручну.
              </div>
            </div>
          )}
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>скасувати</button>
          <button className="adm-btn adm-btn-danger" onClick={handleConfirm}>
            <BlockIco />
            {isPerm ? 'заблокувати назавжди' : `на ${opt!.label} ${opt!.sub}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DEMOTE MODAL ────────────────────────────────────────────────
interface DemoteModalProps {
  user: AdminUserResponse;
  onClose: () => void;
  onConfirm: () => void;
}

function DemoteModal({ user, onClose, onConfirm }: DemoteModalProps) {
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div className="adm-modal-icon warn">
            <DemoteIco />
          </div>
          <div>
            <div className="adm-modal-title">Зняти роль адміна</div>
            <div className="adm-modal-sub">// користувач залишиться зареєстрованим, але без доступу до панелі</div>
          </div>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-target">
            <div className="adm-user-ava">{initials(user.firstName, user.lastName)}</div>
            <div>
              <div className="adm-user-name">{user.firstName} {user.lastName}</div>
              <div className="adm-user-email">{user.email}</div>
            </div>
          </div>
          <div className="adm-confirm-strip warn">
            <span className="adm-warn-icon" style={{ color: 'var(--yellow)' }}>⚠</span>
            <div className="adm-strip-text">
              Створені шаблони <strong style={{ color: 'var(--yellow)' }}>залишаться</strong>. Користувач втратить можливість блокувати інших та керувати адмінами.
            </div>
          </div>
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>скасувати</button>
          <button className="adm-btn adm-btn-danger" onClick={onConfirm}>
            <DemoteIco />
            зняти роль
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── UNBLOCK MODAL ───────────────────────────────────────────────
interface UnblockModalProps {
  user: AdminUserResponse;
  onClose: () => void;
  onConfirm: () => void;
}

function UnblockModal({ user, onClose, onConfirm }: UnblockModalProps) {
  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div className="adm-modal-icon accent">
            <UnlockIco />
          </div>
          <div>
            <div className="adm-modal-title">Розблокувати користувача</div>
            <div className="adm-modal-sub">// користувач знову матиме повний доступ до платформи</div>
          </div>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-target">
            <div className="adm-user-ava">{initials(user.firstName, user.lastName)}</div>
            <div>
              <div className="adm-user-name">{user.firstName} {user.lastName}</div>
              <div className="adm-user-email">{user.email}</div>
            </div>
          </div>
          <div className="adm-confirm-strip accent">
            <span className="adm-warn-icon" style={{ color: 'var(--accent)' }}>ℹ</span>
            <div className="adm-strip-text">
              Блокування буде знято. Користувач зможе входити та користуватися всіма функціями.
            </div>
          </div>
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>скасувати</button>
          <button className="adm-btn adm-btn-primary" onClick={onConfirm}>
            <UnlockIco />
            розблокувати
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ADD ADMIN MODAL ─────────────────────────────────────────────
interface AddAdminModalProps {
  token: string;
  currentUserId: string;
  onClose: () => void;
  onConfirm: (u: AdminUserResponse) => void;
}

function AddAdminModal({ token, currentUserId, onClose, onConfirm }: AddAdminModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(v: string) {
    setQuery(v);
    setSelected(null);
    setResults([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchUsers(token, v);
        setResults(r.filter(u => u.id !== currentUserId));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div className="adm-modal-icon accent"><ShieldIco /></div>
          <div>
            <div className="adm-modal-title">Додати адміна</div>
            <div className="adm-modal-sub">// знайди та вибери користувача для призначення ролі адміна</div>
          </div>
        </div>

        <div className="adm-modal-body">
          {selected ? (
            <>
              <div className="adm-modal-label">// обраний користувач</div>
              <div className="adm-modal-target">
                <div className="adm-user-ava">{initials(selected.firstName, selected.lastName)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="adm-user-name">{selected.firstName} {selected.lastName}</div>
                  <div className="adm-user-email">{selected.email}</div>
                </div>
                <button
                  className="adm-icon-btn"
                  title="Скинути вибір"
                  onClick={() => { setSelected(null); setQuery(''); setResults([]); }}
                >
                  ×
                </button>
              </div>
              <div className="adm-confirm-strip accent">
                <span className="adm-warn-icon" style={{ color: 'var(--accent)' }}>ℹ</span>
                <div className="adm-strip-text">
                  Користувач отримає доступ до адмін-панелі та зможе блокувати юзерів і керувати шаблонами.
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="adm-modal-label">// пошук за ім'ям або email</div>
              <div className="adm-search-box">
                <input
                  placeholder="// введи ім'я або email..."
                  value={query}
                  onChange={e => handleQueryChange(e.target.value)}
                  autoFocus
                />
                {loading && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>...</span>}
              </div>

              {results.length > 0 && (
                <div className="adm-search-list">
                  {results.map(u => (
                    <div
                      key={u.id}
                      className="adm-search-item"
                      onClick={() => setSelected(u)}
                    >
                      <div className="adm-user-ava sm">{initials(u.firstName, u.lastName)}</div>
                      <div>
                        <div className="adm-user-name sm">{u.firstName} {u.lastName}</div>
                        <div className="adm-user-email">{u.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {query.trim() && !loading && results.length === 0 && (
                <div className="adm-empty-state" style={{ padding: '20px' }}>
                  <div className="adm-empty-title">// нікого не знайдено</div>
                  <div className="adm-empty-sub">за запитом «{query}»</div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>скасувати</button>
          <button
            className="adm-btn adm-btn-primary"
            disabled={!selected}
            onClick={() => selected && onConfirm(userSearchResultToAdminUser(selected))}
          >
            <ShieldIco />
            зробити адміном
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── USER PICKER MODAL (for blocking) ────────────────────────────
interface UserPickerModalProps {
  token: string;
  currentUserId: string;
  onClose: () => void;
  onSelect: (u: UserSearchResult) => void;
}

function UserPickerModal({ token, currentUserId, onClose, onSelect }: UserPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(v: string) {
    setQuery(v);
    setResults([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!v.trim()) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchUsers(token, v);
        setResults(r.filter(u => u.id !== currentUserId));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }, 300);
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <div className="adm-modal-head">
          <div className="adm-modal-icon danger"><BlockIco /></div>
          <div>
            <div className="adm-modal-title">Заблокувати користувача</div>
            <div className="adm-modal-sub">// знайди користувача якого потрібно заблокувати</div>
          </div>
        </div>

        <div className="adm-modal-body">
          <div className="adm-modal-label">// пошук за ім'ям або email</div>
          <div className="adm-search-box">
            <input
              placeholder="// введи ім'я або email..."
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              autoFocus
            />
            {loading && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>...</span>}
          </div>

          {results.length > 0 && (
            <div className="adm-search-list">
              {results.map(u => (
                <div
                  key={u.id}
                  className="adm-search-item"
                  onClick={() => onSelect(u)}
                >
                  <div className="adm-user-ava sm">{initials(u.firstName, u.lastName)}</div>
                  <div>
                    <div className="adm-user-name sm">{u.firstName} {u.lastName}</div>
                    <div className="adm-user-email">{u.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="adm-empty-state" style={{ padding: '20px' }}>
              <div className="adm-empty-title">// нікого не знайдено</div>
              <div className="adm-empty-sub">за запитом «{query}»</div>
            </div>
          )}
        </div>

        <div className="adm-modal-foot">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>скасувати</button>
        </div>
      </div>
    </div>
  );
}

// ─── USER RESULT CARD ────────────────────────────────────────────
interface UserResultCardProps {
  user: AdminUserResponse;
  currentUserId: string;
  onBlock: (u: AdminUserResponse) => void;
  onUnblock: (u: AdminUserResponse) => void;
  onPromote: (u: AdminUserResponse) => void;
  onDemote: (u: AdminUserResponse) => void;
}

function UserResultCard({ user, currentUserId, onBlock, onUnblock, onPromote, onDemote }: UserResultCardProps) {
  const isSelf    = user.id === currentUserId;
  const isBlocked = user.isBlocked;
  const isAdmin   = user.role === 'Admin';

  return (
    <div className={`adm-result-card${isBlocked ? ' blocked' : ''}`}>
      <div className="adm-user-ava lg">{initials(user.firstName, user.lastName)}</div>
      <div className="adm-result-main">
        <div className="adm-result-name">
          {user.firstName} {user.lastName}
          <span className={`adm-role-pill ${isAdmin ? 'admin' : 'user'}`}>{isAdmin ? 'admin' : 'user'}</span>
          <span className={`adm-status-pill ${isBlocked ? 'blocked' : 'active'}`}>
            <span className="adm-status-dot" />
            {isBlocked ? 'заблокований' : 'активний'}
          </span>
        </div>
        <div className="adm-result-meta">
          <span>{user.email}</span>
          <span className="adm-meta-sep">{formatDate(user.createdAt)}</span>
          {isBlocked && user.blockedUntil && (
            <span className="adm-meta-sep adm-meta-danger">до {formatDate(user.blockedUntil)}</span>
          )}
          {isBlocked && !user.blockedUntil && (
            <span className="adm-meta-sep adm-meta-danger">перманентно</span>
          )}
        </div>
      </div>
      {!isSelf && (
        <div className="adm-result-actions">
          {!isBlocked && (
            !isAdmin ? (
              <button className="adm-action-btn promote" onClick={() => onPromote(user)}>
                <ShieldIco />
                адмін
              </button>
            ) : (
              <button className="adm-icon-btn warn" title="Зняти роль адміна" onClick={() => onDemote(user)}>
                <DemoteIco />
              </button>
            )
          )}
          {isBlocked ? (
            <button className="adm-action-btn unblock" onClick={() => onUnblock(user)}>
              <UnlockIco />
              розблокувати
            </button>
          ) : (
            <button className="adm-action-btn block" onClick={() => onBlock(user)}>
              <BlockIco />
              заблокувати
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TEMPLATE CARD ───────────────────────────────────────────────
interface TemplateCardProps {
  tpl: TemplateDetailResponse;
}

function TemplateCard({ tpl }: TemplateCardProps) {
  return (
    <div className="adm-tpl-card">
      <div className="adm-tpl-head">
        <div className="adm-tpl-title"><span className="adm-slash">//</span>{tpl.title}</div>
      </div>
      {tpl.description && <div className="adm-tpl-desc">{tpl.description}</div>}
      <div className="adm-tpl-chips">
        <span className="adm-chip">{tpl.items.length} питань</span>
        {tpl.isSystem && <span className="adm-chip system">системний</span>}
      </div>
      <div className="adm-tpl-foot">
        <span className="adm-tpl-date">{formatDate(tpl.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ────────────────────────────────────────────────
function UsersIco() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

interface OverviewTabProps {
  blockedCount: number;
  adminCount: number;
  templateCount: number;
  totalUsers: number | null;
}

function OverviewTab({ blockedCount, adminCount, templateCount, totalUsers }: OverviewTabProps) {
  return (
    <div className="adm-stats">
      <div className="adm-stat-card">
        <div className="adm-stat-icon"><UsersIco /></div>
        <div className="adm-stat-label">// всього користувачів</div>
        <div className="adm-stat-value">{totalUsers ?? '–'}</div>
      </div>
      <div className="adm-stat-card danger">
        <div className="adm-stat-icon"><BlockIco /></div>
        <div className="adm-stat-label">// заблокованих</div>
        <div className="adm-stat-value">{blockedCount}</div>
      </div>
      <div className="adm-stat-card admin">
        <div className="adm-stat-icon"><ShieldIco /></div>
        <div className="adm-stat-label">// адміністраторів</div>
        <div className="adm-stat-value">{adminCount}</div>
      </div>
      <div className="adm-stat-card info">
        <div className="adm-stat-icon"><TplIco /></div>
        <div className="adm-stat-label">// шаблонів</div>
        <div className="adm-stat-value">{templateCount}</div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────
export default function AdminPage() {
  const { user, accessToken, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [blockedUsers, setBlockedUsers] = useState<AdminUserResponse[]>([]);
  const [adminUsers,   setAdminUsers]   = useState<AdminUserResponse[]>([]);
  const [templates,    setTemplates]    = useState<TemplateDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [totalUsers,       setTotalUsers]        = useState<number | null>(null);
  const [blockTarget,      setBlockTarget]       = useState<AdminUserResponse | null>(null);
  const [unblockTarget,    setUnblockTarget]     = useState<AdminUserResponse | null>(null);
  const [demoteTarget,     setDemoteTarget]      = useState<AdminUserResponse | null>(null);
  const [tplModalOpen,     setTplModalOpen]      = useState(false);
  const [addAdminOpen,     setAddAdminOpen]      = useState(false);
  const [pickUserForBlock, setPickUserForBlock]  = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      getBlockedUsers(accessToken),
      getAdminUsers(accessToken),
      getSystemTemplates(accessToken),
      getTotalUsersCount(accessToken).catch(() => null),
    ])
      .then(([blocked, admins, tpls, count]) => {
        setBlockedUsers(blocked);
        setAdminUsers(admins);
        setTemplates(tpls);
        if (count !== null) setTotalUsers(count);
      })
      .catch(err => console.error('Admin data load error:', err))
      .finally(() => setLoading(false));
  }, [accessToken]);

  async function handleBlockConfirm(blockedUntil: string | null, reason: string) {
    if (!blockTarget || !accessToken) return;
    try {
      await blockUser(accessToken, blockTarget.id, { blockedUntil, reason: reason || undefined });
      const updated = { ...blockTarget, isBlocked: true, blockedUntil };
      setBlockedUsers(bs => [...bs.filter(u => u.id !== blockTarget.id), updated]);
      setAdminUsers(as => as.filter(u => u.id !== blockTarget.id));
    } catch (err) {
      console.error('Block user error:', err);
    }
    setBlockTarget(null);
  }

  async function handleUnblockConfirm() {
    if (!unblockTarget || !accessToken) return;
    try {
      await unblockUser(accessToken, unblockTarget.id);
      setBlockedUsers(bs => bs.filter(x => x.id !== unblockTarget.id));
    } catch (err) {
      console.error('Unblock user error:', err);
    }
    setUnblockTarget(null);
  }

  async function handlePromote(u: AdminUserResponse) {
    if (!accessToken) return;
    try {
      await setUserRole(accessToken, u.id, 'admin');
      const promoted = { ...u, role: 'Admin' as UserRole, isBlocked: false };
      setAdminUsers(as => [...as.filter(x => x.id !== u.id), promoted]);
      setBlockedUsers(bs => bs.filter(x => x.id !== u.id));
    } catch (err) {
      console.error('Promote user error:', err);
    }
    setAddAdminOpen(false);
  }

  async function handleDemoteConfirm() {
    if (!demoteTarget || !accessToken) return;
    try {
      await setUserRole(accessToken, demoteTarget.id, 'user');
      setAdminUsers(as => as.filter(x => x.id !== demoteTarget.id));
    } catch (err) {
      console.error('Demote user error:', err);
    }
    setDemoteTarget(null);
  }

  function handleTplCreated(tpl: TemplateDetailResponse) {
    setTemplates(ts => [tpl, ...ts]);
    setTplModalOpen(false);
  }

  function handlePickForBlock(u: UserSearchResult) {
    setPickUserForBlock(false);
    setBlockTarget(userSearchResultToAdminUser(u));
  }

  const userName     = user ? `${user.firstName} ${user.lastName}` : '';
  const userInitials = user ? initials(user.firstName, user.lastName) : '';

  const pageInfo: Record<TabId, { t: string; s: string }> = {
    overview:  { t: 'Огляд системи',    s: '// загальна статистика' },
    templates: { t: 'Шаблони контенту', s: `// ${templates.length} системних шаблонів` },
    admins:    { t: 'Адміністратори',   s: `// ${adminUsers.length} активних адмінів` },
    blocked:   { t: 'Заблоковані',      s: `// ${blockedUsers.length} користувачів з обмеженим доступом` },
    profile:   { t: 'Мій профіль',      s: '// налаштування облікового запису' },
  };
  const pi = pageInfo[activeTab];

  if (loading) {
    return (
      <div className="adm-layout" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--mono)' }}>
          // завантаження...
        </div>
      </div>
    );
  }

  return (
    <div className="adm-layout">
      <AdminSidebar
        active={activeTab}
        setActive={setActiveTab}
        userName={userName}
        userInitials={userInitials}
        onLogout={logout}
      />

      <div className="adm-main">
        <div className="adm-topbar">
          <div className="adm-topbar-title">
            <span className="adm-path">SkillCode</span>
            <span className="adm-sep">/</span>
            <span className="adm-admin-label">Admin</span>
            <span className="adm-sep">/</span>
            <span>{pi.t}</span>
          </div>
        </div>

        <div className="adm-content">
          <div className="adm-content-inner">

            {activeTab !== 'profile' && (
              <div className="adm-page-head">
                <div>
                  <div className="adm-page-title"><span className="adm-accent">$</span> {pi.t}</div>
                  <div className="adm-page-sub">{pi.s}</div>
                </div>
                {activeTab === 'templates' && (
                  <button className="adm-btn adm-btn-primary" onClick={() => setTplModalOpen(true)}>
                    + новий шаблон
                  </button>
                )}
                {activeTab === 'admins' && (
                  <button className="adm-btn adm-btn-primary" onClick={() => setAddAdminOpen(true)}>
                    <ShieldIco />
                    + додати адміна
                  </button>
                )}
                {activeTab === 'blocked' && (
                  <button className="adm-btn adm-btn-danger" onClick={() => setPickUserForBlock(true)}>
                    <BlockIco />
                    + заблокувати користувача
                  </button>
                )}
              </div>
            )}

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <OverviewTab
                blockedCount={blockedUsers.length}
                adminCount={adminUsers.length}
                templateCount={templates.length}
                totalUsers={totalUsers}
              />
            )}

            {/* ── TEMPLATES ── */}
            {activeTab === 'templates' && (
              <>
                {templates.length === 0 ? (
                  <div className="adm-empty-state">
                    <div className="adm-empty-icon">⬡</div>
                    <div className="adm-empty-title">// шаблонів не знайдено</div>
                    <div className="adm-empty-sub">Створи перший системний шаблон, щоб користувачі могли використати його як стартову точку.</div>
                  </div>
                ) : (
                  <div className="adm-templates-grid">
                    {templates.map(t => (
                      <TemplateCard key={t.id} tpl={t} />
                    ))}
                    <div className="adm-tpl-create" onClick={() => setTplModalOpen(true)}>
                      <div className="adm-plus-circle">+</div>
                      <div className="adm-tpl-create-label">// новий шаблон</div>
                      <div className="adm-tpl-create-sub">додай готову структуру для контенту</div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── ADMINS ── */}
            {activeTab === 'admins' && (
              <div className="adm-admin-cards">
                {user && (
                  <div className="adm-admin-card you">
                    <div className="adm-admin-card-top">
                      <div className="adm-user-ava">{userInitials}</div>
                      <div>
                        <div className="adm-admin-name">
                          {userName}
                          <span className="adm-you-tag">ТИ</span>
                        </div>
                        <div className="adm-user-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="adm-admin-card-body">
                      <span className="adm-admin-since">// admin · з {formatDate(user.createdAt)}</span>
                      <span className="adm-role-pill admin">admin</span>
                    </div>
                  </div>
                )}

                {adminUsers.filter(u => u.id !== user?.id).map(u => (
                  <div key={u.id} className="adm-admin-card">
                    <div className="adm-admin-card-top">
                      <div className="adm-user-ava">{initials(u.firstName, u.lastName)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="adm-admin-name">{u.firstName} {u.lastName}</div>
                        <div className="adm-user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                    <div className="adm-admin-card-body">
                      <span className="adm-admin-since">// admin · з {formatDate(u.createdAt)}</span>
                      <button className="adm-icon-btn warn" title="Зняти роль адміна" onClick={() => setDemoteTarget(u)}>
                        <DemoteIco />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── PROFILE ── */}
            {activeTab === 'profile' && (
              <ProfilePage onLogout={logout} />
            )}

            {/* ── BLOCKED ── */}
            {activeTab === 'blocked' && (
              blockedUsers.length === 0 ? (
                <div className="adm-empty-state">
                  <div className="adm-empty-icon">○</div>
                  <div className="adm-empty-title">// заблокованих немає</div>
                  <div className="adm-empty-sub">Усі користувачі мають доступ до платформи.</div>
                </div>
              ) : blockedUsers.map(u => (
                <UserResultCard
                  key={u.id}
                  user={u}
                  currentUserId={user?.id ?? ''}
                  onBlock={setBlockTarget}
                  onUnblock={setUnblockTarget}
                  onPromote={handlePromote}
                  onDemote={setDemoteTarget}
                />
              ))
            )}

          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {blockTarget && (
        <BlockModal
          user={blockTarget}
          onClose={() => setBlockTarget(null)}
          onConfirm={handleBlockConfirm}
        />
      )}
      {unblockTarget && (
        <UnblockModal
          user={unblockTarget}
          onClose={() => setUnblockTarget(null)}
          onConfirm={handleUnblockConfirm}
        />
      )}
      {demoteTarget && (
        <DemoteModal
          user={demoteTarget}
          onClose={() => setDemoteTarget(null)}
          onConfirm={handleDemoteConfirm}
        />
      )}
      {tplModalOpen && accessToken && (
        <TemplateCreateModal
          token={accessToken}
          onClose={() => setTplModalOpen(false)}
          onCreated={handleTplCreated}
          createFn={systemCreateFn}
        />
      )}
      {addAdminOpen && accessToken && (
        <AddAdminModal
          token={accessToken}
          currentUserId={user?.id ?? ''}
          onClose={() => setAddAdminOpen(false)}
          onConfirm={handlePromote}
        />
      )}
      {pickUserForBlock && accessToken && (
        <UserPickerModal
          token={accessToken}
          currentUserId={user?.id ?? ''}
          onClose={() => setPickUserForBlock(false)}
          onSelect={handlePickForBlock}
        />
      )}
    </div>
  );
}
