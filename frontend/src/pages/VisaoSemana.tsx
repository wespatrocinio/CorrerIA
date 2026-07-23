import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { listarSemanas } from '../api/ciclos';
import { obterSemana } from '../api/semanas';
import BarraTopo from '../components/BarraTopo';
import type { Dia } from '../types';
import { CATEGORIA_COR, formatarData, formatarMin, labelCategoriaRealizacao, labelDiaSemana } from '../utils';

export default function VisaoSemana() {
  const { cicloId, semanaId } = useParams<{ cicloId: string; semanaId: string }>();
  const navigate = useNavigate();

  const semanaQuery = useQuery({
    queryKey: ['semana', semanaId],
    queryFn: () => obterSemana(semanaId!),
    enabled: !!semanaId,
  });

  const semanasQuery = useQuery({
    queryKey: ['semanas', cicloId],
    queryFn: () => listarSemanas(cicloId!),
    enabled: !!cicloId,
  });

  if (semanaQuery.isLoading || semanasQuery.isLoading) {
    return <div className="tela-carregando">Carregando...</div>;
  }
  if (semanaQuery.isError || !semanaQuery.data) {
    return <div className="tela-carregando">Erro ao carregar a semana.</div>;
  }

  const semana = semanaQuery.data;
  const semanasDoCiclo = semanasQuery.data ?? [];
  const indice = semanasDoCiclo.findIndex((s) => s.id === semana.id);
  const anterior = semanasDoCiclo[indice - 1];
  const proxima = semanasDoCiclo[indice + 1];

  return (
    <div className="tela tela-visao-semana">
      <BarraTopo />
      <div className="nav-semana">
        <button
          className="btn btn-icone"
          disabled={!anterior}
          onClick={() => anterior && navigate(`/ciclo/${cicloId}/semana/${anterior.id}`)}
        >
          ‹
        </button>
        <div className="resumo-semana">
          <strong>Semana {semana.numero}</strong>
          <span>
            {formatarData(semana.dias[0].data)} – {formatarData(semana.dias[semana.dias.length - 1].data)}
          </span>
          <span>
            {semana.volume_planejado_km.toFixed(1)} km · {formatarMin(semana.volume_planejado_min)}
          </span>
        </div>
        <button
          className="btn btn-icone"
          disabled={!proxima}
          onClick={() => proxima && navigate(`/ciclo/${cicloId}/semana/${proxima.id}`)}
        >
          ›
        </button>
      </div>

      <div className="lista-dias">
        {semana.dias.map((dia) => (
          <LinhaDia
            key={dia.id}
            dia={dia}
            onClicar={() => navigate(`/ciclo/${cicloId}/semana/${semanaId}/dia/${dia.id}`)}
          />
        ))}
      </div>

      <button className="btn btn-secundario" onClick={() => navigate(`/ciclo/${cicloId}`)}>
        Voltar para o ciclo
      </button>
    </div>
  );
}

function LinhaDia({ dia, onClicar }: { dia: Dia; onClicar: () => void }) {
  const label = labelDiaSemana(dia.data);

  if (!dia.treino) {
    return (
      <div className="linha-dia clicavel" onClick={onClicar}>
        <div className="linha-dia-topo">
          <div className="linha-dia-data">
            <strong>{label}</strong>
            <span>{formatarData(dia.data)}</span>
          </div>
          <div className="linha-dia-tipo">Descanso</div>
        </div>
      </div>
    );
  }

  const treino = dia.treino;
  const corCategoria = CATEGORIA_COR[treino.template_estrutural];
  const ehDescanso = treino.template_estrutural === 'descanso';
  const iconeContexto = ehDescanso ? '😴' : treino.contexto === 'esteira' ? '🏠' : '🛣️';

  return (
    <div className="linha-dia clicavel" onClick={onClicar}>
      <div className="linha-dia-topo">
        <div className="linha-dia-data">
          <strong>{label}</strong>
          <span>{formatarData(dia.data)}</span>
        </div>
        <div className={`linha-dia-tipo ${corCategoria}`}>{treino.tipo}</div>
        <div className="linha-dia-contexto" title={treino.contexto}>
          {iconeContexto}
        </div>
        <div className="linha-dia-totais">
          <span>{treino.total_km.toFixed(1)} km</span>
          <span>{formatarMin(treino.total_min)}</span>
        </div>
      </div>
      <StatusRealizacao treino={treino} />
    </div>
  );
}

function StatusRealizacao({ treino }: { treino: NonNullable<Dia['treino']> }) {
  if (treino.status !== 'realizado') {
    return <div className="linha-dia-status status-planejado">Planejado</div>;
  }
  const kmReal = treino.km_realizado ?? treino.total_km;
  const deltaKm = kmReal - treino.total_km;
  const deltaTexto =
    Math.abs(deltaKm) < 0.05 ? 'igual ao planejado' : `${deltaKm > 0 ? '+' : ''}${deltaKm.toFixed(1)} km vs. planejado`;
  const categoria = labelCategoriaRealizacao(treino.realizacao_categoria);

  return (
    <div className="linha-dia-status status-realizado">
      <span>✅ Realizado{categoria ? ` · ${categoria}` : ''}</span>
      <span>
        {kmReal.toFixed(1)} km ({deltaTexto})
      </span>
    </div>
  );
}
