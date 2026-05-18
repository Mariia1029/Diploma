import type { TemplateDetailResponse, CreateTemplateRequest } from '../types/template';
import { ApiError } from './usersApi';

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

export async function getTemplates(token: string): Promise<TemplateDetailResponse[]> {
  const res = await fetch(`${BASE_URL}/templates`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<TemplateDetailResponse[]>;
  return throwOnError(res);
}

export async function createTemplate(
  token: string,
  data: CreateTemplateRequest,
): Promise<TemplateDetailResponse> {
  const res = await fetch(`${BASE_URL}/templates`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (res.status === 201) return res.json() as Promise<TemplateDetailResponse>;
  return throwOnError(res);
}

export async function deleteTemplate(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/templates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204) return;
  return throwOnError(res);
}
