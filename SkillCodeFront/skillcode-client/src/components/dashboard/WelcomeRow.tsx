interface WelcomeRowProps {
  userName: string;
  onNavigate: (page: string) => void;
}

export default function WelcomeRow({ userName, onNavigate }: WelcomeRowProps) {
  return (
    <div className="welcome-row">
      <div className="welcome-text">
        <h1>
          Вітаємо, <span className="name">{userName}</span>
        </h1>
        <div className="welcome-sub">// оберіть розділ або створіть новий контент</div>
      </div>
      <button className="btn-create" onClick={() => onNavigate('create')}>
        <span>+</span> Створити контент
      </button>
    </div>
  );
}
