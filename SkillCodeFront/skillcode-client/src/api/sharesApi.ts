import { ApiError } from './usersApi';
import type {
  ReceivedShareResponse,
  SentShareResponse,
  PagedResult,
  SharesQueryParams,
  EphemeralAnswer,
  EphemeralAttemptResult,
  MarkReadResponse,
  SaveShareResponse,
} from '../types/share';

import { BASE_URL } from './config';

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

function buildQuery(params?: SharesQueryParams): string {
  const q = new URLSearchParams();
  if (params?.page !== undefined) q.set('page', String(params.page));
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  if (params?.isRead !== undefined) q.set('isRead', String(params.isRead));
  const s = q.toString();
  return s ? `?${s}` : '';
}

// 1. GET /api/shares/received
export async function getReceivedShares(
  token: string,
  params?: SharesQueryParams,
): Promise<PagedResult<ReceivedShareResponse>> {
  const res = await fetch(`${BASE_URL}/shares/received${buildQuery(params)}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<PagedResult<ReceivedShareResponse>>;
  return throwOnError(res);
}

// 2. GET /api/shares/sent
export async function getSentShares(
  token: string,
  params?: SharesQueryParams,
): Promise<PagedResult<SentShareResponse>> {
  const res = await fetch(`${BASE_URL}/shares/sent${buildQuery(params)}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<PagedResult<SentShareResponse>>;
  return throwOnError(res);
}

// 3. PATCH /api/shares/{shareId}/read
export async function markShareRead(
  token: string,
  shareId: string,
  isRead: boolean,
): Promise<MarkReadResponse> {
  const res = await fetch(`${BASE_URL}/shares/${shareId}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ isRead }),
  });
  if (res.status === 200) return res.json() as Promise<MarkReadResponse>;
  return throwOnError(res);
}

// 4. POST /api/shares/{shareId}/attempt  (receiver Go — ephemeral, no save)
export async function runShareAttempt(
  token: string,
  shareId: string,
  answers: EphemeralAnswer[],
): Promise<EphemeralAttemptResult> {
  const res = await fetch(`${BASE_URL}/shares/${shareId}/attempt`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ answers }),
  });
  if (res.status === 200) return res.json() as Promise<EphemeralAttemptResult>;
  return throwOnError(res);
}

// 5. POST /api/tasks/{taskId}/preview-attempt  (sender Go — ephemeral, no save)
export async function runTaskPreviewAttempt(
  token: string,
  taskId: string,
  answers: EphemeralAnswer[],
): Promise<EphemeralAttemptResult> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/preview-attempt`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ answers }),
  });
  if (res.status === 200) return res.json() as Promise<EphemeralAttemptResult>;
  return throwOnError(res);
}

// 6. POST /api/shares/{shareId}/save
export async function saveShareTask(
  token: string,
  shareId: string,
): Promise<SaveShareResponse> {
  const res = await fetch(`${BASE_URL}/shares/${shareId}/save`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (res.status === 200 || res.status === 201) return res.json() as Promise<SaveShareResponse>;
  return throwOnError(res);
}

// 7. DELETE /api/shares/{shareId}/save
export async function unsaveShareTask(
  token: string,
  shareId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/shares/${shareId}/save`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

// 8. POST /api/tasks/{taskId}/share  (send or forward a task)
export async function shareTask(
  token: string,
  taskId: string,
  receiverId: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/share`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ receiverId }),
  });
  if (res.status === 200 || res.status === 201) return;
  return throwOnError(res);
}

export interface UserSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface GroupSearchResult {
  id: string;
  name: string;
  memberCount: number;
}

// 9. GET /api/users/search?q=...
export async function searchUsers(
  token: string,
  query: string,
): Promise<UserSearchResult[]> {
  const q = encodeURIComponent(query);
  const res = await fetch(`${BASE_URL}/users/search?q=${q}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<UserSearchResult[]>;
  return throwOnError(res);
}

// 10. GET /api/groups?query=...
export async function searchMyGroups(
  token: string,
  query: string,
): Promise<GroupSearchResult[]> {
  const q = encodeURIComponent(query);
  const res = await fetch(`${BASE_URL}/groups?query=${q}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<GroupSearchResult[]>;
  return throwOnError(res);
}

// 11. POST /api/groups/{groupId}/tasks
export async function shareTaskToGroup(
  token: string,
  taskId: string,
  groupId: string,
  collectResults: boolean = false,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/groups/${groupId}/tasks`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ taskId, collectResults }),
  });
  if (res.status === 200 || res.status === 201) return;
  return throwOnError(res);
}
