import { apiFetch } from './client';
import type { Corredor } from '../types';

export interface FaixasInput {
  faixa_aquecimento_desaquecimento: string;
  faixa_leve: string;
  faixa_moderado: string;
  faixa_forte: string;
  faixa_muito_forte: string;
}

export interface PerfilPessoalInput {
  nome: string | null;
  sobrenome: string | null;
  data_nascimento: string | null;
  altura_cm: number | null;
  peso_kg: number | null;
  genero: string | null;
}

export function obterCorredor() {
  return apiFetch<Corredor>('/corredor');
}

export function salvarCorredor(dados: FaixasInput) {
  return apiFetch<Corredor>('/corredor', { method: 'PUT', body: JSON.stringify(dados) });
}

export function salvarPerfilPessoal(dados: PerfilPessoalInput) {
  return apiFetch<Corredor>('/corredor/perfil', { method: 'PUT', body: JSON.stringify(dados) });
}
