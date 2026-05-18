interface AuthTabsProps {
  active: 'login' | 'register';
  onChange: (tab: 'login' | 'register') => void;
}

export default function AuthTabs({ active, onChange }: AuthTabsProps) {
  return (
    <div className="tabs">
      <div
        className={`tab${active === 'login' ? ' active' : ''}`}
        onClick={() => onChange('login')}
      >
        // вхід()
      </div>
      <div
        className={`tab${active === 'register' ? ' active' : ''}`}
        onClick={() => onChange('register')}
      >
        // реєстрація()
      </div>
    </div>
  );
}
