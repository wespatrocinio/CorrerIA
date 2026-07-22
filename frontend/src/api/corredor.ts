import { apiFetch } from './client';
import type { Corredor } from '../types';

export function obterCorredor() {
  return apiFetch<Corredor>('/corredor');
}

export function salvarCorredor(dados: Omit<Corredor, 'id'>) {
  return apiFetch<Corredor>('/corredor', { method: 'PUT', body: JSON.stringify(dados) });
}
