interface ActionCardProps {
  icon: string;
  title: string;
  desc: string;
  onClick?: () => void;
}

export default function ActionCard({ icon, title, desc, onClick }: ActionCardProps) {
  return (
    <div className="action-card" onClick={onClick}>
      <div className="action-icon">{icon}</div>
      <div className="action-title">{title}</div>
      <div className="action-desc">{desc}</div>
    </div>
  );
}
