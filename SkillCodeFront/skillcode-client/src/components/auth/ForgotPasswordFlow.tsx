import { useState, useEffect, useRef } from 'react';
import FormField from './FormField';
import { sendPasswordResetCode, verifyResetCode, resetPassword } from '../../api/authApi';
import { ApiError } from '../../api/usersApi';

interface Props {
  onBack: () => void;
}

type Step = 'email' | 'code' | 'password' | 'success';

const TIMER_SECONDS = 120;

export default function ForgotPasswordFlow({ onBack }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  // step 1
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // step 2
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const verifiedCode = useRef('');

  // step 3
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  useEffect(() => {
    if (step !== 'code') return;
    setSecondsLeft(TIMER_SECONDS);
    setCanResend(false);
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(id);
          setCanResend(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step, timerKey]);

  useEffect(() => {
    if (step === 'code') {
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    }
  }, [step, timerKey]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError("// обов'язкове поле");
      return;
    }
    setEmailError('');
    setLoading(true);
    try {
      await sendPasswordResetCode(email.trim());
      setDigits(['', '', '', '', '', '']);
      setCodeError('');
      setStep('code');
    } catch (err) {
      if (err instanceof ApiError) {
        setEmailError(
          err.errors['email']?.[0] ??
          err.errors['Email']?.[0] ??
          "// щось пішло не так"
        );
      } else {
        setEmailError("// не вдалося з'єднатися з сервером");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setCodeError('');
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = Array(6).fill('') as string[];
    for (let i = 0; i < text.length; i++) next[i] = text[i];
    setDigits(next);
    digitRefs.current[Math.min(text.length, 5)]?.focus();
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setCodeError('// введіть усі 6 цифр');
      return;
    }
    setLoading(true);
    try {
      await verifyResetCode(email, code);
      verifiedCode.current = code;
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordError('');
      setConfirmPasswordError('');
      setStep('password');
    } catch {
      setCodeError('// невірний код. Спробуйте ще раз');
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await sendPasswordResetCode(email);
      setDigits(['', '', '', '', '', '']);
      setCodeError('');
      setTimerKey(k => k + 1);
    } catch {
      // ignore — timer will eventually let them try again
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    let hasError = false;
    if (!newPassword) {
      setNewPasswordError("// обов'язкове поле");
      hasError = true;
    } else {
      setNewPasswordError('');
    }
    if (!confirmPassword) {
      setConfirmPasswordError("// обов'язкове поле");
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('// паролі не збігаються');
      hasError = true;
    } else {
      setConfirmPasswordError('');
    }
    if (hasError) return;

    setLoading(true);
    try {
      await resetPassword(email, verifiedCode.current, newPassword);
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError) {
        const msg =
          err.errors['Password']?.[0] ??
          err.errors['newPassword']?.[0] ??
          "// щось пішло не так";
        setConfirmPasswordError(msg);
      } else {
        setConfirmPasswordError("// не вдалося з'єднатися з сервером");
      }
    } finally {
      setLoading(false);
    }
  }

  const minutes = Math.floor(secondsLeft / 60);
  const secs = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div>
      <div className="recovery-header">// відновлення_паролю()</div>

      {step !== 'success' && (
        <div className="form-heading">
          Відновлення паролю <span className="accent">/&gt;</span>
        </div>
      )}

      {step === 'email' && (
        <form onSubmit={handleSendCode} noValidate>
          <div className="form-sub">// введіть вашу електронну пошту</div>
          <FormField
            label="Електронна пошта"
            type="email"
            placeholder="user@email.com"
            value={email}
            onChange={setEmail}
            error={emailError}
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            <span>→</span> {loading ? '// надсилання...' : 'Надіслати код'}
          </button>
          <div className="switch-row">
            <span className="switch-link" onClick={onBack}>← Повернутись до входу</span>
          </div>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleVerifyCode} noValidate>
          <div className="form-sub">// код надіслано на {email}</div>
          <div className="code-inputs">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { digitRefs.current[i] = el; }}
                className={`code-input${codeError ? ' error' : ''}`}
                type="text"
                inputMode="numeric"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                maxLength={2}
                value={d}
                onChange={e => handleDigitChange(i, e.target.value)}
                onKeyDown={e => handleDigitKeyDown(i, e)}
                onPaste={handlePaste}
              />
            ))}
          </div>
          {codeError && (
            <div className="field-hint" style={{ color: 'var(--red)', textAlign: 'center', marginBottom: 12 }}>
              {codeError}
            </div>
          )}
          {!canResend && (
            <div className="timer-text">
              // код дійсний ще {minutes}:{secs}
            </div>
          )}
          <button
            type="button"
            className={`resend-btn${canResend ? ' active' : ''}`}
            disabled={!canResend || loading}
            onClick={handleResend}
          >
            // надіслати код повторно
          </button>
          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            <span>→</span> {loading ? '// перевірка...' : 'Підтвердити код'}
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handleResetPassword} noValidate>
          <div className="form-sub">// створіть новий пароль</div>
          <FormField
            label="Новий пароль"
            type="password"
            placeholder="••••••••"
            hint="// мін. 8 символів, 1 велика літера, 1 цифра"
            value={newPassword}
            onChange={setNewPassword}
            error={newPasswordError}
          />
          <div style={{ marginBottom: 20 }}>
            <FormField
              label="Підтвердження паролю"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={setConfirmPassword}
              error={confirmPasswordError}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            <span>→</span> {loading ? '// збереження...' : 'Змінити пароль'}
          </button>
        </form>
      )}

      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="form-heading">
            <span className="accent">✓</span> Пароль змінено
          </div>
          <div className="form-sub" style={{ marginTop: 8 }}>
            // пароль успішно змінено
          </div>
          <div className="switch-row" style={{ marginTop: 24 }}>
            <span className="switch-link" onClick={onBack}>Увійти</span>
          </div>
        </div>
      )}
    </div>
  );
}
