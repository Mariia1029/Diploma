import { ApiError } from './usersApi';

import { BASE_URL } from './config';

const AI_TIMEOUT_MS = 200_000;

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function withTimeout(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export interface ExplainAnswerRequest {
  question: string;
  questionType: string;
  language: string;
  options: string | null;
  userAnswer: string;
  isCorrect: boolean | null;
}

export interface ExplainAnswerResponse {
  explanation: string;
}

export interface GradeAnswerRequest {
  question: string;
  userAnswer: string;
  maxScore: number;
}

export interface GradeAnswerResponse {
  score: number;
  feedback: string;
}

export async function gradeAnswer(
  token: string,
  req: GradeAnswerRequest,
): Promise<GradeAnswerResponse> {
  const { signal, clear } = withTimeout(AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/ai/grade-answer`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req),
      signal,
    });
    if (res.status === 200) return res.json() as Promise<GradeAnswerResponse>;
    const body = await res.json().catch(() => ({})) as { detail?: string };
    throw new ApiError(res.status, body.detail ? { '': [body.detail] } : {});
  } finally {
    clear();
  }
}

export async function explainAnswer(
  token: string,
  req: ExplainAnswerRequest,
): Promise<ExplainAnswerResponse> {
  const { signal, clear } = withTimeout(AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/ai/explain-answer`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req),
      signal,
    });
    if (res.status === 200) return res.json() as Promise<ExplainAnswerResponse>;
    const body = await res.json().catch(() => ({})) as { detail?: string };
    throw new ApiError(res.status, body.detail ? { '': [body.detail] } : {});
  } finally {
    clear();
  }
}
