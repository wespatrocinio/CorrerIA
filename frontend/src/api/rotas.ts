import { apiFetch } from './client';
import type { Rota, RotaResumo } from '../types';

export interface RotaTrechoInput {
  trecho_id: string;
  invertido: boolean;
}

export interface RotaInput {
  nome: string;
  trechos: RotaTrechoInput[];
}

export function listarRotas() {
  return apiFetch<RotaResumo[]>('/rotas');
}

export function criarRota(dados: RotaInput) {
  return apiFetch<Rota>('/rotas', { method: 'POST', body: JSON.stringify(dados) });
}

export function excluirRota(id: string) {
  return apiFetch<void>(`/rotas/${id}`, { method: 'DELETE' });
}
