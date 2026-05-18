import { BASE_URL } from './config';

const CODE_TIMEOUT_MS = 200_000;

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

export interface ExecuteRequest {
  language: string;
  code: string;
  callCode: string;
}

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestResult {
  index: number;
  passed: boolean;
  input?: string;
  stdout?: string;
  stderr?: string;
  output?: string;
  expected?: string;
  exitCode?: number;
}

export interface TestCasesRequest {
  taskItemId: string;
  code: string;
  language: string;
}

export interface TestCasesResponse {
  passed: boolean;
  passedCount: number;
  totalCount: number;
  testResults: TestResult[];
}

export async function executeCode(
  token: string,
  req: ExecuteRequest,
): Promise<ExecuteResponse> {
  const { signal, clear } = withTimeout(CODE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/code/execute`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req),
      signal,
    });
    if (res.ok) return res.json() as Promise<ExecuteResponse>;
    throw new Error(`HTTP ${res.status}`);
  } finally {
    clear();
  }
}

export async function testCode(
  token: string,
  req: TestCasesRequest,
): Promise<TestCasesResponse> {
  const { signal, clear } = withTimeout(CODE_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/code/test`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(req),
      signal,
    });
    if (res.ok) return res.json() as Promise<TestCasesResponse>;
    throw new Error(`HTTP ${res.status}`);
  } finally {
    clear();
  }
}
