import { useState } from 'react';
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
  home:    'Головна',
  create:  'Створити контент',
  mine:    'Мій контент',
  groups:  'Групи',
  msgs:    'Повідомлення',
  saved:   'Збережене',
  public:  'Публічне',
  profile: 'Мій профіль',
};

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export default function DashboardPage() {
  const { user, logout, accessToken } = useAuth();
  const [activePage,      setActivePage]      = useState('home');
  const [solveTask,        setSolveTask]        = useState<TaskDetailResponse | null>(null);
  const [resumeAttemptId,  setResumeAttemptId]  = useState<string | null>(null);
  const [solveContextType, setSolveContextType] = useState<string>('Personal');
  const [solveContextId,   setSolveContextId]   = useState<string | null>(null);
  const [solveReturnPage,  setSolveReturnPage]  = useState<string>('mine');
  const [viewData,        setViewData]        = useState<ViewAttemptInput | null>(null);
  const [viewReturnPage,  setViewReturnPage]  = useState<string>('mine');
  const [msgSolveTask,    setMsgSolveTask]    = useState<TaskDetailResponse | null>(null);
  const [msgShareId,      setMsgShareId]      = useState<string | null>(null);

  function handleTakeTestFromMine(task: TaskDetailResponse) {
    setResumeAttemptId(null);
    setSolveTask(task);
    setSolveContextType('Personal');
    setSolveContextId(null);
    setSolveReturnPage('mine');
    setActivePage('solve');
  }

  function handleTakeTestFromSaved(task: TaskDetailResponse) {
    setResumeAttemptId(null);
    setSolveTask(task);
    setSolveContextType('Saved');
    setSolveContextId(null);
    setSolveReturnPage('saved');
    setActivePage('solve');
  }

  async function handleTakeTestFromGroup(taskId: string, groupId: string) {
    if (!accessToken) return;
    try {
      const task = await getTaskById(accessToken, taskId);
      setResumeAttemptId(null);
      setSolveTask(task);
      setSolveContextType('Group');
      setSolveContextId(groupId);
      setSolveReturnPage('groups');
      setActivePage('solve');
    } catch (e) {
      console.error('Failed to load task for group:', e);
    }
  }

  function handleResumeAttempt(task: TaskDetailResponse, attemptId: string) {
    setResumeAttemptId(attemptId);
    setSolveTask(task);
    setSolveContextType('Personal');
    setSolveContextId(null);
    setSolveReturnPage('mine');
    setActivePage('solve');
  }

  function handleBackFromSolve() {
    setSolveTask(null);
    setResumeAttemptId(null);
    setActivePage(solveReturnPage);
  }

  async function handleTakeTestFromMessage(taskId: string, shareId: string) {
    if (!accessToken) return;
    try {
      const task = await getTaskById(accessToken, taskId);
      setMsgSolveTask(task);
      setMsgShareId(shareId);
      setActivePage('msg-solve');
    } catch (e) {
      console.error('Failed to load task for message preview:', e);
    }
  }

  function handleBackFromMsgSolve() {
    setMsgSolveTask(null);
    setMsgShareId(null);
    setActivePage('msgs');
  }

  function handleViewAttempt(input: ViewAttemptInput) {
    setViewData(input);
    setViewReturnPage(solveReturnPage);
    setActivePage('view-attempt');
  }

  function handleViewAttemptFromMine(input: ViewAttemptInput) {
    setViewData(input);
    setViewReturnPage('mine');
    setActivePage('view-attempt');
  }

  function handleViewAttemptFromGroups(input: ViewAttemptInput) {
    setViewData(input);
    setViewReturnPage('groups');
    setActivePage('view-attempt');
  }

  function handleBackFromView() {
    setViewData(null);
    setSolveTask(null);
    setActivePage(viewReturnPage);
  }

  const fullName     = user ? `${user.firstName} ${user.lastName}` : '';
  const vocative     = user ? user.firstName : '';
  const userInitials = user ? initials(user.firstName, user.lastName) : '';

  const hideTopbar = activePage === 'solve' || activePage === 'view-attempt' || activePage === 'profile' || activePage === 'msg-solve';

  return (
    <div className="layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        userName={fullName}
        userInitials={userInitials}
        onProfile={() => setActivePage('profile')}
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
                      : <DashboardContent userName={vocative} onNavigate={setActivePage} />
        }
      </div>
    </div>
  );
}
