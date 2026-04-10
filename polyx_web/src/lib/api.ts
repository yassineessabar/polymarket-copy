const API_BASE = "";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("polyx_token");
}

export function setToken(token: string) {
  localStorage.setItem("polyx_token", token);
}

export function clearToken() {
  localStorage.removeItem("polyx_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/auth";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }

  return res.json();
}

// Auth
export const authApi = {
  nonce: (wallet_address: string) =>
    apiFetch<{ nonce: string; user_id: number }>("/api/v1/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ wallet_address }),
    }),
  verify: (wallet_address: string, signature: string) =>
    apiFetch<{ token: string; user: any }>("/api/v1/auth/verify", {
      method: "POST",
      body: JSON.stringify({ wallet_address, signature }),
    }),
  magicLink: (email: string) =>
    apiFetch<{ message: string; dev_token?: string }>("/api/v1/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  magicVerify: (token: string) =>
    apiFetch<{ token: string; user: any }>("/api/v1/auth/magic-verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
};

// User
export const userApi = {
  me: () => apiFetch<any>("/api/v1/me"),
  updateSettings: (settings: Record<string, any>) =>
    apiFetch<any>("/api/v1/me/settings", {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),
};

// Portfolio
export const portfolioApi = {
  summary: () => apiFetch<any>("/api/v1/portfolio/summary"),
  positions: (status: "open" | "closed" = "open", limit = 5000) =>
    apiFetch<{ positions: any[] }>(`/api/v1/portfolio/positions?status=${status}&limit=${limit}`),
  trades: (limit = 50, offset = 0) =>
    apiFetch<{ trades: any[] }>(`/api/v1/portfolio/trades?limit=${limit}&offset=${offset}`),
  performance: (days = 30) =>
    apiFetch<{ daily: any[] }>(`/api/v1/portfolio/performance?days=${days}`),
};

// Copy Trading
export const copyApi = {
  targets: () => apiFetch<{ targets: any[] }>("/api/v1/copy/targets"),
  addTarget: (wallet_address: string, display_name = "") =>
    apiFetch<any>("/api/v1/copy/targets", {
      method: "POST",
      body: JSON.stringify({ wallet_address, display_name }),
    }),
  removeTarget: (wallet_address: string) =>
    apiFetch<any>(`/api/v1/copy/targets/${wallet_address}`, { method: "DELETE" }),
  start: () => apiFetch<any>("/api/v1/copy/start", { method: "POST" }),
  stop: () => apiFetch<any>("/api/v1/copy/stop", { method: "POST" }),
  status: () => apiFetch<any>("/api/v1/copy/status"),
  suggested: () => apiFetch<{ traders: any[] }>("/api/v1/copy/suggested"),
};

// Payments
export const paymentsApi = {
  checkout: () => apiFetch<{ checkout_url: string }>("/api/v1/payments/checkout", { method: "POST" }),
  status: () => apiFetch<any>("/api/v1/payments/status"),
};

// Notifications
export const notificationsApi = {
  list: (unread_only = false, limit = 50) =>
    apiFetch<{ notifications: any[]; unread_count: number }>(
      `/api/v1/notifications?unread_only=${unread_only}&limit=${limit}`
    ),
  markRead: (ids: number[] = [], all = false) =>
    apiFetch<any>("/api/v1/notifications/read", {
      method: "POST",
      body: JSON.stringify({ ids, all }),
    }),
};

// Markets
export const marketsApi = {
  browse: (category = "", limit = 10) =>
    apiFetch<{ markets: any[] }>(`/api/v1/markets?category=${category}&limit=${limit}`),
};

// Trader Analytics (real-time from Polymarket)
export const traderApi = {
  all: () => apiFetch<{ traders: any[] }>("/api/v1/traders/analytics"),
  one: (wallet: string) => apiFetch<any>(`/api/v1/traders/analytics/${wallet}`),
};

// Reconciliation (Sharky6999 comparison)
export const reconciliationApi = {
  sharky: (limit = 100) =>
    apiFetch<any>(`/api/v1/reconciliation/sharky?limit=${limit}`),
  importTrades: (limit = 100) =>
    apiFetch<any>(`/api/v1/reconciliation/import?limit=${limit}`, { method: "POST" }),
  compare: (limit = 100) =>
    apiFetch<any>(`/api/v1/reconciliation/compare?limit=${limit}`),
};
