import { useEffect, useState, type FormEvent } from 'react';
import { criarPonto, excluirPonto, listarPontos } from '../api/pontos';
import { criarRota, excluirRota, listarRotas } from '../api/rotas';
import { criarTrecho, excluirTrecho, listarTrechos } from '../api/trechos';
import BarraTopo from '../components/BarraTopo';
import type { Ponto, RotaResumo, Trecho } from '../types';

export default function MinhasRotas() {
  const [carregando, setCarregando] = useState(true);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [trechos, setTrechos] = useState<Trecho[]>([]);
  const [rotas, setRotas] = useState<RotaResumo[]>([]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([listarPontos(), listarTrechos(), listarRotas()]).then(([p, t, r]) => {
      if (cancelado) return;
      setPontos(p);
      setTrechos(t);
      setRotas(r);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function recarregarPontos() {
    setPontos(await listarPontos());
  }
  async function recarregarTrechos() {
    setTrechos(await listarTrechos());
  }
  async function recarregarRotas() {
    setRotas(await listarRotas());
  }

  if (carregando) return <div className="tela-carregando">Carregando...</div>;

  return (
    <div className="tela tela-minhas-rotas">
      <BarraTopo />
      <h1>Minhas rotas</h1>
      <p className="subtitulo">Cadastre pontos conhecidos, monte trechos entre eles e combine trechos em rotas.</p>

      <SecaoPontos pontos={pontos} onMudou={recarregarPontos} />
      <SecaoTrechos pontos={pontos} trechos={trechos} onMudou={recarregarTrechos} />
      <SecaoRotas trechos={trechos} rotas={rotas} onMudou={recarregarRotas} />
    </div>
  );
}

function SecaoPontos({ pontos, onMudou }: { pontos: Ponto[]; onMudou: () => void }) {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarPonto(nome.trim());
      setNome('');
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar ponto');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    setErro(null);
    try {
      await excluirPonto(id);
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover ponto');
    }
  }

  return (
    <section className="secao-rotas-cadastro">
      <h2 className="subtitulo-secao">Pontos</h2>
      <div className="lista-chips-removiveis">
        {pontos.map((p) => (
          <span className="chip-removivel" key={p.id}>
            {p.nome}
            <button type="button" onClick={() => remover(p.id)} aria-label={`Remover ${p.nome}`}>
              ×
            </button>
          </span>
        ))}
        {pontos.length === 0 && <p className="texto-vazio">Nenhum ponto cadastrado ainda.</p>}
      </div>
      <form onSubmit={adicionar} className="form-inline">
        <input
          type="text"
          placeholder="Nome do ponto (ex: Portão 3 do Ibirapuera)"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
        <button className="btn btn-secundario" type="submit" disabled={salvando}>
          {salvando ? 'Salvando...' : '+ Ponto'}
        </button>
      </form>
      {erro && <p className="mensagem-erro">{erro}</p>}
    </section>
  );
}

function SecaoTrechos({
  pontos,
  trechos,
  onMudou,
}: {
  pontos: Ponto[];
  trechos: Trecho[];
  onMudou: () => void;
}) {
  const [nome, setNome] = useState('');
  const [partidaId, setPartidaId] = useState('');
  const [chegadaId, setChegadaId] = useState('');
  const [distancia, setDistancia] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(e: FormEvent) {
    e.preventDefault();
    if (!partidaId || !chegadaId || !distancia) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarTrecho({
        nome: nome.trim() || null,
        ponto_partida_id: partidaId,
        ponto_chegada_id: chegadaId,
        distancia_km: parseFloat(distancia),
      });
      setNome('');
      setPartidaId('');
      setChegadaId('');
      setDistancia('');
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar trecho');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    setErro(null);
    try {
      await excluirTrecho(id);
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover trecho');
    }
  }

  return (
    <section className="secao-rotas-cadastro">
      <h2 className="subtitulo-secao">Trechos</h2>
      <div className="lista-trechos">
        {trechos.map((t) => (
          <div className="linha-trecho" key={t.id}>
            <span>
              {t.nome ? `${t.nome} · ` : ''}
              {t.ponto_partida.nome} → {t.ponto_chegada.nome}
            </span>
            <span>{t.distancia_km.toFixed(2)} km</span>
            <button type="button" className="btn-remover-bloco" onClick={() => remover(t.id)} aria-label="Remover trecho">
              ×
            </button>
          </div>
        ))}
        {trechos.length === 0 && <p className="texto-vazio">Nenhum trecho cadastrado ainda.</p>}
      </div>

      {pontos.length < 2 ? (
        <p className="texto-vazio">Cadastre pelo menos 2 pontos para criar um trecho.</p>
      ) : (
        <form onSubmit={adicionar} className="form-trecho">
          <input
            type="text"
            placeholder="Nome do trecho (opcional)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <div className="linha-duracao">
            <select className="input-select" value={partidaId} onChange={(e) => setPartidaId(e.target.value)} required>
              <option value="">Partida...</option>
              {pontos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <select className="input-select" value={chegadaId} onChange={(e) => setChegadaId(e.target.value)} required>
              <option value="">Chegada...</option>
              {pontos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder="Distância (km)"
            value={distancia}
            onChange={(e) => setDistancia(e.target.value)}
            required
          />
          <button className="btn btn-secundario" type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Trecho'}
          </button>
        </form>
      )}
      {erro && <p className="mensagem-erro">{erro}</p>}
    </section>
  );
}

interface Candidato {
  trecho: Trecho;
  invertido: boolean;
}

function candidatosProximoTrecho(trechos: Trecho[], chegadaAtualId: string | null): Candidato[] {
  if (chegadaAtualId === null) {
    return trechos.flatMap((t) => [
      { trecho: t, invertido: false },
      { trecho: t, invertido: true },
    ]);
  }
  const candidatos: Candidato[] = [];
  for (const t of trechos) {
    if (t.ponto_partida_id === chegadaAtualId) candidatos.push({ trecho: t, invertido: false });
    if (t.ponto_chegada_id === chegadaAtualId) candidatos.push({ trecho: t, invertido: true });
  }
  return candidatos;
}

function labelCandidato(c: Candidato): string {
  const partida = c.invertido ? c.trecho.ponto_chegada.nome : c.trecho.ponto_partida.nome;
  const chegada = c.invertido ? c.trecho.ponto_partida.nome : c.trecho.ponto_chegada.nome;
  const nome = c.trecho.nome ? `${c.trecho.nome} · ` : '';
  return `${nome}${partida} → ${chegada} (${c.trecho.distancia_km.toFixed(2)} km)`;
}

function candidatoParaValor(c: Candidato): string {
  return `${c.trecho.id}|${c.invertido ? '1' : '0'}`;
}

function SecaoRotas({
  trechos,
  rotas,
  onMudou,
}: {
  trechos: Trecho[];
  rotas: RotaResumo[];
  onMudou: () => void;
}) {
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<Candidato[]>([]);
  const [candidatoEscolhido, setCandidatoEscolhido] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const ultimoItem = itens[itens.length - 1];
  const chegadaAtual = ultimoItem
    ? ultimoItem.invertido
      ? ultimoItem.trecho.ponto_partida_id
      : ultimoItem.trecho.ponto_chegada_id
    : null;
  const candidatos = candidatosProximoTrecho(trechos, chegadaAtual);
  const distanciaTotal = itens.reduce((acc, i) => acc + i.trecho.distancia_km, 0);

  function adicionarTrechoNaSequencia() {
    const [trechoId, invertidoStr] = candidatoEscolhido.split('|');
    const trecho = trechos.find((t) => t.id === trechoId);
    if (!trecho) return;
    setItens((prev) => [...prev, { trecho, invertido: invertidoStr === '1' }]);
    setCandidatoEscolhido('');
  }

  function removerUltimo() {
    setItens((prev) => prev.slice(0, -1));
  }

  async function salvarRota(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || itens.length === 0) return;
    setSalvando(true);
    setErro(null);
    try {
      await criarRota({
        nome: nome.trim(),
        trechos: itens.map((i) => ({ trecho_id: i.trecho.id, invertido: i.invertido })),
      });
      setNome('');
      setItens([]);
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar rota');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    setErro(null);
    try {
      await excluirRota(id);
      onMudou();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao remover rota');
    }
  }

  return (
    <section className="secao-rotas-cadastro">
      <h2 className="subtitulo-secao">Rotas</h2>
      <div className="lista-rotas">
        {rotas.map((r) => (
          <div className="linha-trecho" key={r.id}>
            <span>{r.nome}</span>
            <span>{r.distancia_total_km.toFixed(2)} km</span>
            <button type="button" className="btn-remover-bloco" onClick={() => remover(r.id)} aria-label="Remover rota">
              ×
            </button>
          </div>
        ))}
        {rotas.length === 0 && <p className="texto-vazio">Nenhuma rota cadastrada ainda.</p>}
      </div>

      {trechos.length === 0 ? (
        <p className="texto-vazio">Cadastre pelo menos um trecho para montar uma rota.</p>
      ) : (
        <form onSubmit={salvarRota} className="form-montar-rota">
          <input
            type="text"
            placeholder="Nome da rota (ex: Volta do Ibirapuera)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />

          {itens.length > 0 && (
            <div className="sequencia-rota">
              {itens.map((item, i) => (
                <div className="linha-trecho" key={i}>
                  <span>
                    {i + 1}. {labelCandidato(item)}
                  </span>
                </div>
              ))}
              <button type="button" className="btn btn-secundario" onClick={removerUltimo}>
                Remover último trecho
              </button>
            </div>
          )}

          <div className="linha-duracao">
            <select
              className="input-select"
              value={candidatoEscolhido}
              onChange={(e) => setCandidatoEscolhido(e.target.value)}
            >
              <option value="">{itens.length === 0 ? 'Escolha o primeiro trecho...' : 'Escolha o próximo trecho...'}</option>
              {candidatos.map((c) => (
                <option key={candidatoParaValor(c)} value={candidatoParaValor(c)}>
                  {labelCandidato(c)}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-secundario"
              onClick={adicionarTrechoNaSequencia}
              disabled={!candidatoEscolhido}
            >
              Adicionar
            </button>
          </div>

          {candidatos.length === 0 && itens.length > 0 && (
            <p className="texto-vazio">Nenhum trecho cadastrado começa onde este termina.</p>
          )}

          {itens.length > 0 && <p className="distancia-total-rota">Distância total: {distanciaTotal.toFixed(2)} km</p>}

          <button className="btn btn-primario" type="submit" disabled={salvando || itens.length === 0}>
            {salvando ? 'Salvando...' : 'Salvar rota'}
          </button>
        </form>
      )}
      {erro && <p className="mensagem-erro">{erro}</p>}
    </section>
  );
}
