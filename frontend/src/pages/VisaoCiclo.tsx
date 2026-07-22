import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { listarSemanas, obterCiclo } from '../api/ciclos';
import { duplicarSemana } from '../api/semanas';
import type { SemanaResumo } from '../types';
import { deltaVolumeSemana, formatarData, formatarMin } from '../utils';

const CLASSES_ESTADO: Record<string, string> = {
  passada: 'semana-passada',
  atual: 'semana-atual',
  futura_planejada: 'semana-futura-planejada',
  futura_vazia: 'semana-futura-vazia',
};

export default function VisaoCiclo() {
  const { cicloId } = useParams<{ cicloId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const cicloQuery = useQuery({
    queryKey: ['ciclo', cicloId],
    queryFn: () => obterCiclo(cicloId!),
    enabled: !!cicloId,
  });

  const semanasQuery = useQuery({
    queryKey: ['semanas', cicloId],
    queryFn: () => listarSemanas(cicloId!),
    enabled: !!cicloId,
  });

  const duplicarMutation = useMutation({
    mutationFn: ({ destino, origem }: { destino: string; origem: string }) => duplicarSemana(destino, origem),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semanas', cicloId] }),
  });

  if (cicloQuery.isLoading || semanasQuery.isLoading) {
    return <div className="tela-carregando">Carregando...</div>;
  }
  if (cicloQuery.isError || !cicloQuery.data) {
    return <div className="tela-carregando">Erro ao carregar o ciclo.</div>;
  }

  const ciclo = cicloQuery.data;
  const semanas = semanasQuery.data ?? [];

  const semanaAtual = semanas.find((s) => s.status === 'atual');
  const numeroAtual = semanaAtual ? semanaAtual.numero : semanas.filter((s) => s.status === 'passada').length;

  return (
    <div className="tela tela-visao-ciclo">
      <div className="cabecalho-ciclo">
        <h1>
          {ciclo.objetivo.tipo}
          {ciclo.objetivo.meta ? ` · ${ciclo.objetivo.meta}` : ''}
        </h1>
        <p className="detalhes-ciclo">
          {ciclo.duracao_semanas} semanas · início em {formatarData(ciclo.data_inicio)}
        </p>
        {ciclo.meta_volume_semanal_km != null && (
          <p className="detalhes-ciclo">Meta de volume: {ciclo.meta_volume_semanal_km} km/semana</p>
        )}
        <div className="barra-progresso">
          <div
            className="barra-progresso-preenchida"
            style={{ width: `${Math.min(100, (numeroAtual / ciclo.duracao_semanas) * 100)}%` }}
          />
        </div>
        <p className="progresso-texto">
          Semana {Math.max(numeroAtual, 0)} de {ciclo.duracao_semanas}
        </p>
      </div>

      <div className="lista-semanas">
        {semanas.map((semana, i) => (
          <CardSemana
            key={semana.id}
            semana={semana}
            anterior={semanas[i - 1]}
            metaVolumeSemanalKm={ciclo.meta_volume_semanal_km}
            onClicar={() => navigate(`/ciclo/${cicloId}/semana/${semana.id}`)}
            onDuplicar={(origemId) => duplicarMutation.mutate({ destino: semana.id, origem: origemId })}
          />
        ))}
      </div>

      <button className="btn btn-secundario" onClick={() => navigate(`/ciclo/${cicloId}/editar`)}>
        Editar objetivo e ciclo
      </button>
      <Link to="/onboarding" className="btn btn-secundario" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        Editar faixas de ritmo
      </Link>
      <Link to="/conta" className="btn btn-secundario" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }}>
        Minha conta
      </Link>
    </div>
  );
}

function CardSemana({
  semana,
  anterior,
  metaVolumeSemanalKm,
  onClicar,
  onDuplicar,
}: {
  semana: SemanaResumo;
  anterior?: SemanaResumo;
  metaVolumeSemanalKm: number | null;
  onClicar: () => void;
  onDuplicar: (origemId: string) => void;
}) {
  const intervaloDatas = `${formatarData(semana.data_inicio)} – ${formatarData(semana.data_fim)}`;

  if (semana.status === 'futura_vazia') {
    return (
      <div className={`card-semana ${CLASSES_ESTADO[semana.status]} clicavel`} onClick={onClicar}>
        <div className="card-semana-info">
          <strong>Semana {semana.numero}</strong>
          <span>{intervaloDatas}</span>
        </div>
        {anterior && (
          <button
            className="btn btn-secundario"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicar(anterior.id);
            }}
          >
            Duplicar semana {anterior.numero}
          </button>
        )}
      </div>
    );
  }

  const clicavel = semana.status !== 'passada';
  const delta = metaVolumeSemanalKm != null ? deltaVolumeSemana(semana.volume_planejado_km, metaVolumeSemanalKm) : null;
  const classeDelta = !delta || Math.abs(delta.diff) < 0.05 ? '' : delta.diff > 0 ? 'delta-positivo' : 'delta-negativo';

  return (
    <div
      className={`card-semana ${CLASSES_ESTADO[semana.status]} ${clicavel ? 'clicavel' : ''}`}
      onClick={clicavel ? onClicar : undefined}
    >
      <div className="card-semana-info">
        <strong>Semana {semana.numero}</strong> {semana.status === 'atual' && <span className="badge-atual">Semana atual</span>}
        <span>{intervaloDatas}</span>
      </div>
      <div className="card-semana-volume">
        <div className="linha-comparacao-volume">
          {metaVolumeSemanalKm != null && (
            <div className="item-volume">
              <span className="rotulo-volume">Meta</span>
              <span>{metaVolumeSemanalKm} km</span>
            </div>
          )}
          <div className="item-volume">
            <span className="rotulo-volume">Planejado</span>
            <span>{semana.volume_planejado_km.toFixed(1)} km</span>
          </div>
          <div className="item-volume">
            <span className="rotulo-volume">Realizado</span>
            <span>{semana.volume_realizado_km > 0 ? `${semana.volume_realizado_km.toFixed(1)} km` : '—'}</span>
          </div>
        </div>
        <span>
          {formatarMin(semana.volume_planejado_min)} planejados · {semana.n_treinos} treino{semana.n_treinos === 1 ? '' : 's'}
        </span>
        {delta && <span className={classeDelta}>{delta.texto}</span>}
      </div>
    </div>
  );
}
