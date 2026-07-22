import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { atualizarCiclo, obterCiclo } from '../api/ciclos';

const TIPOS_OBJETIVO = ['Prova', 'Completar uma distância', 'Recorde pessoal', 'Queimar calorias', 'Outro'];

export default function EditarCiclo() {
  const { cicloId } = useParams<{ cicloId: string }>();
  const navigate = useNavigate();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [tipo, setTipo] = useState(TIPOS_OBJETIVO[0]);
  const [meta, setMeta] = useState('');
  const [dataAlvo, setDataAlvo] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [metaVolume, setMetaVolume] = useState('');

  useEffect(() => {
    if (!cicloId) return;
    let cancelado = false;
    obterCiclo(cicloId).then((ciclo) => {
      if (cancelado) return;
      setTipo(ciclo.objetivo.tipo);
      setMeta(ciclo.objetivo.meta ?? '');
      setDataAlvo(ciclo.objetivo.data_alvo ?? '');
      setDataInicio(ciclo.data_inicio);
      setMetaVolume(ciclo.meta_volume_semanal_km != null ? String(ciclo.meta_volume_semanal_km) : '');
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [cicloId]);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!cicloId) return;
    setSalvando(true);
    setErro(null);
    try {
      await atualizarCiclo(cicloId, {
        objetivo: { tipo, meta: meta.trim() || null, data_alvo: dataAlvo || null },
        data_inicio: dataInicio,
        meta_volume_semanal_km: metaVolume.trim() ? parseFloat(metaVolume) : null,
      });
      navigate(`/ciclo/${cicloId}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="tela-carregando">Carregando...</div>;

  return (
    <div className="tela tela-objetivo-ciclo">
      <h1>Editar objetivo e ciclo</h1>
      <form onSubmit={salvar}>
        <label className="rotulo-campo">Objetivo</label>
        <div className="chips">
          {TIPOS_OBJETIVO.map((t) => (
            <button
              type="button"
              key={t}
              className={`chip ${t === tipo ? 'chip-selecionado' : ''}`}
              onClick={() => setTipo(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <label className="rotulo-campo" htmlFor="meta">Meta</label>
        <input
          id="meta"
          type="text"
          placeholder="ex: 10km da cidade, sub 50min"
          value={meta}
          onChange={(e) => setMeta(e.target.value)}
        />

        <label className="rotulo-campo" htmlFor="data-alvo">Data alvo (opcional)</label>
        <input id="data-alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />

        <label className="rotulo-campo" htmlFor="data-inicio">Data de início do ciclo</label>
        <input id="data-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <p className="aviso-data-inicio">
          Mudar a data desloca todos os dias do ciclo — treinos já planejados são mantidos.
        </p>

        <label className="rotulo-campo" htmlFor="meta-volume">Meta de volume semanal (km)</label>
        <input
          id="meta-volume"
          type="number"
          min={0}
          step={0.1}
          placeholder="ex: 40"
          value={metaVolume}
          onChange={(e) => setMetaVolume(e.target.value)}
        />

        {erro && <p className="mensagem-erro">{erro}</p>}

        <button className="btn btn-primario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button className="btn btn-secundario" type="button" onClick={() => navigate(`/ciclo/${cicloId}`)}>
          Cancelar
        </button>
      </form>
    </div>
  );
}
