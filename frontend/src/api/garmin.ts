import { apiFetch } from './client';
import type { ExecucaoGarmin } from '../types';

export function obterExecucaoGarmin(treinoId: string) {
  return apiFetch<ExecucaoGarmin | null>(`/treinos/${treinoId}/garmin`);
}

export function sincronizarGarmin(treinoId: string, url: string) {
  return apiFetch<ExecucaoGarmin>(`/treinos/${treinoId}/garmin`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}
