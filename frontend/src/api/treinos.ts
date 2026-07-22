import { apiFetch } from './client';
import type { Bloco, CategoriaRealizacao, StatusTreino, Treino } from '../types';

export function criarTreino(diaId: string, tipo: string) {
  return apiFetch<Treino>(`/dias/${diaId}/treino`, { method: 'POST', body: JSON.stringify({ tipo }) });
}

export interface TreinoUpdateInput {
  tipo: string;
  template_estrutural: string;
  contexto: string;
  status: StatusTreino;
  realizacao_categoria: CategoriaRealizacao | null;
  km_realizado: number | null;
  link_registro: string | null;
  observacoes: string | null;
  blocos: Bloco[];
}

export function atualizarTreino(id: string, dados: TreinoUpdateInput) {
  return apiFetch<Treino>(`/treinos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}
