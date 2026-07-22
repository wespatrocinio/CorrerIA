import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const { definirToken } = useAuth();
  const navigate = useNavigate();

  async function aoSubmeter(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const token = await login(email, senha);
      definirToken(token);
      navigate('/', { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela tela-auth">
      <h1>Entrar</h1>
      <form onSubmit={aoSubmeter}>
        <label className="rotulo-campo" htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="rotulo-campo" htmlFor="senha">Senha</label>
        <input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />

        {erro && <p className="mensagem-erro">{erro}</p>}

        <button className="btn btn-primario" type="submit" disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="subtitulo" style={{ marginTop: 16 }}>
        Não tem conta? <Link to="/registro">Criar conta</Link>
      </p>
    </div>
  );
}
