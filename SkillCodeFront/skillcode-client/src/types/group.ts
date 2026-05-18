export type GroupRole = 'Owner' | 'Admin' | 'Member';
export type AttemptStatus = 'InProgress' | 'Finished' | 'TimedOut';
export type AttemptType = 'Personal' | 'Public' | 'Saved' | 'Shared' | 'Group';

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface TaskResponse {
  id: string;
  ownerId: string;
  templateId: string | null;
  title: string;
  status: 'Private' | 'Public';
  language: string;
  aiGenerated: boolean;
  isCopy: boolean;
  timeLimitSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSummaryResponse {
  id: string;
  name: string;
  memberCount: number;
}

export interface GroupMemberResponse {
  id: string;
  groupId: string;
  user: UserSummary;
  role: GroupRole;
  joinedAt: string;
}

export interface GroupTaskResponse {
  id: string;
  groupId: string;
  task: TaskResponse;
  sharedByUser: UserSummary | null;
  collectResults: boolean;
  addedAt: string;
}

export interface GroupDetailResponse extends GroupResponse {
  owner: UserSummary;
  members: GroupMemberResponse[];
  tasks: GroupTaskResponse[];
}

export interface GroupAttemptResponse {
  id: string;
  userId: string;
  taskId: string;
  contextType: AttemptType;
  contextId: string | null;
  earnedPoints: number;
  maxPoints: number;
  status: AttemptStatus;
  durationSeconds: number | null;
  timeLimitSeconds: number | null;
  startedAt: string;
  finishedAt: string | null;
  user?: UserSummary;
}
