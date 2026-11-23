import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wallet, Mail, Lock, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mensagemCadastro = location.state?.mensagemSucesso || '';

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);

    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setErro(err.message || 'E-mail ou senha inválidos.');
    } finally {
      setEnviando(false);
    }
  }

  function preencherDemo() {
    setEmail('ana@exemplo.com');
    setSenha('Senha123');
    setErro('');
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-badge">
          <Wallet size={15} />
          Controle Financeiro
        </div>
        <h1>Acessar Conta</h1>
        <p className="auth-sub">Entre com suas credenciais para gerenciar suas finanças.</p>

        {mensagemCadastro && (
          <div className="alerta-sucesso">
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{mensagemCadastro}</span>
          </div>
        )}

        {erro && (
          <div className="alerta-erro">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">
              <Mail size={13} /> E-mail
            </label>
            <div className="input-icon-wrap">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="senha">
              <Lock size={13} /> Senha
            </label>
            <div className="input-icon-wrap">
              <Lock size={16} />
              <input
                id="senha"
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={enviando}>
            <LogIn size={16} />
            {enviando ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <button
          type="button"
          onClick={preencherDemo}
          className="btn btn-outline btn-full btn-sm"
          style={{ marginTop: '0.65rem' }}
        >
          Preencher Usuário Demo (Ana)
        </button>

        <div className="auth-footer">
          Ainda não tem uma conta? <Link to="/cadastro">Criar cadastro</Link>
        </div>
      </div>
    </div>
  );
}