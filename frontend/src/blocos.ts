// Porte de CorrerIA/js/screens/editar-treino.js (blocoPadrao/criarBlocosPadrao) para o rascunho local em React.
import type { Bloco, Nivel } from './types';

function uuid(): string {
  return crypto.randomUUID();
}

function blocoPadrao(tipo: Bloco['tipo'], valor: number, unidade: 'km' | 'min', intensidade: Nivel | null): Bloco {
  return {
    id: uuid(),
    ordem: 0,
    tipo,
    nome: null,
    duracao_valor: valor,
    duracao_unidade: unidade,
    intensidade,
    intensidade_congelada: null,
    repeticoes: null,
    sub_blocos: [],
  };
}

export const TEMPLATES_POR_TIPO: Record<string, string> = {
  Regenerativo: 'bloco_unico',
  'Rodagem leve': 'bloco_unico',
  Longo: 'bloco_unico',
  'Tempo run': 'aquecimento_principal_desaquecimento',
  Fartlek: 'aquecimento_loop_desaquecimento',
  VO2: 'aquecimento_loop_desaquecimento',
  Customizado: 'customizado',
  Descanso: 'descanso',
};

export function criarBlocosPadrao(template: string): Bloco[] {
  if (template === 'bloco_unico') {
    return [{ ...blocoPadrao('principal', 5, 'km', 'leve'), ordem: 1 }];
  }

  if (template === 'aquecimento_principal_desaquecimento') {
    return [
      { ...blocoPadrao('aquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 1 },
      { ...blocoPadrao('principal', 20, 'min', 'forte'), ordem: 2 },
      { ...blocoPadrao('desaquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 3 },
    ];
  }

  if (template === 'aquecimento_loop_desaquecimento') {
    const aquecimento = { ...blocoPadrao('aquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 1 };
    const tiro = { ...blocoPadrao('principal', 1, 'min', 'muito_forte'), ordem: 1 };
    const recuperacao = { ...blocoPadrao('recuperacao', 1, 'min', 'leve'), ordem: 2 };
    const repeticao: Bloco = {
      id: uuid(),
      ordem: 2,
      tipo: 'repeticao',
      nome: null,
      duracao_valor: 0,
      duracao_unidade: 'min',
      intensidade: null,
      intensidade_congelada: null,
      repeticoes: 6,
      sub_blocos: [tiro, recuperacao],
    };
    const desaquecimento = { ...blocoPadrao('desaquecimento', 10, 'min', 'aquecimento_desaquecimento'), ordem: 3 };
    return [aquecimento, repeticao, desaquecimento];
  }

  return []; // customizado começa vazio
}

export function novoBlocoCustomizado(ordem: number): Bloco {
  return { ...blocoPadrao('principal', 1, 'km', 'leve'), ordem };
}
