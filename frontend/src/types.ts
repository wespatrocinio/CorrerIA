// Espelha backend/app/schemas.py — mantenha os dois em sincronia.

export type Nivel = 'aquecimento_desaquecimento' | 'leve' | 'moderado' | 'forte' | 'muito_forte';

export interface Corredor {
  id: string;
  faixa_aquecimento_desaquecimento: string;
  faixa_leve: string;
  faixa_moderado: string;
  faixa_forte: string;
  faixa_muito_forte: string;
  nome: string | null;
  sobrenome: string | null;
  data_nascimento: string | null;
  altura_cm: number | null;
  peso_kg: number | null;
  genero: string | null;
}

export interface Objetivo {
  id: string;
  tipo: string;
  meta: string | null;
  data_alvo: string | null;
}

export interface Ciclo {
  id: string;
  objetivo: Objetivo;
  data_inicio: string;
  duracao_semanas: number;
  meta_volume_semanal_km: number | null;
}

export type EstadoSemana = 'passada' | 'atual' | 'futura_planejada' | 'futura_vazia';

export interface SemanaResumo {
  id: string;
  numero: number;
  data_inicio: string;
  data_fim: string;
  status: EstadoSemana;
  volume_planejado_km: number;
  volume_planejado_min: number;
  volume_realizado_km: number;
  n_treinos: number;
}

export interface Bloco {
  id: string;
  ordem: number;
  tipo: 'aquecimento' | 'principal' | 'recuperacao' | 'desaquecimento' | 'repeticao';
  nome: string | null;
  duracao_valor: number;
  duracao_unidade: 'km' | 'min';
  intensidade: Nivel | null;
  intensidade_congelada: string | null;
  repeticoes: number | null;
  sub_blocos: Bloco[];
}

export type StatusTreino = 'planejado' | 'realizado';
export type CategoriaRealizacao = 'como_planejado' | 'melhor_que_planejado' | 'aquem_do_planejado';

export interface Treino {
  id: string;
  tipo: string;
  template_estrutural: 'bloco_unico' | 'aquecimento_principal_desaquecimento' | 'aquecimento_loop_desaquecimento' | 'customizado';
  contexto: 'rua' | 'esteira';
  status: StatusTreino;
  realizacao_categoria: CategoriaRealizacao | null;
  km_realizado: number | null;
  link_registro: string | null;
  observacoes: string | null;
  total_km: number;
  total_min: number;
  blocos: Bloco[];
}

export interface Dia {
  id: string;
  data: string;
  treino: Treino | null;
}

export interface SemanaDetalhe {
  id: string;
  numero: number;
  dias: Dia[];
  volume_planejado_km: number;
  volume_planejado_min: number;
  volume_realizado_km: number;
}
