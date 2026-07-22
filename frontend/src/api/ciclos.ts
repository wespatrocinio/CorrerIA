import { apiFetch } from './client';
import type { Ciclo, SemanaResumo } from '../types';

export interface ObjetivoInput {
  tipo: string;
  meta: string | null;
  data_alvo: string | null;
}

export function listarCiclos() {
  return apiFetch<Ciclo[]>('/ciclos');
}

export function criarCiclo(dados: { objetivo: ObjetivoInput; data_inicio: string; duracao_semanas: number }) {
  return apiFetch<Ciclo>('/ciclos', { method: 'POST', body: JSON.stringify(dados) });
}

export function obterCiclo(id: string) {
  return apiFetch<Ciclo>(`/ciclos/${id}`);
}

export function atualizarCiclo(
  id: string,
  dados: { objetivo: ObjetivoInput; data_inicio: string; meta_volume_semanal_km: number | null },
) {
  return apiFetch<Ciclo>(`/ciclos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function listarSemanas(cicloId: string) {
  return apiFetch<SemanaResumo[]>(`/ciclos/${cicloId}/semanas`);
}
