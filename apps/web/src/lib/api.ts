'use client';

/** Browser-side API client. Same-origin: Next.js rewrites /api/v1/* to the API service. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public detail?: string,
  ) {
    super(code);
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: init.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const code = typeof data.error === 'string' ? data.error : res.status === 401 ? 'not_authenticated' : res.status === 403 ? 'forbidden' : 'request_failed';
    throw new ApiError(res.status, code, typeof data.detail === 'string' ? data.detail : undefined);
  }
  return data as T;
}

export interface Me {
  userId: string;
  email: string;
  fullName: string;
  locale: 'om' | 'am' | 'en';
  mfaEnabled: boolean;
  assignments: { id: string; roleKey: string; orgId: string | null; sportCode: string | null; territoryId: string | null }[];
  permissions: string[];
}
