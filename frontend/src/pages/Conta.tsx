import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, trocarSenha } from '../api/auth';
import { obterCorredor, salvarPerfilPessoal } from '../api/corredor';
import { useAuth } from '../AuthContext';
import BarraTopo from '../components/BarraTopo';
import { calcularIdade } from '../utils';

const GENEROS = ['Masculino', 'Feminino', 'Outro', 'Prefiro não informar'];

export default function Conta() {
  const navigate = useNavigate();
  const { definirToken } = useAuth();

  const [carregando, setCarregando] = useState(true);

  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [altura, setAltura] = useState('');
  const [peso, setPeso] = useState('');
  const [genero, setGenero] = useState<string | null>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [sucessoPerfil, setSucessoPerfil] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [sucessoSenha, setSucessoSenha] = useState(false);

  useEffect(() => {
    let cancelado = false;
    obterCorredor().then((corredor) => {
      if (cancelado) return;
      setNome(corredor.nome ?? '');
      setSobrenome(corredor.sobrenome ?? '');
      setDataNascimento(corredor.data_nascimento ?? '');
      setAltura(corredor.altura_cm != null ? String(corredor.altura_cm) : '');
      setPeso(corredor.peso_kg != null ? String(corredor.peso_kg) : '');
      setGenero(corredor.genero);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  async function salvarPerfil(e: FormEvent) {
    e.preventDefault();
    setSalvandoPerfil(true);
    setErroPerfil(null);
    setSucessoPerfil(false);
    try {
      await salvarPerfilPessoal({
        nome: nome.trim() || null,
        sobrenome: sobrenome.trim() || null,
        data_nascimento: dataNascimento || null,
        altura_cm: altura ? parseFloat(altura) : null,
        peso_kg: peso ? parseFloat(peso) : null,
        genero,
      });
      setSucessoPerfil(true);
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function salvarSenha(e: FormEvent) {
    e.preventDefault();
    setErroSenha(null);
    setSucessoSenha(false);
    if (novaSenha !== confirmarSenha) {
      setErroSenha('A confirmação não bate com a nova senha');
      return;
    }
    setSalvandoSenha(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setSucessoSenha(true);
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Erro ao trocar senha');
    } finally {
      setSalvandoSenha(false);
    }
  }

  function sair() {
    logout();
    definirToken(null);
    navigate('/login', { replace: true });
  }

  if (carregando) return <div className="tela-carregando">Carregando...</div>;

  const idade = dataNascimento ? calcularIdade(dataNascimento) : null;

  return (
    <div className="tela tela-conta">
      <BarraTopo />
      <h1>Minha conta</h1>

      <section className="secao-conta">
        <h2 className="subtitulo-secao">Dados pessoais</h2>
        <form onSubmit={salvarPerfil}>
          <label className="rotulo-campo" htmlFor="nome">
            Nome
          </label>
          <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />

          <label className="rotulo-campo" htmlFor="sobrenome">
            Sobrenome
          </label>
          <input id="sobrenome" type="text" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} />

          <label className="rotulo-campo" htmlFor="data-nascimento">
            Data de nascimento
          </label>
          <input
            id="data-nascimento"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
          />
          {idade != null && <p className="aviso-data-inicio">{idade} anos</p>}

          <label className="rotulo-campo" htmlFor="altura">
            Altura (cm)
          </label>
          <input id="altura" type="number" min={0} step={1} value={altura} onChange={(e) => setAltura(e.target.value)} />

          <label className="rotulo-campo" htmlFor="peso">
            Peso (kg)
          </label>
          <input id="peso" type="number" min={0} step={0.1} value={peso} onChange={(e) => setPeso(e.target.value)} />

          <label className="rotulo-campo">Gênero</label>
          <div className="chips">
            {GENEROS.map((g) => (
              <button
                type="button"
                key={g}
                className={`chip ${genero === g ? 'chip-selecionado' : ''}`}
                onClick={() => setGenero(g)}
              >
                {g}
              </button>
            ))}
          </div>

          {erroPerfil && <p className="mensagem-erro">{erroPerfil}</p>}
          {sucessoPerfil && <p className="mensagem-sucesso">Dados salvos.</p>}

          <button className="btn btn-primario" type="submit" disabled={salvandoPerfil}>
            {salvandoPerfil ? 'Salvando...' : 'Salvar dados pessoais'}
          </button>
        </form>
      </section>

      <section className="secao-conta">
        <h2 className="subtitulo-secao">Trocar senha</h2>
        <form onSubmit={salvarSenha}>
          <label className="rotulo-campo" htmlFor="senha-atual">
            Senha atual
          </label>
          <input
            id="senha-atual"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
          />

          <label className="rotulo-campo" htmlFor="nova-senha">
            Nova senha
          </label>
          <input
            id="nova-senha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            minLength={6}
            required
          />

          <label className="rotulo-campo" htmlFor="confirmar-senha">
            Confirmar nova senha
          </label>
          <input
            id="confirmar-senha"
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            minLength={6}
            required
          />

          {erroSenha && <p className="mensagem-erro">{erroSenha}</p>}
          {sucessoSenha && <p className="mensagem-sucesso">Senha alterada.</p>}

          <button className="btn btn-primario" type="submit" disabled={salvandoSenha}>
            {salvandoSenha ? 'Salvando...' : 'Trocar senha'}
          </button>
        </form>
      </section>

      <button className="btn btn-secundario" onClick={sair}>
        Sair
      </button>
    </div>
  );
}
