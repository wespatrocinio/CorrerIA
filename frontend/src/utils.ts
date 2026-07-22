import type { Bloco, Corredor, Nivel } from './types';

export function formatarData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m}min`;
}

export function deltaVolumeSemana(kmReal: number, metaKm: number): { diff: number; texto: string } {
  const diff = kmReal - metaKm;
  if (Math.abs(diff) < 0.05) return { diff, texto: 'na meta' };
  const sinal = diff > 0 ? '+' : '';
  return { diff, texto: `${sinal}${diff.toFixed(1)} km vs. meta` };
}

export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calcularIdade(dataNascimentoISO: string): number {
  const hoje = new Date();
  const nascimento = new Date(`${dataNascimentoISO}T00:00:00`);
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversarioEsteAno =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
  if (aindaNaoFezAniversarioEsteAno) idade -= 1;
  return idade;
}

export const CATEGORIA_COR: Record<string, string> = {
  bloco_unico: 'cor-bloco-unico',
  aquecimento_principal_desaquecimento: 'cor-tempo-run',
  aquecimento_loop_desaquecimento: 'cor-intensidade',
  customizado: 'cor-customizado',
};

const DIAS_SEMANA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function labelDiaSemana(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00`);
  return DIAS_SEMANA_LABEL[d.getDay()];
}

const LABEL_CATEGORIA_REALIZACAO: Record<string, string> = {
  como_planejado: 'Como planejado',
  melhor_que_planejado: 'Melhor que o planejado',
  aquem_do_planejado: 'Aquém do planejado',
};

export function labelCategoriaRealizacao(valor: string | null): string {
  return valor ? (LABEL_CATEGORIA_REALIZACAO[valor] ?? '') : '';
}

// --- Ritmo/intensidade — porte de backend/app/logic.py (calcular_intervalo, faixa_do_corredor, total_treino) ---

export function calcularIntervalo(paceMinPorKm: string): { min: string; max: string } {
  const [minStr, segStr] = paceMinPorKm.split(':');
  const totalSeg = parseInt(minStr, 10) * 60 + parseInt(segStr, 10);
  const formatar = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };
  return { min: formatar(totalSeg - 10), max: formatar(totalSeg + 10) };
}

export function paceParaVelocidade(paceMinPorKm: string): string {
  const [m, s] = paceMinPorKm.split(':').map(Number);
  const totalMin = m + s / 60;
  return (60 / totalMin).toFixed(1);
}

export function faixaDoCorredor(corredor: Corredor, nivel: Nivel | null): string | null {
  if (!nivel) return null;
  const campo = `faixa_${nivel}` as keyof Corredor;
  return (corredor[campo] as string) ?? null;
}

export function textoIntervalo(corredor: Corredor, contexto: 'rua' | 'esteira', nivel: Nivel | null): string {
  if (!nivel) return '';
  const paceCentral = faixaDoCorredor(corredor, nivel);
  if (!paceCentral) return '';
  const intervalo = calcularIntervalo(paceCentral);
  if (contexto === 'esteira') {
    const min = paceParaVelocidade(intervalo.max);
    const max = paceParaVelocidade(intervalo.min);
    return `${min}–${max} km/h`;
  }
  return `${intervalo.min}–${intervalo.max}/km`;
}

function paceDecimalDoBloco(corredor: Corredor, bloco: Bloco): number | null {
  const paceStr = bloco.intensidade_congelada || (bloco.intensidade ? faixaDoCorredor(corredor, bloco.intensidade) : null);
  if (!paceStr) return null;
  const [m, s] = paceStr.split(':').map(Number);
  return m + s / 60;
}

export function duracaoBlocoEmKmMin(corredor: Corredor, bloco: Bloco): { km: number; min: number } {
  let km = 0;
  let min = 0;

  const somar = (b: Bloco) => {
    const pace = paceDecimalDoBloco(corredor, b);
    if (b.duracao_unidade === 'km') {
      km += b.duracao_valor;
      if (pace) min += b.duracao_valor * pace;
    } else {
      min += b.duracao_valor;
      if (pace) km += b.duracao_valor / pace;
    }
  };

  if (bloco.tipo === 'repeticao' && bloco.sub_blocos.length > 0) {
    for (let i = 0; i < (bloco.repeticoes || 0); i++) {
      bloco.sub_blocos.forEach(somar);
    }
  } else {
    somar(bloco);
  }

  return { km, min };
}

export function totalTreino(corredor: Corredor, blocos: Bloco[]): { km: number; min: number } {
  return blocos.reduce(
    (acc, b) => {
      const { km, min } = duracaoBlocoEmKmMin(corredor, b);
      return { km: acc.km + km, min: acc.min + min };
    },
    { km: 0, min: 0 },
  );
}
