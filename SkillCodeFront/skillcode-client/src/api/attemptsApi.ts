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

export interface AttemptResponse {
  id: string;
  userId: string;
  taskId: string;
  contextType: string;
  contextId: string | null;
  earnedPoints: number;
  maxPoints: number;
  status: string;
  durationSeconds: number | null;
  startedAt: string;
  finishedAt: string | null;
  timeLimitSeconds: number | null;
}

export interface AttemptDetailResponse extends AttemptResponse {
  answers: AttemptAnswerResponse[];
}

export interface AttemptAnswerResponse {
  id: string;
  attemptId: string;
  taskItemId: string;
  userAnswer: string | null;
  isCorrect: boolean | null;
  earnedPoints: number | null;
  aiExplanation: string | null;
  answeredAt: string;
}

export interface StartAttemptRequest {
  taskId: string;
  contextType: string;
  contextId: string | null;
}

export interface SaveAnswerRequest {
  taskItemId: string;
  userAnswer: unknown;
  answeredAt: string;
}

export interface UpdateAnswerGradeRequest {
  earnedPoints: number;
  aiExplanation: string;
}

export interface ExplainAttemptAnswerRequest {
  question: string;
  userAnswer: string | null;
  correctAnswer: string;
  language: string | null;
  options: string | null;
}

export async function startAttempt(
  token: string,
  req: StartAttemptRequest,
): Promise<AttemptResponse> {
  const res = await fetch(`${BASE_URL}/attempts`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(req),
  });
  if (res.status === 201) return res.json() as Promise<AttemptResponse>;
  return throwOnError(res);
}

export async function saveAnswer(
  token: string,
  attemptId: string,
  req: SaveAnswerRequest,
): Promise<AttemptAnswerResponse> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}/answers`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(req),
  });
  if (res.status === 200) return res.json() as Promise<AttemptAnswerResponse>;
  return throwOnError(res);
}

export async function finishAttempt(
  token: string,
  attemptId: string,
): Promise<AttemptResponse> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}/finish`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<AttemptResponse>;
  return throwOnError(res);
}

export async function updateAnswerGrade(
  token: string,
  attemptId: string,
  answerId: string,
  req: UpdateAnswerGradeRequest,
): Promise<AttemptAnswerResponse> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}/answers/${answerId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(req),
  });
  if (res.status === 200) return res.json() as Promise<AttemptAnswerResponse>;
  return throwOnError(res);
}

export async function deleteAttempt(token: string, attemptId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 204 || res.status === 200) return;
  return throwOnError(res);
}

export async function getAttemptsByTask(
  token: string,
  taskId: string,
  contextType?: string,
  contextId?: string,
): Promise<AttemptResponse[]> {
  const params = new URLSearchParams({ taskId });
  if (contextType) params.set('contextType', contextType);
  if (contextId)   params.set('contextId',   contextId);
  const res = await fetch(`${BASE_URL}/attempts?${params.toString()}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<AttemptResponse[]>;
  return throwOnError(res);
}

export async function getAttemptById(
  token: string,
  attemptId: string,
): Promise<AttemptDetailResponse> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<AttemptDetailResponse>;
  return throwOnError(res);
}

export async function explainAttemptAnswer(
  token: string,
  attemptId: string,
  answerId: string,
  req: ExplainAttemptAnswerRequest,
): Promise<AttemptAnswerResponse> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}/answers/${answerId}/explain`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(req),
  });
  if (res.status === 200) return res.json() as Promise<AttemptAnswerResponse>;
  return throwOnError(res);
}

export async function getAttemptAnswers(
  token: string,
  attemptId: string,
): Promise<AttemptAnswerResponse[]> {
  const res = await fetch(`${BASE_URL}/attempts/${attemptId}/answers`, {
    headers: authHeaders(token),
  });
  if (res.status === 200) return res.json() as Promise<AttemptAnswerResponse[]>;
  return throwOnError(res);
}
