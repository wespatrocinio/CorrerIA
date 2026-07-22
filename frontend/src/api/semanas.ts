import { apiFetch } from './client';
import type { SemanaDetalhe } from '../types';

export function obterSemana(id: string) {
  return apiFetch<SemanaDetalhe>(`/semanas/${id}`);
}

export function duplicarSemana(semanaDestinoId: string, semanaOrigemId: string) {
  return apiFetch<SemanaDetalhe>(`/semanas/${semanaDestinoId}/duplicar`, {
    method: 'POST',
    body: JSON.stringify({ semana_origem_id: semanaOrigemId }),
  });
}
