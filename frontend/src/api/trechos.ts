import { apiFetch } from './client';
import type { Trecho } from '../types';

export interface TrechoInput {
  nome: string | null;
  ponto_partida_id: string;
  ponto_chegada_id: string;
  distancia_km: number;
}

export function listarTrechos() {
  return apiFetch<Trecho[]>('/trechos');
}

export function criarTrecho(dados: TrechoInput) {
  return apiFetch<Trecho>('/trechos', { method: 'POST', body: JSON.stringify(dados) });
}

export function excluirTrecho(id: string) {
  return apiFetch<void>(`/trechos/${id}`, { method: 'DELETE' });
}
