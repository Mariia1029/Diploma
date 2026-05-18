import { useState } from 'react';
import '../styles/auth.css';
import LeftPanel from '../components/auth/LeftPanel';
import AuthTabs from '../components/auth/AuthTabs';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import ForgotPasswordFlow from '../components/auth/ForgotPasswordFlow';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [forgotMode, setForgotMode] = useState(false);

  function handleBackFromForgot() {
    setForgotMode(false);
    setTab('login');
  }

  return (
    <div className="auth-page">
      <LeftPanel />
      <div className="panel-right">
        <div className="form-card">
          {forgotMode ? (
            <ForgotPasswordFlow onBack={handleBackFromForgot} />
          ) : (
            <>
              <AuthTabs active={tab} onChange={setTab} />
              {tab === 'login'
                ? <LoginForm onSwitch={() => setTab('register')} onForgotPassword={() => setForgotMode(true)} />
                : <RegisterForm onSwitch={() => setTab('login')} />
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}
