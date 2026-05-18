interface NavItemData {
  id: string;
  icon: string;
  label: string;
  section: 'main' | 'social';
  badge?: string;
}

const NAV_ITEMS: NavItemData[] = [
  { id: 'home',   icon: '⌂', label: '// головна',         section: 'main' },
  { id: 'create', icon: '+', label: '// створити контент', section: 'main' },
  { id: 'mine',   icon: '◈', label: '// мій контент',      section: 'main' },
  { id: 'groups', icon: '⬡', label: '// групи',            section: 'social', badge: '3' },
  { id: 'msgs',   icon: '✉', label: '// повідомлення',     section: 'social', badge: '7' },
  { id: 'saved',  icon: '◇', label: '// збережене',        section: 'social' },
  { id: 'public', icon: '◉', label: '// публічне',          section: 'social' },
];

const SECTION_LABELS: Record<string, string> = {
  main:   'навігація',
  social: 'спільнота',
};

interface SidebarProps {
  activePage: string;
  onNavigate: (id: string) => void;
  userName: string;
  userInitials: string;
  onProfile: () => void;
  onLogout: () => void;
}

export default function Sidebar({ activePage, onNavigate, userName, userInitials, onProfile, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">
          <span className="brace">{'{'}</span>SkillCode<span className="brace">{'}'}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {(['main', 'social'] as const).map((section) => (
          <div key={section}>
            <div className="nav-section-label">// {SECTION_LABELS[section]}</div>
            {NAV_ITEMS.filter((item) => item.section === section).map((item) => (
              <div
                key={item.id}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile-btn" onClick={onProfile}>
          <div className="avatar">{userInitials}</div>
          <div className="profile-info">
            <div className="profile-name">{userName}</div>
            <div className="profile-role">// мій профіль →</div>
          </div>
          <button
            className="sidebar-logout-btn"
            title="Вийти"
            onClick={e => { e.stopPropagation(); onLogout(); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
