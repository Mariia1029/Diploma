import WelcomeRow from './WelcomeRow';
import ActionCard from './ActionCard';
import FolderCard from './FolderCard';
import type { FolderCardData } from './FolderCard';

const QUICK_ACTIONS: { icon: string; title: string; desc: string; page: string }[] = [
  { icon: '⚡', title: '// ai.generate()', desc: 'Згенерувати нове завдання за допомогою ШІ', page: 'create' },
  { icon: '✏', title: '// tasks.create()', desc: 'Створити тест або тренажер вручну', page: 'create' },
  { icon: '◉', title: '// public.browse()', desc: 'Переглянути публічні завдання інших користувачів', page: 'public' },
];

const FOLDERS: FolderCardData[] = [
  {
    id: 'mine',
    icon: '◈',
    title: '// мій контент',
    desc: 'Завдання та тренажери, які ви створили',
    color: '#4ade80',
    colorDim: '#166534',
    meta: 'приватні · публічні',
  },
  {
    id: 'saved',
    icon: '◇',
    title: '// збережені',
    desc: 'Публічні завдання інших користувачів, які ви зберегли',
    color: '#79c0ff',
    colorDim: '#1a3a5a',
    meta: 'публічні завдання',
  },
  {
    id: 'shared',
    icon: '↗',
    title: '// надіслані',
    desc: 'Завдання, якими поділились з вами',
    color: '#e3b341',
    colorDim: '#3a2a1a',
    meta: 'від інших користувачів',
    badge: '3',
  },
  {
    id: 'groups',
    icon: '⬡',
    title: '// групи',
    desc: 'Спільна робота — завдання та результати учасників',
    color: '#d2a8ff',
    colorDim: '#2a1a3a',
    meta: 'групові завдання',
    badge: '1',
  },
];

const FOLDER_PAGES: Record<string, string> = {
  mine: 'mine',
  saved: 'saved',
  groups: 'groups',
};

interface DashboardContentProps {
  userName: string;
  onNavigate: (page: string) => void;
}

export default function DashboardContent({ userName, onNavigate }: DashboardContentProps) {
  return (
    <div className="content">
      <WelcomeRow userName={userName} onNavigate={onNavigate} />

      <div className="section-hd">
        <div className="section-title">
          Швидкий старт <span className="comment">// обери дію</span>
        </div>
      </div>
      <div className="grid-3" style={{ marginBottom: 28 }}>
        {QUICK_ACTIONS.map((action) => (
          <ActionCard key={action.title} {...action} onClick={() => onNavigate(action.page)} />
        ))}
      </div>

      <div className="section-hd">
        <div className="section-title">
          Мої папки <span className="comment">// весь ваш контент</span>
        </div>
      </div>
      <div className="grid-2">
        {FOLDERS.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onClick={FOLDER_PAGES[folder.id] ? () => onNavigate(FOLDER_PAGES[folder.id]) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
