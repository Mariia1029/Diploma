export interface FolderCardData {
  id: string;
  icon: string;
  title: string;
  desc: string;
  color: string;
  colorDim: string;
  meta: string;
  badge?: string;
}

interface FolderCardProps {
  folder: FolderCardData;
  onClick?: () => void;
}

export default function FolderCard({ folder, onClick }: FolderCardProps) {
  return (
    <div className="action-card" style={{ position: 'relative', overflow: 'hidden' }} onClick={onClick}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${folder.colorDim}, ${folder.color})`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, color: folder.color }}>{folder.icon}</span>
        {folder.badge && (
          <span style={{
            background: folder.colorDim,
            color: folder.color,
            fontSize: 9,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 10,
            border: `1px solid ${folder.color}33`,
          }}>
            {folder.badge} нових
          </span>
        )}
      </div>

      <div className="action-title" style={{ color: folder.color }}>{folder.title}</div>
      <div className="action-desc">{folder.desc}</div>
      <div style={{
        fontSize: 9,
        color: 'var(--text-faint)',
        marginTop: 6,
        fontFamily: 'var(--mono)',
        letterSpacing: '0.08em',
      }}>
        // {folder.meta}
      </div>
    </div>
  );
}
