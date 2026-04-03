const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('polyx_token');
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('polyx_token');
      window.location.href = '/';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res;
}

export const api = {
  async get<T = unknown>(path: string): Promise<T> {
    const res = await apiFetch(path);
    return res.json();
  },
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await apiFetch(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },
  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await apiFetch(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },
  async delete<T = unknown>(path: string): Promise<T> {
    const res = await apiFetch(path, { method: 'DELETE' });
    return res.json();
  },
};
