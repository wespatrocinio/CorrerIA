import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { obterCorredor } from '../api/corredor';
import { obterExecucaoGarmin, sincronizarGarmin } from '../api/garmin';
import { obterSemana } from '../api/semanas';
import BarraTopo from '../components/BarraTopo';
import InfoTreino from '../components/InfoTreino';
import type { Bloco, Corredor, Dia, ExecucaoGarmin, Treino } from '../types';
import {
  formatarData,
  formatarMin,
  formatarPaceDecimal,
  labelCategoriaRealizacao,
  labelTipoBloco,
  textoIntervalo,
} from '../utils';

export default function VisualizarTreino() {
  const { cicloId, semanaId, diaId } = useParams<{ cicloId: string; semanaId: string; diaId: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [corredor, setCorredor] = useState<Corredor | null>(null);
  const [dia, setDia] = useState<Dia | null>(null);
  const [execucaoGarmin, setExecucaoGarmin] = useState<ExecucaoGarmin | null>(null);
  const [carregandoGarmin, setCarregandoGarmin] = useState(true);

  useEffect(() => {
    if (!semanaId || !diaId) return;
    let cancelado = false;
    Promise.all([obterCorredor(), obterSemana(semanaId)]).then(([corredorRes, semanaRes]) => {
      if (cancelado) return;
      setCorredor(corredorRes);
      setDia(semanaRes.dias.find((d) => d.id === diaId) ?? null);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [semanaId, diaId]);

  const treinoId = dia?.treino?.id;
  useEffect(() => {
    if (!treinoId) {
      setCarregandoGarmin(false);
      return;
    }
    let cancelado = false;
    obterExecucaoGarmin(treinoId).then((res) => {
      if (cancelado) return;
      setExecucaoGarmin(res);
      setCarregandoGarmin(false);
    });
    return () => {
      cancelado = true;
    };
  }, [treinoId]);

  if (carregando || !corredor) return <div className="tela-carregando">Carregando...</div>;

  if (!dia || !dia.treino) {
    return <Navigate to={`/ciclo/${cicloId}/semana/${semanaId}/dia/${diaId}/editar`} replace />;
  }

  const treino = dia.treino;
  const ehDescanso = treino.template_estrutural === 'descanso';
  const iconeContexto = treino.contexto === 'esteira' ? '🏠 Esteira' : '🛣️ Rua';
  const blocosRaiz = treino.blocos.slice().sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="tela tela-visualizar-treino">
      <BarraTopo />

      <div className="cabecalho-visualizar">
        <h1>{formatarData(dia.data)}</h1>
        <div className="cabecalho-visualizar-topo">
          <span className="tipo-treino">{treino.tipo}</span>
          {!ehDescanso && <span className="contexto-treino">{iconeContexto}</span>}
        </div>
        <InfoTreino tipo={treino.tipo} />
      </div>

      {ehDescanso ? (
        <div className="card-descanso">
          <div className="icone-descanso">😴</div>
          <strong>Dia de descanso</strong>
          <p className="subtitulo">Sem treino programado para hoje.</p>
        </div>
      ) : (
        <>
          <div className="lista-blocos-view">
            {blocosRaiz.map((bloco) =>
              bloco.tipo === 'repeticao' ? (
                <CardRepeticaoView key={bloco.id} bloco={bloco} corredor={corredor} contexto={treino.contexto} />
              ) : (
                <CardBlocoView key={bloco.id} bloco={bloco} corredor={corredor} contexto={treino.contexto} />
              ),
            )}
          </div>

          <div className="rodape-treino">
            <span>{treino.total_km.toFixed(1)} km</span>
            <span>{formatarMin(treino.total_min)}</span>
          </div>
        </>
      )}

      {treino.observacoes && (
        <div className="secao-observacoes-view">
          <strong>Observações</strong>
          <p>{treino.observacoes}</p>
        </div>
      )}

      {treino.status === 'realizado' && (
        <div className="secao-realizacao-view">
          <strong>
            ✅ Realizado{treino.realizacao_categoria ? ` · ${labelCategoriaRealizacao(treino.realizacao_categoria)}` : ''}
          </strong>
          {treino.km_realizado != null && <p>{treino.km_realizado.toFixed(1)} km realizados</p>}
          {treino.link_registro && (
            <p>
              <a href={treino.link_registro} target="_blank" rel="noreferrer">
                Ver registro
              </a>
            </p>
          )}
        </div>
      )}

      {!carregandoGarmin && (
        <SecaoGarmin
          treinoId={treino.id}
          treino={treino}
          execucao={execucaoGarmin}
          onSincronizado={setExecucaoGarmin}
        />
      )}

      <button
        className="btn btn-primario"
        onClick={() => navigate(`/ciclo/${cicloId}/semana/${semanaId}/dia/${diaId}/editar`)}
      >
        Editar treino
      </button>
      <button className="btn btn-secundario" onClick={() => navigate(`/ciclo/${cicloId}/semana/${semanaId}`)}>
        Voltar para a semana
      </button>
    </div>
  );
}

function CardBlocoView({
  bloco,
  corredor,
  contexto,
}: {
  bloco: Bloco;
  corredor: Corredor;
  contexto: 'rua' | 'esteira';
}) {
  return (
    <div className="card-bloco-view">
      <div className="card-bloco-view-titulo">{bloco.nome || labelTipoBloco(bloco.tipo)}</div>
      <div>
        <span className="valor-destaque">{bloco.duracao_valor}</span>
        <span className="unidade-destaque">{bloco.duracao_unidade}</span>
      </div>
      {bloco.intensidade_congelada ? (
        <div className="aviso-congelado">Congelado em {bloco.intensidade_congelada}/km (dia já passou)</div>
      ) : bloco.intensidade ? (
        <div className="ritmo-destaque">{textoIntervalo(corredor, contexto, bloco.intensidade)}</div>
      ) : null}
    </div>
  );
}

function CardRepeticaoView({
  bloco,
  corredor,
  contexto,
}: {
  bloco: Bloco;
  corredor: Corredor;
  contexto: 'rua' | 'esteira';
}) {
  return (
    <div className="card-bloco-view">
      <div className="card-bloco-view-titulo">{bloco.nome || 'Repetição'}</div>
      <span className="badge-repeticao-view">{bloco.repeticoes}x</span>
      {bloco.sub_blocos.map((sb, i) => (
        <div className="sub-bloco-view" key={sb.id}>
          <div className="sub-bloco-view-label">{i === 0 ? 'Tiro' : 'Recuperação'}</div>
          <span className="valor-destaque">{sb.duracao_valor}</span>
          <span className="unidade-destaque">{sb.duracao_unidade}</span>
          {sb.intensidade_congelada ? (
            <div className="aviso-congelado">Congelado em {sb.intensidade_congelada}/km</div>
          ) : sb.intensidade ? (
            <div className="ritmo-destaque">{textoIntervalo(corredor, contexto, sb.intensidade)}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SecaoGarmin({
  treinoId,
  treino,
  execucao,
  onSincronizado,
}: {
  treinoId: string;
  treino: Treino;
  execucao: ExecucaoGarmin | null;
  onSincronizado: (e: ExecucaoGarmin) => void;
}) {
  const [url, setUrl] = useState('');
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function sincronizar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSincronizando(true);
    try {
      const resultado = await sincronizarGarmin(treinoId, url.trim());
      onSincronizado(resultado);
      setMostrarForm(false);
      setUrl('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao buscar dados do Garmin');
    } finally {
      setSincronizando(false);
    }
  }

  if (!execucao) {
    return (
      <div className="secao-garmin">
        <h2 className="subtitulo-secao">Garmin Connect</h2>
        <form onSubmit={sincronizar}>
          <label className="rotulo-campo" htmlFor="garmin-url">
            Link público da atividade
          </label>
          <input
            id="garmin-url"
            type="text"
            placeholder="https://connect.garmin.com/modern/activity/..."
            value={url}
            onChange={(ev) => setUrl(ev.target.value)}
            required
          />
          <p className="aviso-data-inicio">
            A atividade precisa estar marcada como pública (Garmin Connect → atividade → Editar → Visibilidade →
            Todos).
          </p>
          {erro && <p className="mensagem-erro">{erro}</p>}
          <button className="btn btn-primario" type="submit" disabled={sincronizando}>
            {sincronizando ? 'Buscando no Garmin (~15s)...' : 'Buscar dados do Garmin'}
          </button>
        </form>
      </div>
    );
  }

  const deltaKm = execucao.distancia_km != null ? execucao.distancia_km - treino.total_km : null;
  const classeDelta =
    deltaKm == null || Math.abs(deltaKm) < 0.3 ? '' : deltaKm > 0 ? 'delta-positivo' : 'delta-negativo';

  return (
    <div className="secao-garmin">
      <h2 className="subtitulo-secao">Garmin Connect</h2>
      {execucao.nome_atividade && <p className="nome-atividade-garmin">{execucao.nome_atividade}</p>}

      <div className="comparacao-garmin">
        <div className="comparacao-garmin-coluna">
          <span className="rotulo-volume">Planejado</span>
          <span className="valor-destaque">{treino.total_km.toFixed(1)}</span>
          <span className="unidade-destaque">km</span>
          <span>{formatarMin(treino.total_min)}</span>
        </div>
        <div className="comparacao-garmin-coluna">
          <span className="rotulo-volume">Realizado</span>
          <span className="valor-destaque">{execucao.distancia_km?.toFixed(1) ?? '—'}</span>
          <span className="unidade-destaque">km</span>
          <span>{execucao.duracao_min != null ? formatarMin(execucao.duracao_min) : '—'}</span>
        </div>
      </div>

      {deltaKm != null && (
        <p className={classeDelta}>
          {deltaKm > 0 ? '+' : ''}
          {deltaKm.toFixed(1)} km vs. planejado
        </p>
      )}

      <div className="grade-metricas-garmin">
        {execucao.ritmo_medio_min_km != null && (
          <MetricaGarmin label="Ritmo médio" valor={formatarPaceDecimal(execucao.ritmo_medio_min_km)} />
        )}
        {execucao.fc_media != null && (
          <MetricaGarmin label="FC média/máx" valor={`${execucao.fc_media.toFixed(0)}/${execucao.fc_maxima?.toFixed(0) ?? '—'} bpm`} />
        )}
        {execucao.cadencia_media != null && (
          <MetricaGarmin label="Cadência média" valor={`${execucao.cadencia_media.toFixed(0)} passos/min`} />
        )}
        {execucao.passada_cm != null && <MetricaGarmin label="Passada" valor={`${execucao.passada_cm.toFixed(0)} cm`} />}
        {execucao.elevacao_ganho_m != null && (
          <MetricaGarmin
            label="Elevação"
            valor={`+${execucao.elevacao_ganho_m.toFixed(0)}m / -${execucao.elevacao_perda_m?.toFixed(0) ?? 0}m`}
          />
        )}
      </div>

      {execucao.zonas_fc.length > 0 && (
        <div className="zonas-fc">
          <span className="rotulo-campo">Tempo em zonas de FC</span>
          {execucao.zonas_fc.map((z) => (
            <div key={z.zona} className="zona-fc-linha">
              <span>Zona {z.zona} (≥{z.limite_inferior_bpm} bpm)</span>
              <span>{formatarMin(z.minutos)}</span>
            </div>
          ))}
        </div>
      )}

      {execucao.splits.length > 0 && (
        <div className="splits-garmin">
          <span className="rotulo-campo">Splits</span>
          {execucao.splits.map((sp, i) => (
            <div key={i} className="split-garmin-linha">
              <span>{sp.tipo}</span>
              <span>{sp.distancia_km.toFixed(2)} km</span>
              {sp.fc_media != null && <span>{sp.fc_media.toFixed(0)} bpm</span>}
            </div>
          ))}
        </div>
      )}

      <a href={execucao.url} target="_blank" rel="noreferrer" className="btn-link">
        Ver no Garmin Connect
      </a>

      {mostrarForm ? (
        <form onSubmit={sincronizar}>
          <input
            type="text"
            placeholder="https://connect.garmin.com/modern/activity/..."
            value={url}
            onChange={(ev) => setUrl(ev.target.value)}
            required
          />
          {erro && <p className="mensagem-erro">{erro}</p>}
          <button className="btn btn-primario" type="submit" disabled={sincronizando}>
            {sincronizando ? 'Buscando...' : 'Buscar novamente'}
          </button>
          <button
            type="button"
            className="btn btn-secundario"
            onClick={() => setMostrarForm(false)}
            disabled={sincronizando}
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button type="button" className="btn btn-secundario" onClick={() => setMostrarForm(true)}>
          Ressincronizar
        </button>
      )}
    </div>
  );
}

function MetricaGarmin({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="metrica-garmin">
      <span className="rotulo-volume">{label}</span>
      <span>{valor}</span>
    </div>
  );
}
