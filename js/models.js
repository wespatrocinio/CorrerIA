// Regras de negócio e helpers de leitura/escrita sobre o estado plano.

const DIAS_POR_SEMANA = 7;
const TEMPLATES_POR_TIPO = {
  'Regenerativo': 'bloco_unico',
  'Rodagem leve': 'bloco_unico',
  'Longo': 'bloco_unico',
  'Tempo run': 'aquecimento_principal_desaquecimento',
  'Fartlek': 'aquecimento_loop_desaquecimento',
  'VO2': 'aquecimento_loop_desaquecimento',
  'Customizado': 'customizado',
};

// Categoria usada só para cor do rótulo na Tela 4 (seção 6, Tela 4).
const CATEGORIA_COR = {
  'bloco_unico': 'cor-bloco-unico',
  'aquecimento_principal_desaquecimento': 'cor-tempo-run',
  'aquecimento_loop_desaquecimento': 'cor-intensidade',
  'customizado': 'cor-customizado',
};

// Feedback de execução do treino (registro pós-treino, opcional).
const CATEGORIAS_REALIZACAO = [
  { valor: 'como_planejado', label: 'Como planejado' },
  { valor: 'melhor_que_planejado', label: 'Melhor que o planejado' },
  { valor: 'aquem_do_planejado', label: 'Aquém do planejado' },
];

function labelCategoriaRealizacao(valor) {
  const item = CATEGORIAS_REALIZACAO.find((c) => c.valor === valor);
  return item ? item.label : '';
}

function addDias(dataISO, n) {
  const d = new Date(dataISO + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function diasEntre(dataA, dataB) {
  const a = new Date(dataA + 'T00:00:00');
  const b = new Date(dataB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

// Muda a data de início do ciclo deslocando a data de todos os seus dias pela mesma
// diferença — preserva ids de dia/treino/bloco, então nenhum treino já planejado se perde.
function mudarDataInicioCiclo(estado, ciclo, novaDataInicio) {
  const delta = diasEntre(ciclo.data_inicio, novaDataInicio);
  if (delta === 0) return;
  const semanaIds = new Set(estado.semanas.filter((s) => s.ciclo_id === ciclo.id).map((s) => s.id));
  estado.dias.forEach((d) => {
    if (semanaIds.has(d.semana_id)) d.data = addDias(d.data, delta);
  });
  ciclo.data_inicio = novaDataInicio;
}

// Formato de exibição brasileiro — armazenamento e comparações continuam em ISO (YYYY-MM-DD).
function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Faixa central -> intervalo ±10s, calculado em runtime, nunca persistido.
function calcularIntervalo(minPorKm) {
  const [minStr, segStr] = minPorKm.split(':');
  const totalSeg = parseInt(minStr, 10) * 60 + parseInt(segStr, 10);
  const formatar = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };
  return {
    min: formatar(totalSeg - 10),
    max: formatar(totalSeg + 10),
  };
}

function faixaDoCorredor(corredor, nivel) {
  const campo = {
    aquecimento_desaquecimento: 'faixa_aquecimento_desaquecimento',
    leve: 'faixa_leve',
    moderado: 'faixa_moderado',
    forte: 'faixa_forte',
    muito_forte: 'faixa_muito_forte',
  }[nivel];
  return corredor[campo];
}

// Cria as Semanas + Dias (vazios, sem treino) de um Ciclo a partir de data_inicio.
function gerarDiasDoCiclo(estado, ciclo) {
  for (let n = 1; n <= ciclo.duracao_semanas; n++) {
    const semana = { id: uuid(), ciclo_id: ciclo.id, numero: n };
    estado.semanas.push(semana);
    const inicioSemana = addDias(ciclo.data_inicio, (n - 1) * DIAS_POR_SEMANA);
    for (let i = 0; i < DIAS_POR_SEMANA; i++) {
      estado.dias.push({ id: uuid(), semana_id: semana.id, data: addDias(inicioSemana, i) });
    }
  }
}

function diasDaSemana(estado, semanaId) {
  return estado.dias
    .filter((d) => d.semana_id === semanaId)
    .sort((a, b) => a.data.localeCompare(b.data));
}

function treinoDoDia(estado, diaId) {
  return estado.treinos.find((t) => t.dia_id === diaId) || null;
}

function blocosDoTreino(estado, treinoId) {
  return estado.blocos
    .filter((b) => b.treino_id === treinoId)
    .sort((a, b) => a.ordem - b.ordem);
}

// Ritmo (min/km, decimal) valendo para um bloco: congelado se existir, senão a faixa viva do perfil.
function paceDecimalDoBloco(estado, bloco) {
  const paceStr = bloco.intensidade_congelada || (bloco.intensidade ? faixaDoCorredor(estado.corredor, bloco.intensidade) : null);
  if (!paceStr) return null;
  const [m, s] = paceStr.split(':').map(Number);
  return m + s / 60;
}

// Duração de um bloco em km e minutos — a métrica não preenchida é estimada a partir do ritmo
// (km escolhido -> min estimado, min escolhido -> km estimado). Repetições somam seus sub-blocos.
function duracaoBlocoEmKmMin(estado, bloco) {
  let km = 0;
  let min = 0;
  const somar = (b) => {
    const pace = paceDecimalDoBloco(estado, b);
    if (b.duracao.unidade === 'km') {
      km += b.duracao.valor;
      if (pace) min += b.duracao.valor * pace;
    } else {
      min += b.duracao.valor;
      if (pace) km += b.duracao.valor / pace;
    }
  };
  if (bloco.tipo === 'repeticao' && bloco.subBlocos) {
    for (let i = 0; i < bloco.repeticoes; i++) {
      bloco.subBlocos.forEach(somar);
    }
  } else {
    somar(bloco);
  }
  return { km, min };
}

function totalTreino(estado, treinoId) {
  const blocos = blocosDoTreino(estado, treinoId);
  return blocos.reduce(
    (acc, b) => {
      const { km, min } = duracaoBlocoEmKmMin(estado, b);
      acc.km += km;
      acc.min += min;
      return acc;
    },
    { km: 0, min: 0 }
  );
}

function somarVolumeSemana(estado, semanaId) {
  const dias = diasDaSemana(estado, semanaId);
  const acc = { km: 0, min: 0, nTreinos: 0 };
  dias.forEach((dia) => {
    const treino = treinoDoDia(estado, dia.id);
    if (!treino) return;
    const { km, min } = totalTreino(estado, treino.id);
    acc.km += km;
    acc.min += min;
    acc.nTreinos += 1;
  });
  return acc;
}

// Km realizada de um treino já marcado como realizado — usa o valor informado pela pessoa,
// ou o planejado como aproximação caso ela não tenha preenchido a km realizada.
function kmRealizadoTreino(estado, treino) {
  if (treino.km_realizado != null) return treino.km_realizado;
  return totalTreino(estado, treino.id).km;
}

// Soma o volume dos treinos já marcados como realizados na semana (seção 6, Tela 3).
function somarVolumeRealizadoSemana(estado, semanaId) {
  const dias = diasDaSemana(estado, semanaId);
  const acc = { km: 0, nTreinos: 0 };
  dias.forEach((dia) => {
    const treino = treinoDoDia(estado, dia.id);
    if (!treino || treino.status !== 'realizado') return;
    acc.km += kmRealizadoTreino(estado, treino);
    acc.nTreinos += 1;
  });
  return acc;
}

// Diferença entre o volume real da semana e a meta de volume semanal do ciclo (seção 6, Tela 3).
function deltaVolumeSemana(kmReal, metaKm) {
  const diff = kmReal - metaKm;
  if (Math.abs(diff) < 0.05) return { diff, texto: 'na meta' };
  const sinal = diff > 0 ? '+' : '';
  return { diff, texto: `${sinal}${diff.toFixed(1)} km vs. meta` };
}

// Estado visual de uma semana na Tela 3.
function estadoVisualSemana(estado, semana) {
  const dias = diasDaSemana(estado, semana.id);
  const hoje = hojeISO();
  const ultimoDia = dias[dias.length - 1].data;
  const primeiroDia = dias[0].data;
  const temTreino = dias.some((d) => treinoDoDia(estado, d.id));
  if (ultimoDia < hoje) return 'passada';
  if (primeiroDia <= hoje && hoje <= ultimoDia) return 'atual';
  return temTreino ? 'futura_planejada' : 'futura_vazia';
}

// Cópia profunda editável da semana anterior — sem vínculo com a origem depois de duplicada.
function duplicarSemana(estado, semanaDestinoId, semanaOrigemId) {
  const destino = estado.semanas.find((s) => s.id === semanaDestinoId);
  const diasDestino = diasDaSemana(estado, semanaDestinoId);
  const diasOrigem = diasDaSemana(estado, semanaOrigemId);

  diasOrigem.forEach((diaOrigem, i) => {
    const diaDestino = diasDestino[i];
    const treinoOrigem = treinoDoDia(estado, diaOrigem.id);
    if (!treinoOrigem) return;

    const novoTreino = {
      id: uuid(),
      dia_id: diaDestino.id,
      tipo: treinoOrigem.tipo,
      template_estrutural: treinoOrigem.template_estrutural,
      contexto: treinoOrigem.contexto,
      status: 'planejado',
    };
    estado.treinos.push(novoTreino);

    blocosDoTreino(estado, treinoOrigem.id).forEach((blocoOrigem) => {
      const novoBloco = JSON.parse(JSON.stringify(blocoOrigem));
      novoBloco.id = uuid();
      novoBloco.treino_id = novoTreino.id;
      novoBloco.intensidade_congelada = null; // semana duplicada nasce sem congelamento
      estado.blocos.push(novoBloco);
    });
  });

  return destino;
}

// Congela a intensidade dos blocos de dias já passados que ainda não têm valor congelado.
// Roda como parte do fluxo de salvar edição de perfil (seção 4 da spec).
function congelarIntensidadesPassadas(estado) {
  const hoje = hojeISO();
  const corredor = estado.corredor;
  estado.dias
    .filter((d) => d.data < hoje)
    .forEach((dia) => {
      const treino = treinoDoDia(estado, dia.id);
      if (!treino) return;
      blocosDoTreino(estado, treino.id).forEach((bloco) => {
        if (bloco.intensidade_congelada) return;
        if (!bloco.intensidade) return;
        bloco.intensidade_congelada = faixaDoCorredor(corredor, bloco.intensidade);
      });
    });
}

// Valor de referência de intensidade a exibir: congelado se existir, senão a faixa viva do perfil.
function intensidadeEfetiva(estado, bloco) {
  if (bloco.intensidade_congelada) return bloco.intensidade_congelada;
  return faixaDoCorredor(estado.corredor, bloco.intensidade);
}

function formatarMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}
