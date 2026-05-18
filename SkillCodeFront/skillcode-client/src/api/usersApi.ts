import type { RegisterUserRequest, UserResponse } from '../types/user';

export interface UpdateProfileRequest {
  firstName: string;
  lastName:  string;
  email:     string;
}

import { BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, errors: Record<string, string[]> = {}) {
    super(`HTTP ${status}`);
    this.status = status;
    this.errors = errors;
  }
}

export async function registerUser(data: RegisterUserRequest): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.status === 201) {
    return res.json() as Promise<UserResponse>;
  }

  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }

  if (res.status === 409) {
    throw new ApiError(409, { email: ['Користувач з такою поштою вже існує'] });
  }

  throw new ApiError(res.status);
}

export async function updateProfile(data: UpdateProfileRequest, token: string): Promise<UserResponse> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 200) {
    return res.json() as Promise<UserResponse>;
  }

  if (res.status === 409) {
    throw new ApiError(409, { email: ['// цей email вже використовується'] });
  }

  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }

  throw new ApiError(res.status);
}

export async function deactivateAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/deactivate`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.status === 200 || res.status === 204) return;
  throw new ApiError(res.status);
}

export async function restoreAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/restore`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.status === 200 || res.status === 204) return;
  throw new ApiError(res.status);
}

export async function deleteAccount(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (res.status === 200 || res.status === 204) return;
  throw new ApiError(res.status);
}

export async function changePassword(
  data: { currentPassword: string; newPassword: string },
  token: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/users/me/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 200 || res.status === 204) return;

  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }

  if (res.status === 401) {
    throw new ApiError(401, { currentPassword: ['// невірний поточний пароль'] });
  }

  throw new ApiError(res.status);
}
