import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarCiclo } from '../api/ciclos';
import BarraTopo from '../components/BarraTopo';

const TIPOS_OBJETIVO = ['Prova', 'Completar uma distância', 'Recorde pessoal', 'Queimar calorias', 'Outro'];
const DURACOES = [8, 12, 16];

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ObjetivoCiclo() {
  const [tipo, setTipo] = useState(TIPOS_OBJETIVO[0]);
  const [meta, setMeta] = useState('');
  const [dataAlvo, setDataAlvo] = useState('');
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [duracao, setDuracao] = useState(DURACOES[0]);
  const [metaVolume, setMetaVolume] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const navigate = useNavigate();

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const ciclo = await criarCiclo({
        objetivo: { tipo, meta: meta.trim() || null, data_alvo: dataAlvo || null },
        data_inicio: dataInicio,
        duracao_semanas: duracao,
        meta_volume_semanal_km: metaVolume.trim() ? parseFloat(metaVolume) : null,
      });
      navigate(`/ciclo/${ciclo.id}`, { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar ciclo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="tela tela-objetivo-ciclo">
      <BarraTopo />
      <h1>Criar objetivo e ciclo</h1>
      <form onSubmit={aoSubmeter}>
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

        <label className="rotulo-campo">Duração do ciclo</label>
        <div className="chips">
          {DURACOES.map((d) => (
            <button
              type="button"
              key={d}
              className={`chip ${d === duracao ? 'chip-selecionado' : ''}`}
              onClick={() => setDuracao(d)}
            >
              {d} semanas
            </button>
          ))}
        </div>

        <label className="rotulo-campo" htmlFor="meta-volume">Meta de volume semanal (km, opcional)</label>
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
          {salvando ? 'Criando...' : 'Criar ciclo'}
        </button>
      </form>
    </div>
  );
}
