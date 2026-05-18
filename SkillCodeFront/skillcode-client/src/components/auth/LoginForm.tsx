import { useState } from 'react';
import FormField from './FormField';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/usersApi';

interface LoginFormProps {
  onSwitch: () => void;
  onForgotPassword: () => void;
}

export default function LoginForm({ onSwitch, onForgotPassword }: LoginFormProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('// заповніть усі поля');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg =
          err.errors['general']?.[0] ??
          err.errors['Email']?.[0] ??
          err.errors['Password']?.[0] ??
          '// щось пішло не так, спробуйте ще раз';
        setError(msg);
      } else {
        setError('// не вдалося з\'єднатися з сервером');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        Вхід <span className="accent">/&gt;</span>
      </div>
      <div className="form-sub">// введіть ваші дані для входу</div>

      <FormField
        label="Електронна пошта"
        type="email"
        placeholder="user@email.com"
        value={email}
        onChange={setEmail}
      />
      <FormField
        label="Пароль"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={setPassword}
      />

      <div className="forgot-row">
        <a className="forgot-link" onClick={onForgotPassword}>// забули пароль?</a>
      </div>

      {error && (
        <div className="field-hint" style={{ color: 'var(--red)', marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        <span>→</span> {loading ? '// завантаження...' : 'Увійти'}
      </button>

      <div className="switch-row">
        <span style={{ color: 'var(--text-muted)' }}>// немає акаунту? </span>
        <span className="switch-link" onClick={onSwitch}>Зареєструватись</span>
      </div>
    </form>
  );
}
