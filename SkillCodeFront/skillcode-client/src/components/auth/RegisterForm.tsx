import { useState } from 'react';
import FormField from './FormField';
import { registerUser, ApiError } from '../../api/usersApi';

interface RegisterFormProps {
  onSwitch: () => void;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function RegisterForm({ onSwitch }: RegisterFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!firstName.trim()) e.firstName = '// обов\'язкове поле';
    if (!lastName.trim()) e.lastName = '// обов\'язкове поле';
    if (!email.trim()) e.email = '// обов\'язкове поле';
    if (!password) e.password = '// обов\'язкове поле';
    if (!confirmPassword) e.confirmPassword = '// обов\'язкове поле';
    if (password && confirmPassword && password !== confirmPassword)
      e.confirmPassword = '// паролі не збігаються';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await registerUser({ firstName, lastName, email, password });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: FieldErrors = {};
        if (err.errors['FirstName']) mapped.firstName = err.errors['FirstName'][0];
        if (err.errors['LastName'])  mapped.lastName  = err.errors['LastName'][0];
        if (err.errors['Email'])     mapped.email     = err.errors['Email'][0];
        if (err.errors['Password'])  mapped.password  = err.errors['Password'][0];
        if (err.status === 409)      mapped.email     = err.errors['email']?.[0] ?? '// email вже зайнятий';
        if (Object.keys(mapped).length === 0) mapped.general = '// щось пішло не так, спробуйте ще раз';
        setErrors(mapped);
      } else {
        setErrors({ general: '// не вдалося з\'єднатися з сервером' });
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div className="form-heading">
          <span className="accent">✓</span> Акаунт створено
        </div>
        {/* <div className="form-sub" style={{ marginTop: 8 }}>// перевірте вашу пошту</div> */}
        <div className="switch-row" style={{ marginTop: 24 }}>
          <span className="switch-link" onClick={onSwitch}>Увійти</span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        Реєстрація <span className="accent">/&gt;</span>
      </div>
      <div className="form-sub">// створіть новий акаунт</div>

      <div className="field-row">
        <FormField
          label="Ім'я"
          placeholder="Іван"
          value={firstName}
          onChange={setFirstName}
          error={errors.firstName}
        />
        <FormField
          label="Прізвище"
          placeholder="Коваленко"
          value={lastName}
          onChange={setLastName}
          error={errors.lastName}
        />
      </div>

      <FormField
        label="Електронна пошта"
        type="email"
        placeholder="user@email.com"
        value={email}
        onChange={setEmail}
        error={errors.email}
      />
      <FormField
        label="Пароль"
        type="password"
        placeholder="••••••••"
        hint="// мін. 8 символів, 1 велика літера, 1 цифра"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <div style={{ marginBottom: 20 }}>
        <FormField
          label="Підтвердження паролю"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
        />
      </div>

      {errors.general && (
        <div className="field-hint" style={{ color: 'var(--red)', marginBottom: 12 }}>
          {errors.general}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        <span>→</span> {loading ? '// завантаження...' : 'Створити акаунт'}
      </button>

      <div className="switch-row">
        <span style={{ color: 'var(--text-muted)' }}>// вже є акаунт? </span>
        <span className="switch-link" onClick={onSwitch}>Увійти</span>
      </div>
    </form>
  );
}
