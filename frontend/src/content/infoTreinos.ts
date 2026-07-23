export interface InfoTreino {
  descricao: string;
  beneficios: string[];
}

export const INFO_TREINOS: Record<string, InfoTreino> = {
  Regenerativo: {
    descricao:
      'Corrida bem leve e curta, em ritmo confortável, feita para ativar a circulação sem acrescentar fadiga.',
    beneficios: [
      'Acelera a recuperação entre treinos mais puxados',
      'Mantém a rotina de corrida sem sobrecarregar o corpo',
      'Ajuda a "soltar" a musculatura após esforços intensos',
    ],
  },
  'Rodagem leve': {
    descricao: 'Corrida contínua em ritmo confortável — a base do treinamento aeróbico.',
    beneficios: [
      'Constrói e mantém a base aeróbica',
      'Fortalece músculos, tendões e articulações com baixo risco de lesão',
      'Melhora a capacidade de usar gordura como energia',
    ],
  },
  'Tempo run': {
    descricao:
      'Bloco contínuo em ritmo forte, sustentado por um período mais longo — o clássico "ritmo de prova confortavelmente difícil".',
    beneficios: [
      'Eleva o limiar anaeróbico (o ritmo que você sustenta por mais tempo)',
      'Treina a mente a tolerar desconforto controlado',
      'Melhora a eficiência de corrida em ritmos mais rápidos',
    ],
  },
  Longo: {
    descricao: 'Corrida mais longa que as demais da semana, em ritmo leve a moderado.',
    beneficios: [
      'Desenvolve resistência muscular e cardiovascular',
      'Prepara o corpo (e a cabeça) para distâncias de prova',
      'Melhora a eficiência no uso de gordura como combustível',
    ],
  },
  Fartlek: {
    descricao:
      '"Jogo de velocidade" — alterna tiros fortes com trechos de recuperação leve, de forma mais livre que um treino intervalado clássico.',
    beneficios: [
      'Melhora a capacidade de variar o ritmo durante a corrida',
      'Desenvolve velocidade e resistência ao mesmo tempo',
      'Quebra a monotonia do treino contínuo',
    ],
  },
  VO2: {
    descricao:
      'Tiros curtos em intensidade muito forte, intercalados com recuperação — foco em elevar o consumo máximo de oxigênio.',
    beneficios: [
      'Aumenta o VO2 máximo (capacidade aeróbica máxima)',
      'Melhora a velocidade máxima sustentável',
      'Eleva a economia de corrida em ritmos rápidos',
    ],
  },
  Customizado: {
    descricao: 'Treino montado livremente, com os blocos e intensidades que você definir.',
    beneficios: ['Flexibilidade total para adaptar o treino à sua necessidade do momento'],
  },
  Descanso: {
    descricao: 'Dia sem corrida — o corpo recupera e se adapta aos estímulos dos treinos anteriores.',
    beneficios: [
      'Permite a recuperação física e mental',
      'Reduz o risco de lesões por excesso de treino (overtraining)',
      'É parte essencial do processo de evoluir — a adaptação acontece no descanso, não só no treino',
    ],
  },
};
