import { ApiError } from './usersApi';
import { BASE_URL } from './config';
import type {
  GroupSummaryResponse,
  GroupResponse,
  GroupDetailResponse,
  GroupMemberResponse,
  GroupTaskResponse,
  GroupAttemptResponse,
  GroupRole,
} from '../types/group';

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function throwOnError(res: Response): Promise<never> {
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(400, (body as { errors?: Record<string, string[]> }).errors ?? {});
  }
  throw new ApiError(res.status);
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function getGroups(token: string, query?: string): Promise<GroupSummaryResponse[]> {
  const url = query ? `${BASE_URL}/groups?query=${encodeURIComponent(query)}` : `${BASE_URL}/groups`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (res.status === 200) return res.json() as Promise<GroupSummaryResponse[]>;
  return throwOnError(res);
}

export async function createGroup(
  token: string,
  body: { name: string; description?: string },
): Promise<GroupResponse> {
  const res = await fetch(`${BASE_URL}/groups`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 201) return res.json() as Promise<GroupResponse>;
  return throwOnError(res);
}

export async function getGroupDetail(token: string, id: string): Promise<GroupDetailResponse> {
  const res = await fetch(`${BASE_URL}/groups/${id}`, { headers: authHeaders(token) });
  if (res.status === 200) return res.json() as Promise<GroupDetailResponse>;
  return throwOnError(res);
}

export async function updateGroup(
  token: string,
  id: string,
  body: { name?: string; description?: string },
): Promise<GroupResponse> {
  const res = await fetch(`${BASE_URL}/groups/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 200) return res.json() as Promise<GroupResponse>;
  return throwOnError(res);
}

export async function deleteGroup(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/groups/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function leaveGroup(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/groups/${id}/leave`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

// ── Members ───────────────────────────────────────────────────────────────────

export async function getMembers(token: string, groupId: string): Promise<GroupMemberResponse[]> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/members`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<GroupMemberResponse[]>;
  return throwOnError(res);
}

export async function addMember(
  token: string,
  groupId: string,
  body: { userId: string; role: 'Member' | 'Admin' },
): Promise<GroupMemberResponse> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 201) return res.json() as Promise<GroupMemberResponse>;
  return throwOnError(res);
}

export async function removeMember(
  token: string,
  groupId: string,
  memberId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/members/${memberId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function changeMemberRole(
  token: string,
  groupId: string,
  memberId: string,
  role: Exclude<GroupRole, 'Owner'>,
): Promise<GroupMemberResponse> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/members/${memberId}/role`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
  if (res.status === 200) return res.json() as Promise<GroupMemberResponse>;
  return throwOnError(res);
}

// ── Group Tasks ───────────────────────────────────────────────────────────────

export async function getGroupTasks(token: string, groupId: string): Promise<GroupTaskResponse[]> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<GroupTaskResponse[]>;
  return throwOnError(res);
}

export async function addGroupTask(
  token: string,
  groupId: string,
  body: { taskId: string; collectResults: boolean },
): Promise<GroupTaskResponse> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 201) return res.json() as Promise<GroupTaskResponse>;
  return throwOnError(res);
}

export async function removeGroupTask(
  token: string,
  groupId: string,
  groupTaskId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks/${groupTaskId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function getGroupTaskResults(
  token: string,
  groupId: string,
  groupTaskId: string,
): Promise<GroupAttemptResponse[]> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks/${groupTaskId}/results`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<GroupAttemptResponse[]>;
  return throwOnError(res);
}

export async function getGroupTaskAttemptDetail(
  token: string,
  groupId: string,
  groupTaskId: string,
  attemptId: string,
): Promise<import('../api/attemptsApi').AttemptDetailResponse> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks/${groupTaskId}/attempts/${attemptId}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<import('../api/attemptsApi').AttemptDetailResponse>;
  return throwOnError(res);
}
