import type { UserResponse } from '../types/user';
import type { TemplateDetailResponse } from '../types/template';
import { ApiError } from './usersApi';
import { BASE_URL } from './config';

export interface AdminUserResponse extends UserResponse {
  blockReason?: string | null;
}

export interface BlockUserRequest {
  blockedUntil: string | null;
  reason?: string;
}

export type AdminRoleValue = 'user' | 'admin';

export interface SystemTemplateItemInput {
  type: string;
  content: string;
  orderIndex: number;
}

export interface CreateSystemTemplateRequest {
  title: string;
  description?: string;
  items: SystemTemplateItemInput[];
}

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

export async function getBlockedUsers(token: string): Promise<AdminUserResponse[]> {
  const res = await fetch(`${BASE_URL}/users/blocked`, { headers: authHeaders(token) });
  if (res.status === 200) return res.json() as Promise<AdminUserResponse[]>;
  return throwOnError(res);
}

export async function getAdminUsers(token: string): Promise<AdminUserResponse[]> {
  const res = await fetch(`${BASE_URL}/users/admins`, { headers: authHeaders(token) });
  if (res.status === 200) return res.json() as Promise<AdminUserResponse[]>;
  return throwOnError(res);
}

export async function blockUser(token: string, userId: string, data: BlockUserRequest): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/block`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (res.status === 204) return;
  return throwOnError(res);
}

export async function unblockUser(token: string, userId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/unblock`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
  if (res.status === 204) return;
  return throwOnError(res);
}

export async function setUserRole(token: string, userId: string, newRole: AdminRoleValue): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ newRole }),
  });
  if (res.status === 204) return;
  return throwOnError(res);
}

export async function getTotalUsersCount(token: string): Promise<number> {
  const res = await fetch(`${BASE_URL}/users/count`, { headers: authHeaders(token) });
  if (res.status === 200) {
    const data = await res.json() as { count: number } | number;
    return typeof data === 'number' ? data : data.count;
  }
  return throwOnError(res);
}

export async function getSystemTemplates(token: string): Promise<TemplateDetailResponse[]> {
  const res = await fetch(`${BASE_URL}/templates/system`, { headers: authHeaders(token) });
  if (res.status === 200) return res.json() as Promise<TemplateDetailResponse[]>;
  return throwOnError(res);
}

export async function createSystemTemplate(
  token: string,
  data: CreateSystemTemplateRequest,
): Promise<TemplateDetailResponse> {
  const res = await fetch(`${BASE_URL}/templates/system`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (res.status === 201) return res.json() as Promise<TemplateDetailResponse>;
  return throwOnError(res);
}
