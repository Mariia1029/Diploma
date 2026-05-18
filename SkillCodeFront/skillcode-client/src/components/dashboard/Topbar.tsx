interface TopbarProps {
  path: string;
  title: string;
  hasNotification?: boolean;
}
// hasNotification = false
export default function Topbar({ path, title }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="topbar-title">
        <span className="path">{path} /</span> {title}
      </div>

      {/* <div className="search-box">
        <span className="search-icon">⌕</span>
        <input placeholder="// пошук завдань..." />
      </div> */}

      {/* <div className="notif-btn">
        ✉
        {hasNotification && <div className="notif-dot" />}
      </div> */}
    </div>
  );
}
