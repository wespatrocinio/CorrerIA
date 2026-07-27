import { apiFetch } from './client';
import type { Ponto } from '../types';

export function listarPontos() {
  return apiFetch<Ponto[]>('/pontos');
}

export function criarPonto(nome: string) {
  return apiFetch<Ponto>('/pontos', { method: 'POST', body: JSON.stringify({ nome }) });
}

export function excluirPonto(id: string) {
  return apiFetch<void>(`/pontos/${id}`, { method: 'DELETE' });
}
