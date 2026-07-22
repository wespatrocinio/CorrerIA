import { apiFetch, setToken } from './client';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function registrar(email: string, senha: string): Promise<string> {
  const res = await apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  setToken(res.access_token);
  return res.access_token;
}

export async function login(email: string, senha: string): Promise<string> {
  const res = await apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  setToken(res.access_token);
  return res.access_token;
}

export function logout() {
  setToken(null);
}
