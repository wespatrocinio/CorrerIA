import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { obterCorredor } from '../api/corredor';
import { obterSemana } from '../api/semanas';
import { atualizarTreino, criarTreino } from '../api/treinos';
import { criarBlocosPadrao, novoBlocoCustomizado, TEMPLATES_POR_TIPO } from '../blocos';
import BarraTopo from '../components/BarraTopo';
import type { Bloco, CategoriaRealizacao, Corredor, Nivel, StatusTreino, Treino } from '../types';
import { formatarData, formatarMin, textoIntervalo, totalTreino } from '../utils';

const TIPOS_TREINO = ['Regenerativo', 'Rodagem leve', 'Tempo run', 'Longo', 'Fartlek', 'VO2', 'Customizado'];

const NIVEIS_INTENSIDADE: { nivel: Nivel; label: string }[] = [
  { nivel: 'aquecimento_desaquecimento', label: 'Aquec./Desaq.' },
  { nivel: 'leve', label: 'Leve' },
  { nivel: 'moderado', label: 'Moderado' },
  { nivel: 'forte', label: 'Forte' },
  { nivel: 'muito_forte', label: 'Muito forte' },
];

const CATEGORIAS_REALIZACAO: { valor: CategoriaRealizacao; label: string }[] = [
  { valor: 'como_planejado', label: 'Como planejado' },
  { valor: 'melhor_que_planejado', label: 'Melhor que o planejado' },
  { valor: 'aquem_do_planejado', label: 'Aquém do planejado' },
];

function labelTipoBloco(tipo: Bloco['tipo']): string {
  const labels: Record<Bloco['tipo'], string> = {
    aquecimento: 'Aquecimento',
    principal: 'Principal',
    recuperacao: 'Recuperação',
    desaquecimento: 'Desaquecimento',
    repeticao: 'Repetição',
  };
  return labels[tipo] ?? tipo;
}

export default function EditarTreino() {
  const { cicloId, semanaId, diaId } = useParams<{ cicloId: string; semanaId: string; diaId: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [corredor, setCorredor] = useState<Corredor | null>(null);
  const [dataDia, setDataDia] = useState('');
  const [treinoOriginalId, setTreinoOriginalId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Treino | null>(null);

  useEffect(() => {
    if (!semanaId || !diaId) return;
    let cancelado = false;
    Promise.all([obterCorredor(), obterSemana(semanaId)]).then(([corredorRes, semanaRes]) => {
      if (cancelado) return;
      setCorredor(corredorRes);
      const dia = semanaRes.dias.find((d) => d.id === diaId);
      setDataDia(dia?.data ?? '');
      if (dia?.treino) {
        setTreinoOriginalId(dia.treino.id);
        setDraft(JSON.parse(JSON.stringify(dia.treino)));
      }
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [semanaId, diaId]);

  function escolherTipo(tipo: string) {
    const template = TEMPLATES_POR_TIPO[tipo] ?? 'customizado';
    setDraft({
      id: treinoOriginalId ?? '',
      tipo,
      template_estrutural: template as Treino['template_estrutural'],
      contexto: draft?.contexto ?? 'rua',
      status: 'planejado',
      realizacao_categoria: null,
      km_realizado: null,
      link_registro: null,
      observacoes: draft?.observacoes ?? null,
      total_km: 0,
      total_min: 0,
      blocos: criarBlocosPadrao(template),
    });
  }

  function voltarSemSalvar() {
    navigate(`/ciclo/${cicloId}/semana/${semanaId}`);
  }

  async function salvar() {
    if (!draft || !diaId) return;
    setSalvando(true);
    setErro(null);
    try {
      let idParaSalvar = treinoOriginalId;
      if (!idParaSalvar) {
        const criado = await criarTreino(diaId, draft.tipo);
        idParaSalvar = criado.id;
      }
      await atualizarTreino(idParaSalvar, {
        tipo: draft.tipo,
        template_estrutural: draft.template_estrutural,
        contexto: draft.contexto,
        status: draft.status,
        realizacao_categoria: draft.realizacao_categoria,
        km_realizado: draft.km_realizado,
        link_registro: draft.link_registro,
        observacoes: draft.observacoes,
        blocos: draft.blocos,
      });
      navigate(`/ciclo/${cicloId}/semana/${semanaId}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
      setSalvando(false);
    }
  }

  if (carregando || !corredor) return <div className="tela-carregando">Carregando...</div>;

  if (!draft) {
    return (
      <div className="tela tela-escolha-tipo">
        <BarraTopo />
        <h1>
          {formatarData(dataDia)} · {treinoOriginalId ? 'Trocar tipo de treino' : 'Novo treino'}
        </h1>
        <p className="subtitulo">Escolha o tipo de treino do dia</p>
        <div className="chips chips-coluna">
          {TIPOS_TREINO.map((t) => (
            <button type="button" key={t} className="chip" onClick={() => escolherTipo(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="btn btn-secundario" onClick={voltarSemSalvar}>
          Voltar sem salvar
        </button>
      </div>
    );
  }

  const total = totalTreino(corredor, draft.blocos);
  const podeRemover = draft.template_estrutural === 'customizado';

  function atualizarBloco(blocoId: string, mudanca: Partial<Bloco>) {
    setDraft((d) => (d ? { ...d, blocos: d.blocos.map((b) => (b.id === blocoId ? { ...b, ...mudanca } : b)) } : d));
  }

  function atualizarSubBloco(blocoPaiId: string, subIndice: number, mudanca: Partial<Bloco>) {
    setDraft((d) =>
      d
        ? {
            ...d,
            blocos: d.blocos.map((b) =>
              b.id === blocoPaiId
                ? { ...b, sub_blocos: b.sub_blocos.map((sb, i) => (i === subIndice ? { ...sb, ...mudanca } : sb)) }
                : b,
            ),
          }
        : d,
    );
  }

  function removerBloco(blocoId: string) {
    setDraft((d) => (d ? { ...d, blocos: d.blocos.filter((b) => b.id !== blocoId) } : d));
  }

  function adicionarBloco() {
    setDraft((d) => {
      if (!d) return d;
      const ordemMax = Math.max(0, ...d.blocos.map((b) => b.ordem));
      return { ...d, blocos: [...d.blocos, novoBlocoCustomizado(ordemMax + 1)] };
    });
  }

  return (
    <div className="tela tela-editar-treino">
      <BarraTopo />
      <div className="cabecalho-treino">
        <div>
          <h1>{formatarData(dataDia)}</h1>
          <span>{draft.tipo}</span>
          <button type="button" className="link-trocar-tipo" onClick={() => setDraft(null)}>
            Trocar tipo de treino
          </button>
        </div>
        <div className="seletor-contexto">
          <button
            type="button"
            className={`chip ${draft.contexto === 'rua' ? 'chip-selecionado' : ''}`}
            onClick={() => setDraft({ ...draft, contexto: 'rua' })}
          >
            Rua (ritmo)
          </button>
          <button
            type="button"
            className={`chip ${draft.contexto === 'esteira' ? 'chip-selecionado' : ''}`}
            onClick={() => setDraft({ ...draft, contexto: 'esteira' })}
          >
            Esteira (velocidade)
          </button>
        </div>
      </div>

      <div className="lista-blocos">
        {draft.blocos
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((bloco) =>
            bloco.tipo === 'repeticao' ? (
              <CardRepeticao
                key={bloco.id}
                bloco={bloco}
                corredor={corredor}
                contexto={draft.contexto}
                podeRemover={podeRemover}
                onRemover={() => removerBloco(bloco.id)}
                onMudar={(m) => atualizarBloco(bloco.id, m)}
                onMudarSub={(i, m) => atualizarSubBloco(bloco.id, i, m)}
              />
            ) : (
              <CardBloco
                key={bloco.id}
                bloco={bloco}
                corredor={corredor}
                contexto={draft.contexto}
                podeRemover={podeRemover}
                onRemover={() => removerBloco(bloco.id)}
                onMudar={(m) => atualizarBloco(bloco.id, m)}
              />
            ),
          )}
      </div>

      {podeRemover && (
        <button className="btn btn-secundario" onClick={adicionarBloco}>
          + Adicionar bloco
        </button>
      )}

      <div className="rodape-treino">
        <span>{total.km.toFixed(1)} km</span>
        <span>{formatarMin(total.min)}</span>
      </div>

      <div className="secao-observacoes">
        <label className="rotulo-campo" htmlFor="observacoes">
          Observações
        </label>
        <textarea
          id="observacoes"
          rows={3}
          placeholder="Anotações sobre o treino..."
          value={draft.observacoes ?? ''}
          onChange={(e) => setDraft({ ...draft, observacoes: e.target.value })}
        />
      </div>

      <SecaoRealizacao draft={draft} setDraft={setDraft} />

      {erro && <p className="mensagem-erro">{erro}</p>}

      <button className="btn btn-primario" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar treino'}
      </button>
      <button className="btn btn-secundario" onClick={voltarSemSalvar}>
        Voltar sem salvar
      </button>
    </div>
  );
}

function CardBloco({
  bloco,
  corredor,
  contexto,
  podeRemover,
  onRemover,
  onMudar,
}: {
  bloco: Bloco;
  corredor: Corredor;
  contexto: 'rua' | 'esteira';
  podeRemover: boolean;
  onRemover: () => void;
  onMudar: (m: Partial<Bloco>) => void;
}) {
  return (
    <div className="card-bloco">
      <div className="card-bloco-titulo">
        {podeRemover ? (
          <input
            className="input-nome-bloco"
            value={bloco.nome ?? labelTipoBloco(bloco.tipo)}
            onChange={(e) => onMudar({ nome: e.target.value })}
          />
        ) : (
          labelTipoBloco(bloco.tipo)
        )}
        {podeRemover && (
          <button className="btn-remover-bloco" onClick={onRemover}>
            ×
          </button>
        )}
      </div>
      <div className="linha-duracao">
        <input
          type="number"
          min={0}
          step={0.1}
          value={bloco.duracao_valor}
          onChange={(e) => onMudar({ duracao_valor: parseFloat(e.target.value) || 0 })}
        />
        <select
          className="input-select"
          value={bloco.duracao_unidade}
          onChange={(e) => onMudar({ duracao_unidade: e.target.value as Bloco['duracao_unidade'] })}
        >
          <option value="km">km</option>
          <option value="min">min</option>
        </select>
      </div>
      {bloco.intensidade_congelada ? (
        <div className="aviso-congelado">Congelado em {bloco.intensidade_congelada}/km (dia já passou)</div>
      ) : (
        <>
          <div className="seletor-intensidade">
            {NIVEIS_INTENSIDADE.map((n) => (
              <button
                type="button"
                key={n.nivel}
                className={`chip chip-intensidade ${bloco.intensidade === n.nivel ? 'chip-selecionado' : ''}`}
                onClick={() => onMudar({ intensidade: n.nivel })}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="intervalo-intensidade">{textoIntervalo(corredor, contexto, bloco.intensidade)}</div>
        </>
      )}
    </div>
  );
}

function CardRepeticao({
  bloco,
  corredor,
  contexto,
  podeRemover,
  onRemover,
  onMudar,
  onMudarSub,
}: {
  bloco: Bloco;
  corredor: Corredor;
  contexto: 'rua' | 'esteira';
  podeRemover: boolean;
  onRemover: () => void;
  onMudar: (m: Partial<Bloco>) => void;
  onMudarSub: (indice: number, m: Partial<Bloco>) => void;
}) {
  return (
    <div className="card-bloco card-repeticao">
      <div className="card-bloco-titulo">
        {podeRemover ? (
          <input className="input-nome-bloco" value={bloco.nome ?? 'Repetição'} onChange={(e) => onMudar({ nome: e.target.value })} />
        ) : (
          'Repetição'
        )}
        {podeRemover && (
          <button className="btn-remover-bloco" onClick={onRemover}>
            ×
          </button>
        )}
      </div>
      <label>Nº de séries</label>
      <input
        type="number"
        min={1}
        value={bloco.repeticoes ?? 1}
        onChange={(e) => onMudar({ repeticoes: parseInt(e.target.value, 10) || 1 })}
      />
      {bloco.sub_blocos.map((sb, i) => (
        <div className="sub-bloco" key={sb.id}>
          <strong>{i === 0 ? 'Tiro' : 'Recuperação'}</strong>
          <div className="linha-duracao">
            <input
              type="number"
              min={0}
              step={0.1}
              value={sb.duracao_valor}
              onChange={(e) => onMudarSub(i, { duracao_valor: parseFloat(e.target.value) || 0 })}
            />
            <select
              className="input-select"
              value={sb.duracao_unidade}
              onChange={(e) => onMudarSub(i, { duracao_unidade: e.target.value as Bloco['duracao_unidade'] })}
            >
              <option value="km">km</option>
              <option value="min">min</option>
            </select>
          </div>
          <div className="seletor-intensidade">
            {NIVEIS_INTENSIDADE.map((n) => (
              <button
                type="button"
                key={n.nivel}
                className={`chip chip-intensidade ${sb.intensidade === n.nivel ? 'chip-selecionado' : ''}`}
                onClick={() => onMudarSub(i, { intensidade: n.nivel })}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="intervalo-intensidade">{textoIntervalo(corredor, contexto, sb.intensidade)}</div>
        </div>
      ))}
    </div>
  );
}

function SecaoRealizacao({ draft, setDraft }: { draft: Treino; setDraft: (t: Treino) => void }) {
  const realizado = draft.status === 'realizado';
  return (
    <div className="secao-realizacao">
      <label className="checkbox-realizado">
        <input
          type="checkbox"
          checked={realizado}
          onChange={(e) => setDraft({ ...draft, status: (e.target.checked ? 'realizado' : 'planejado') as StatusTreino })}
        />
        Marcar como realizado
      </label>
      {realizado && (
        <div className="campos-realizacao">
          <label className="rotulo-campo">Como foi, comparado ao planejado?</label>
          <div className="chips">
            {CATEGORIAS_REALIZACAO.map((c) => (
              <button
                type="button"
                key={c.valor}
                className={`chip ${draft.realizacao_categoria === c.valor ? 'chip-selecionado' : ''}`}
                onClick={() => setDraft({ ...draft, realizacao_categoria: c.valor })}
              >
                {c.label}
              </button>
            ))}
          </div>
          <label className="rotulo-campo" htmlFor="km-realizado">
            Km realizada (opcional)
          </label>
          <input
            id="km-realizado"
            type="number"
            min={0}
            step={0.1}
            placeholder="ex: 10"
            value={draft.km_realizado ?? ''}
            onChange={(e) => setDraft({ ...draft, km_realizado: e.target.value ? parseFloat(e.target.value) : null })}
          />
          <label className="rotulo-campo" htmlFor="link-registro">
            Link do registro — Strava, Garmin Connect etc. (opcional)
          </label>
          <input
            id="link-registro"
            type="text"
            placeholder="https://..."
            value={draft.link_registro ?? ''}
            onChange={(e) => setDraft({ ...draft, link_registro: e.target.value || null })}
          />
        </div>
      )}
    </div>
  );
}
