import type { LoginRequest, LoginResponse } from '../types/auth';
import { ApiError } from './usersApi';

import { BASE_URL } from './config';

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (res.status === 200) {
    return res.json() as Promise<LoginResponse>;
  }

  if (res.status === 401) {
    throw new ApiError(401, { general: ['Невірний email або пароль'] });
  }

  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }

  throw new ApiError(res.status);
}

export async function sendPasswordResetCode(email: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (res.status === 200 || res.status === 204) return;
  if (res.status === 404) {
    throw new ApiError(404, { email: ['// користувача з таким email не знайдено'] });
  }
  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }
  throw new ApiError(res.status);
}

export async function verifyResetCode(email: string, code: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (res.status === 200 || res.status === 204) return;
  if (res.status === 400) {
    throw new ApiError(400, { code: ['// невірний код'] });
  }
  throw new ApiError(res.status);
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  if (res.status === 200 || res.status === 204) return;
  if (res.status === 400) {
    const body = await res.json();
    throw new ApiError(400, body.errors ?? {});
  }
  throw new ApiError(res.status);
}
