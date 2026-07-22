const API_BASE = 'http://localhost:8000/api';
const TOKEN_KEY = 'correria_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let currentToken: string | null = localStorage.getItem(TOKEN_KEY);

export function setToken(token: string | null) {
  currentToken = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return currentToken;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (currentToken) headers.Authorization = `Bearer ${currentToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText;
    throw new ApiError(res.status, typeof detail === 'string' ? detail : 'Erro ao falar com a API');
  }

  return data as T;
}
