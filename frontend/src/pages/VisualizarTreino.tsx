import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { obterCorredor } from '../api/corredor';
import { obterSemana } from '../api/semanas';
import BarraTopo from '../components/BarraTopo';
import InfoTreino from '../components/InfoTreino';
import type { Bloco, Corredor, Dia } from '../types';
import { formatarData, formatarMin, labelCategoriaRealizacao, labelTipoBloco, textoIntervalo } from '../utils';

export default function VisualizarTreino() {
  const { cicloId, semanaId, diaId } = useParams<{ cicloId: string; semanaId: string; diaId: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [corredor, setCorredor] = useState<Corredor | null>(null);
  const [dia, setDia] = useState<Dia | null>(null);

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
