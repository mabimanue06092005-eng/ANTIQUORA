export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string> & Record<string, unknown>,
  ) {
    super(message);
  }
  /** Field-level messages for forms ({ field: message }). */
  get fields(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !this.details) return {};
    return Object.fromEntries(Object.entries(this.details).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  }
}

export interface Envelope<T> {
  data: T;
  meta?: { page: number; pageSize: number; total: number; totalPages: number };
}

function csrfToken() {
  const m = document.cookie.match(/(?:^|;\s*)aq_csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

let csrfReady: Promise<void> | null = null;
async function ensureCsrf() {
  if (csrfToken()) return;
  csrfReady ??= fetch('/api/csrf', { credentials: 'include' }).then(() => undefined);
  await csrfReady;
}

export async function request<T>(method: string, url: string, body?: unknown): Promise<Envelope<T>> {
  const unsafe = method !== 'GET';
  if (unsafe) await ensureCsrf();
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
        ...(unsafe ? { 'X-CSRF-Token': csrfToken() } : {}),
      },
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'We could not reach the server. Please check your connection and try again.');
  }
  const text = await res.text();
  let json: { data?: T; meta?: Envelope<T>['meta']; error?: { code: string; message: string; details?: Record<string, string> } } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', res.status >= 500 ? 'The server is unavailable right now. Please try again shortly.' : 'Unexpected response from server.');
  }
  if (!res.ok || json.error) {
    const e = json.error ?? { code: 'HTTP_ERROR', message: `Request failed (${res.status})` };
    throw new ApiError(res.status, e.code, e.message, e.details);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url).then((r) => r.data),
  page: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}).then((r) => r.data),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body ?? {}).then((r) => r.data),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body ?? {}).then((r) => r.data),
  del: <T>(url: string) => request<T>('DELETE', url).then((r) => r.data),
  upload: <T>(url: string, form: FormData) => request<T>('POST', url, form).then((r) => r.data),
};

export const qs = (params: Record<string, string | number | boolean | undefined | null>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
};
