import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarCiclos } from '../api/ciclos';
import { ApiError } from '../api/client';
import { obterCorredor, salvarCorredor } from '../api/corredor';
import BarraTopo from '../components/BarraTopo';

interface FaixaConfig {
  nivel: 'aquecimento_desaquecimento' | 'leve' | 'moderado' | 'forte' | 'muito_forte';
  label: string;
  percepcao: string;
  referencia: string;
}

const FAIXAS: FaixaConfig[] = [
  { nivel: 'aquecimento_desaquecimento', label: 'Aquecimento/Desaquecimento', percepcao: 'Trote bem solto, esforço quase nulo', referencia: '7:30' },
  { nivel: 'leve', label: 'Leve', percepcao: 'Dá pra cantar sem esforço', referencia: '7:00' },
  { nivel: 'moderado', label: 'Moderado', percepcao: 'Consegue conversar em frases completas', referencia: '6:30' },
  { nivel: 'forte', label: 'Forte', percepcao: 'Só consegue frases curtas', referencia: '6:00' },
  { nivel: 'muito_forte', label: 'Muito forte', percepcao: 'Quase não consegue falar', referencia: '5:30' },
];

export default function Onboarding() {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(FAIXAS.map((f) => [f.nivel, f.referencia])),
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelado = false;
    obterCorredor()
      .then((corredor) => {
        if (cancelado) return;
        setValores({
          aquecimento_desaquecimento: corredor.faixa_aquecimento_desaquecimento,
          leve: corredor.faixa_leve,
          moderado: corredor.faixa_moderado,
          forte: corredor.faixa_forte,
          muito_forte: corredor.faixa_muito_forte,
        });
      })
      .catch((err) => {
        if (!(err instanceof ApiError && err.status === 404)) throw err;
        // sem corredor ainda — mantém os valores de referência do estado inicial
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function continuar() {
    setSalvando(true);
    setErro(null);
    try {
      await salvarCorredor({
        faixa_aquecimento_desaquecimento: valores.aquecimento_desaquecimento,
        faixa_leve: valores.leve,
        faixa_moderado: valores.moderado,
        faixa_forte: valores.forte,
        faixa_muito_forte: valores.muito_forte,
      });
      const ciclos = await listarCiclos();
      if (ciclos.length > 0) {
        navigate(`/ciclo/${ciclos[ciclos.length - 1].id}`, { replace: true });
      } else {
        navigate('/objetivo-ciclo', { replace: true });
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <div className="tela-carregando">Carregando...</div>;

  return (
    <div className="tela tela-onboarding">
      <BarraTopo />
      <h1>Suas faixas de ritmo</h1>
      <p className="subtitulo">
        Já preenchemos com valores de referência para iniciante. Pode aceitar como está ou ajustar livremente.
      </p>
      <div className="lista-faixas">
        {FAIXAS.map((f) => (
          <div className="linha-faixa" key={f.nivel}>
            <div className="linha-faixa-info">
              <strong>{f.label}</strong>
              <span className="percepcao">{f.percepcao}</span>
            </div>
            <input
              type="text"
              className="input-faixa"
              inputMode="numeric"
              value={valores[f.nivel]}
              onChange={(e) => setValores((v) => ({ ...v, [f.nivel]: e.target.value }))}
            />
            <span className="unidade">/km</span>
          </div>
        ))}
      </div>
      {erro && <p className="mensagem-erro">{erro}</p>}
      <button className="btn btn-primario" onClick={continuar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Continuar'}
      </button>
    </div>
  );
}
