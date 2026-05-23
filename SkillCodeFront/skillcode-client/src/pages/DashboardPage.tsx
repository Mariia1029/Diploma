import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/dashboard.css';
import Sidebar from '../components/dashboard/Sidebar';
import Topbar from '../components/dashboard/Topbar';
import DashboardContent from '../components/dashboard/DashboardContent';
import CreateContentPage from '../components/dashboard/CreateContentPage';
import MyContentPage from '../components/dashboard/MyContentPage';
import SolveTaskPage from '../components/dashboard/SolveTaskPage';
import ViewAttemptPage from '../components/dashboard/ViewAttemptPage';
import ProfilePage from '../components/dashboard/ProfilePage';
import GroupsPage from '../components/dashboard/GroupsPage';
import MessagesPage from '../components/dashboard/MessagesPage';
import PublicContentPage from '../components/dashboard/PublicContentPage';
import SavedContentPage from '../components/dashboard/SavedContentPage';
import type { ViewAttemptInput } from '../components/dashboard/ViewAttemptPage';
import { useAuth } from '../context/AuthContext';
import type { TaskDetailResponse } from '../types/task';
import { getTaskById } from '../api/tasksApi';

const PAGE_TITLES: Record<string, string> = {
  home:         'Головна',
  create:       'Створити контент',
  mine:         'Мій контент',
  groups:       'Групи',
  msgs:         'Повідомлення',
  saved:        'Збережене',
  public:       'Публічне',
  profile:      'Мій профіль',
  solve:        '',
  'view-attempt': '',
  'msg-solve':  '',
};

const PATH_TO_PAGE: [string, string][] = [
  ['/dashboard/messages/solve', 'msg-solve'],
  ['/dashboard/create',         'create'],
  ['/dashboard/mine',           'mine'],
  ['/dashboard/groups',         'groups'],
  ['/dashboard/messages',       'msgs'],
  ['/dashboard/saved',          'saved'],
  ['/dashboard/public',         'public'],
  ['/dashboard/profile',        'profile'],
  ['/dashboard/solve',          'solve'],
  ['/dashboard/attempt',        'view-attempt'],
];

const PAGE_TO_PATH: Record<string, string> = {
  home:           '/dashboard',
  create:         '/dashboard/create',
  mine:           '/dashboard/mine',
  groups:         '/dashboard/groups',
  msgs:           '/dashboard/messages',
  saved:          '/dashboard/saved',
  public:         '/dashboard/public',
  profile:        '/dashboard/profile',
  solve:          '/dashboard/solve',
  'view-attempt': '/dashboard/attempt',
  'msg-solve':    '/dashboard/messages/solve',
};

function pathToPage(pathname: string): string {
  for (const [prefix, page] of PATH_TO_PAGE) {
    if (pathname.startsWith(prefix)) return page;
  }
  return 'home';
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export default function DashboardPage() {
  const { user, logout, accessToken } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  const activePage = useMemo(() => pathToPage(location.pathname), [location.pathname]);

  function goTo(page: string) {
    navigate(PAGE_TO_PATH[page] ?? '/dashboard');
  }

  const [solveTask,        setSolveTask]        = useState<TaskDetailResponse | null>(null);
  const [resumeAttemptId,  setResumeAttemptId]  = useState<string | null>(null);
  const [solveContextType, setSolveContextType] = useState<string>('Personal');
  const [solveContextId,   setSolveContextId]   = useState<string | null>(null);
  const [viewData,         setViewData]         = useState<ViewAttemptInput | null>(null);
  const [msgSolveTask,     setMsgSolveTask]     = useState<TaskDetailResponse | null>(null);
  const [msgShareId,       setMsgShareId]       = useState<string | null>(null);

  function handleTakeTestFromMine(task: TaskDetailResponse) {
    setResumeAttemptId(null);
    setSolveTask(task);
    setSolveContextType('Personal');
    setSolveContextId(null);
    goTo('solve');
  }

  function handleTakeTestFromSaved(task: TaskDetailResponse) {
    setResumeAttemptId(null);
    setSolveTask(task);
    setSolveContextType('Saved');
    setSolveContextId(null);
    goTo('solve');
  }

  async function handleTakeTestFromGroup(taskId: string, groupId: string) {
    if (!accessToken) return;
    try {
      const task = await getTaskById(accessToken, taskId);
      setResumeAttemptId(null);
      setSolveTask(task);
      setSolveContextType('Group');
      setSolveContextId(groupId);
      goTo('solve');
    } catch (e) {
      console.error('Failed to load task for group:', e);
    }
  }

  function handleResumeAttempt(task: TaskDetailResponse, attemptId: string) {
    setResumeAttemptId(attemptId);
    setSolveTask(task);
    setSolveContextType('Personal');
    setSolveContextId(null);
    goTo('solve');
  }

  function handleBackFromSolve() {
    setSolveTask(null);
    setResumeAttemptId(null);
    navigate(-1);
  }

  async function handleTakeTestFromMessage(taskId: string, shareId: string) {
    if (!accessToken) return;
    try {
      const task = await getTaskById(accessToken, taskId);
      setMsgSolveTask(task);
      setMsgShareId(shareId);
      goTo('msg-solve');
    } catch (e) {
      console.error('Failed to load task for message preview:', e);
    }
  }

  function handleBackFromMsgSolve() {
    setMsgSolveTask(null);
    setMsgShareId(null);
    navigate(-1);
  }

  function handleViewAttempt(input: ViewAttemptInput) {
    setViewData(input);
    goTo('view-attempt');
  }

  function handleViewAttemptFromMine(input: ViewAttemptInput) {
    setViewData(input);
    goTo('view-attempt');
  }

  function handleViewAttemptFromGroups(input: ViewAttemptInput) {
    setViewData(input);
    goTo('view-attempt');
  }

  function handleBackFromView() {
    setViewData(null);
    navigate(-1);
  }

  const fullName     = user ? `${user.firstName} ${user.lastName}` : '';
  const vocative     = user ? user.firstName : '';
  const userInitials = user ? initials(user.firstName, user.lastName) : '';

  const hideTopbar = activePage === 'solve' || activePage === 'view-attempt' || activePage === 'profile' || activePage === 'msg-solve';

  return (
    <div className="layout">
      <Sidebar
        userName={fullName}
        userInitials={userInitials}
        onProfile={() => goTo('profile')}
        onLogout={logout}
      />
      <div className="main">
        {!hideTopbar && (
          <Topbar
            path="SkillCode"
            title={PAGE_TITLES[activePage] ?? 'Головна'}
            hasNotification
          />
        )}

        {activePage === 'profile'
          ? <ProfilePage onLogout={logout} />
          : activePage === 'create'
            ? <CreateContentPage />
            : activePage === 'mine'
              ? <MyContentPage onTakeTest={handleTakeTestFromMine} onResumeAttempt={handleResumeAttempt} onViewAttempt={handleViewAttemptFromMine} />
              : activePage === 'groups'
                ? <GroupsPage onTakeTest={handleTakeTestFromGroup} onViewAttempt={handleViewAttemptFromGroups} />
                : activePage === 'msgs'
                  ? <MessagesPage onTakeTest={handleTakeTestFromMessage} />
                  : activePage === 'saved'
                    ? <SavedContentPage onTakeTest={handleTakeTestFromSaved} onViewAttempt={handleViewAttemptFromMine} />
                  : activePage === 'public'
                    ? <PublicContentPage />
                    : activePage === 'msg-solve' && msgSolveTask
                    ? (
                      <SolveTaskPage
                        task={msgSolveTask}
                        onBack={handleBackFromMsgSolve}
                        previewMode
                        shareId={msgShareId ?? undefined}
                      />
                    )
                    : activePage === 'solve' && solveTask
                    ? (
                      <SolveTaskPage
                        task={solveTask}
                        onBack={handleBackFromSolve}
                        onViewAttempt={handleViewAttempt}
                        resumeAttemptId={resumeAttemptId ?? undefined}
                        contextType={solveContextType}
                        contextId={solveContextId ?? undefined}
                      />
                    )
                    : activePage === 'view-attempt' && viewData
                      ? (
                        <ViewAttemptPage
                          task={viewData.task}
                          questions={viewData.questions}
                          finishData={viewData.finishData}
                          onBack={handleBackFromView}
                        />
                      )
                      : <DashboardContent userName={vocative} onNavigate={goTo} />
        }
      </div>
    </div>
  );
}
