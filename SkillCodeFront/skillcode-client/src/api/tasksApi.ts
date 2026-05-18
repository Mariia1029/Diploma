import type { CreateTaskRequest, TaskDetailResponse, PublicTaskResponse, GenerateTaskRequest, AiGeneratedTaskResponse, SetTaskStatusRequest, TaskVisibility } from '../types/task';
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

export async function saveTask(token: string, taskId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/saved/${taskId}`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (res.status === 201 || res.status === 200 || res.status === 204) return;
  return throwOnError(res);
}

export async function getSavedTasks(token: string): Promise<TaskDetailResponse[]> {
  const res = await fetch(`${BASE_URL}/tasks/saved`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<TaskDetailResponse[]>;
  return throwOnError(res);
}

export async function unsaveTask(token: string, taskId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/saved/${taskId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function setTaskStatus(
  token: string,
  taskId: string,
  status: TaskVisibility,
): Promise<void> {
  const body: SetTaskStatusRequest = { status };
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function deleteTask(token: string, taskId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function getTaskById(token: string, taskId: string): Promise<TaskDetailResponse> {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<TaskDetailResponse>;
  return throwOnError(res);
}

export async function getMyTasks(token: string): Promise<TaskDetailResponse[]> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<TaskDetailResponse[]>;
  return throwOnError(res);
}

export async function getPublicTasks(token: string): Promise<PublicTaskResponse[]> {
  const res = await fetch(`${BASE_URL}/tasks/public`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<PublicTaskResponse[]>;
  return throwOnError(res);
}

export async function createTask(
  token: string,
  data: CreateTaskRequest,
): Promise<TaskDetailResponse> {
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (res.status === 201) return res.json() as Promise<TaskDetailResponse>;
  return throwOnError(res);
}

export async function generateTask(
  token: string,
  data: GenerateTaskRequest,
): Promise<AiGeneratedTaskResponse> {
  const res = await fetch(`${BASE_URL}/ai/generate-task`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (res.status === 200 || res.status === 201) return res.json() as Promise<AiGeneratedTaskResponse>;
  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    console.error('[generateTask] 400 response body:', body);
    const errors = (body.errors ?? body.Errors ?? {}) as Record<string, string[]>;
    const message = (body.message ?? body.Message ?? body.title ?? body.Title ?? '') as string;
    if (Object.keys(errors).length > 0) throw new ApiError(400, errors);
    throw new ApiError(400, message ? { '': [message] } : {});
  }
  const errText = await res.text().catch(() => '');
  console.error(`[generateTask] ${res.status} response body:`, errText);
  const errMessage = (() => {
    try { const j = JSON.parse(errText) as Record<string, unknown>; return (j.detail ?? j.message ?? j.Message ?? j.title ?? '') as string; }
    catch { return errText; }
  })();
  throw new ApiError(res.status, errMessage ? { '': [errMessage] } : {});
}

export const LANG_TO_AI_LANG: Record<string, string> = {
  Python:     'python',
  JavaScript: 'java_script',
  TypeScript: 'type_script',
  'C#':       'c#',
  'C++':      'c++',
  C:          'c',
  Java:       'java',
  Go:         'go',
  Rust:       'rust',
};

export const AI_LANG_OPTIONS: { label: string; value: string }[] = [
  { label: 'Python',     value: 'python'      },
  { label: 'Java',       value: 'java'        },
  { label: 'C#',         value: 'c#'          },
  { label: 'C++',        value: 'c++'         },
  { label: 'C',          value: 'c'           },
  { label: 'JavaScript', value: 'java_script' },
  { label: 'TypeScript', value: 'type_script' },
  { label: 'Go',         value: 'go'          },
  { label: 'Rust',       value: 'rust'        },
];

/** Maps the UI language display name to the backend ProgrammingLanguage enum member name. */
export const LANG_TO_ENUM: Record<string, string> = {
  Python:     'Python',
  JavaScript: 'JavaScript',
  TypeScript: 'TypeScript',
  'C#':       'CSharp',
  'C++':      'Cpp',
  C:          'C',
  Java:       'Java',
  Go:         'Go',
  Rust:       'Rust',
};
