import { useState, useRef } from 'react';
import '../../styles/profile.css';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, changePassword, deactivateAccount, deleteAccount, ApiError } from '../../api/usersApi';

const ROLE_LABELS: Record<string, string> = {
  Student: 'студент',
  Teacher: 'викладач',
  Admin:   'адміністратор',
};

interface ProfileForm {
  firstName: string;
  lastName:  string;
  email:     string;
}

interface FormErrors {
  firstName?: string;
  lastName?:  string;
  email?:     string;
}

function EyeOn() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function initials(first: string, last: string) {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

interface ProfilePageProps {
  onLogout: () => void;
}

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  const { user, accessToken, updateUser } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName ?? '',
    email:     user?.email ?? '',
  });

  const [editing,  setEditing]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState<FormErrors>({});
  const [saved,    setSaved]    = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // delete modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // deactivate
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  async function handleDeactivate() {
    setDeactivateLoading(true);
    try {
      await deactivateAccount(accessToken ?? '');
      updateUser({ isDeleted: true });
    } catch {
      // ignore
    } finally {
      setDeactivateLoading(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true);
    try {
      await deleteAccount(accessToken ?? '');
      onLogout();
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  // password change
  const [changingPwd, setChangingPwd] = useState(false);
  const [pwdLoading,  setPwdLoading]  = useState(false);
  const [pwdSaved,    setPwdSaved]    = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdErrors, setPwdErrors] = useState<{ currentPassword?: string; newPassword?: string; confirmPassword?: string }>({});
  const pwdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCurrent, setShowCurrent]   = useState(false);
  const [showNew,     setShowNew]       = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  function resetForm() {
    setForm({
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName ?? '',
      email:     user?.email ?? '',
    });
    setErrors({});
  }

  function handleCancel() {
    resetForm();
    setEditing(false);
  }

  async function handleSave() {
    const errs: FormErrors = {};
    if (!form.firstName.trim()) errs.firstName = "// обов'язкове поле";
    if (!form.lastName.trim())  errs.lastName  = "// обов'язкове поле";
    if (!form.email.trim())     errs.email     = "// обов'язкове поле";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      const updated = await updateProfile(
        { firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() },
        accessToken ?? '',
      );
      updateUser(updated);
      setEditing(false);
      setSaved(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: FormErrors = {};
        if (err.errors['FirstName']) mapped.firstName = err.errors['FirstName'][0];
        if (err.errors['LastName'])  mapped.lastName  = err.errors['LastName'][0];
        if (err.errors['Email'])     mapped.email     = err.errors['Email'][0];
        if (err.errors['email'])     mapped.email     = err.errors['email'][0];
        if (Object.keys(mapped).length === 0) mapped.email = '// щось пішло не так';
        setErrors(mapped);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleCancelPwd() {
    setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwdErrors({});
    setChangingPwd(false);
  }

  async function handleChangePassword() {
    const errs: typeof pwdErrors = {};
    if (!pwdForm.currentPassword) errs.currentPassword = "// обов'язкове поле";
    if (!pwdForm.newPassword)     errs.newPassword     = "// обов'язкове поле";
    if (!pwdForm.confirmPassword) errs.confirmPassword = "// обов'язкове поле";
    if (pwdForm.newPassword && pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword)
      errs.confirmPassword = '// паролі не збігаються';
    if (Object.keys(errs).length > 0) { setPwdErrors(errs); return; }

    setPwdLoading(true);
    setPwdErrors({});
    try {
      await changePassword({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }, accessToken ?? '');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setChangingPwd(false);
      setPwdSaved(true);
      if (pwdTimer.current) clearTimeout(pwdTimer.current);
      pwdTimer.current = setTimeout(() => setPwdSaved(false), 2500);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: typeof pwdErrors = {};
        if (err.errors['currentPassword']) mapped.currentPassword = err.errors['currentPassword'][0];
        if (err.errors['CurrentPassword']) mapped.currentPassword = err.errors['CurrentPassword'][0];
        if (err.errors['NewPassword'])     mapped.newPassword     = err.errors['NewPassword'][0];
        if (Object.keys(mapped).length === 0) mapped.currentPassword = '// щось пішло не так';
        setPwdErrors(mapped);
      }
    } finally {
      setPwdLoading(false);
    }
  }

  const userInitials = initials(form.firstName, form.lastName);
  const handle       = `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}`.replace(/\s+/g, '');
  const roleLabel    = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '';

  return (
    <div className="profile-content">

      {/* Profile card */}
      <div className="pf-card">
        <div className="pf-banner">
          <div className="pf-banner-pattern" />
        </div>

        <div className="pf-avatar-row">
          <div className="pf-avatar">{userInitials}</div>
        </div>

        <div className="pf-body">
          <div>
            <div className="pf-name">{form.firstName} {form.lastName}</div>
            <div className="pf-handle">// @{handle}</div>
            {roleLabel && <div className="pf-role-badge">// {roleLabel}</div>}
          </div>

          {!editing && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                className="pf-btn-ghost"
                style={{ height: 28, padding: '0 10px', fontSize: 10 }}
                onClick={() => setEditing(true)}
              >
                ✏ Редагувати
              </button>
              <button
                className="pf-btn-ghost"
                style={{ height: 28, padding: '0 10px', fontSize: 10, color: 'var(--red)', borderColor: 'rgba(255,123,114,0.2)' }}
                onClick={onLogout}
              >
                ↪ Вийти
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info / Edit section */}
        {editing ? (
          <div className="sc-card">
            <div className="sc-header">
              <div className="sc-title">// редагування профілю</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="pf-btn-ghost" onClick={handleCancel} disabled={loading}>Скасувати</button>
                <button className="pf-btn-primary" onClick={handleSave} disabled={loading}>
                  {loading ? '// збереження...' : '✓ Зберегти'}
                </button>
              </div>
            </div>
            <div className="sc-body" style={{ gap: 14 }}>

              <div className="pf-field-row">
                <div className="pf-field">
                  <label className="pf-label">Ім'я</label>
                  <input
                    className="pf-input"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                    style={errors.firstName ? { borderColor: 'var(--red)' } : undefined}
                  />
                  {errors.firstName && <div className="pf-error">{errors.firstName}</div>}
                </div>
                <div className="pf-field">
                  <label className="pf-label">Прізвище</label>
                  <input
                    className="pf-input"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                    style={errors.lastName ? { borderColor: 'var(--red)' } : undefined}
                  />
                  {errors.lastName && <div className="pf-error">{errors.lastName}</div>}
                </div>
              </div>

              <div className="pf-field">
                <label className="pf-label">Email</label>
                <input
                  className="pf-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  style={errors.email ? { borderColor: 'var(--red)' } : undefined}
                />
                {errors.email && <div className="pf-error">{errors.email}</div>}
              </div>

            </div>
          </div>
        ) : (
          <div className="sc-card">
            <div className="sc-header">
              <div className="sc-title">// інформація профілю</div>
              <div className={`pf-toast${saved ? ' visible' : ''}`}>
                <span>✓</span><span>Збережено</span>
              </div>
            </div>
            <div className="sc-body" style={{ gap: 0 }}>
              {[
                { key: "Ім'я та прізвище", val: `${form.firstName} ${form.lastName}` },
                { key: 'Нікнейм',          val: `@${handle}` },
                { key: 'Email',            val: user?.email ?? '—' },
                { key: 'Роль',             val: `// ${roleLabel}` },
              ].map((row) => (
                <div key={row.key} className="pf-info-row">
                  <div className="pf-info-key">{row.key}</div>
                  <div className="pf-info-val">{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security */}
        <div className="sc-card">
          <div className="sc-header">
            <div className="sc-title">// безпека</div>
          </div>
          <div className="sc-body" style={{ gap: 0 }}>

            {changingPwd ? (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="pf-field" style={{ marginBottom: 10 }}>
                  <label className="pf-label">Поточний пароль</label>
                  <div className="pf-input-wrapper">
                    <input
                      className="pf-input"
                      type={showCurrent ? 'text' : 'password'}
                      value={pwdForm.currentPassword}
                      onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
                      style={pwdErrors.currentPassword ? { borderColor: 'var(--red)' } : undefined}
                    />
                    <button type="button" className="pf-eye-btn" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                      {showCurrent ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {pwdErrors.currentPassword && <div className="pf-error">{pwdErrors.currentPassword}</div>}
                </div>
                <div className="pf-field" style={{ marginBottom: 10 }}>
                  <label className="pf-label">Новий пароль</label>
                  <div className="pf-input-wrapper">
                    <input
                      className="pf-input"
                      type={showNew ? 'text' : 'password'}
                      value={pwdForm.newPassword}
                      onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
                      style={pwdErrors.newPassword ? { borderColor: 'var(--red)' } : undefined}
                    />
                    <button type="button" className="pf-eye-btn" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                      {showNew ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {pwdErrors.newPassword && <div className="pf-error">{pwdErrors.newPassword}</div>}
                </div>
                <div className="pf-field" style={{ marginBottom: 14 }}>
                  <label className="pf-label">Підтвердження паролю</label>
                  <div className="pf-input-wrapper">
                    <input
                      className="pf-input"
                      type={showConfirm ? 'text' : 'password'}
                      value={pwdForm.confirmPassword}
                      onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      style={pwdErrors.confirmPassword ? { borderColor: 'var(--red)' } : undefined}
                    />
                    <button type="button" className="pf-eye-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                      {showConfirm ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {pwdErrors.confirmPassword && <div className="pf-error">{pwdErrors.confirmPassword}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="pf-btn-ghost" style={{ height: 30, fontSize: 10 }} onClick={handleCancelPwd} disabled={pwdLoading}>
                    Скасувати
                  </button>
                  <button className="pf-btn-primary" style={{ height: 30, fontSize: 10 }} onClick={handleChangePassword} disabled={pwdLoading}>
                    {pwdLoading ? '// збереження...' : '✓ Змінити пароль'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pf-sec-row">
                <div>
                  <div className="pf-sec-title">
                    Пароль
                    {pwdSaved && <span style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 10 }}>✓ змінено</span>}
                  </div>
                  <div className="pf-pwd-dots">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="pf-pwd-dot" />
                    ))}
                  </div>
                </div>
                <button className="pf-btn-ghost" style={{ height: 30, fontSize: 10 }} onClick={() => setChangingPwd(true)}>
                  Змінити пароль
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Danger zone */}
        <div className="sc-card" style={{ borderColor: 'rgba(255,123,114,0.15)' }}>
          <div className="sc-header" style={{ borderBottomColor: 'rgba(255,123,114,0.1)' }}>
            <div className="sc-title" style={{ color: 'rgba(255,123,114,0.6)' }}>
              // небезпечна зона
            </div>
          </div>
          <div className="sc-body" style={{ gap: 0 }}>

            <div className="pf-sec-row" style={{ borderColor: 'rgba(255,123,114,0.08)' }}>
              <div>
                <div className="pf-sec-title">Деактивувати акаунт</div>
                <div className="pf-sec-sub">
                  // акаунт буде приховано, дані збережено — можна відновити
                </div>
              </div>
              <button
                className="pf-btn-ghost"
                style={{ height: 30, fontSize: 10, color: 'var(--yellow)', borderColor: 'rgba(227,179,65,0.2)' }}
                onClick={handleDeactivate}
                disabled={deactivateLoading}
              >
                {deactivateLoading ? '// ...' : 'Деактивувати'}
              </button>
            </div>

            <div className="pf-sec-row" style={{ borderBottom: 'none' }}>
              <div>
                <div className="pf-sec-title">Видалити акаунт</div>
                <div className="pf-sec-sub">// всі дані будуть безповоротно видалені</div>
              </div>
              <button className="pf-btn-danger" onClick={() => setDeleteModal(true)}>
                Видалити акаунт
              </button>
            </div>

          </div>
        </div>

      {/* Hard-delete confirmation modal */}
      {deleteModal && (
        <div className="pf-modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="pf-modal" onClick={e => e.stopPropagation()}>
            <div className="pf-modal-title">// видалити акаунт?</div>
            <div className="pf-modal-body">
              Всі ваші дані будуть безповоротно видалені, а ваш контент стане недоступним для інших користувачів.
              <br /><br />
              Можливо, варто лише деактивувати акаунт — тоді дані збережуться і ви зможете повернутися.
            </div>
            <div className="pf-modal-actions">
              <button
                className="pf-btn-danger"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? '// видалення...' : 'Видалити назавжди'}
              </button>
              <button
                className="pf-btn-ghost"
                style={{ color: 'var(--yellow)', borderColor: 'rgba(227,179,65,0.2)' }}
                onClick={() => { setDeleteModal(false); handleDeactivate(); }}
                disabled={deleteLoading || deactivateLoading}
              >
                Деактивувати натомість
              </button>
              <button
                className="pf-btn-ghost"
                onClick={() => setDeleteModal(false)}
                disabled={deleteLoading}
              >
                Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
