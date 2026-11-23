import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet, User, Mail, FileText, Lock, UserPlus, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { mascararCpf } from '../services/formatacao';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    senha: '',
    confirmacaoSenha: '',
  });
  const [erroGeral, setErroGeral] = useState('');
  const [camposErro, setCamposErro] = useState({});
  const [enviando, setEnviando] = useState(false);

  const temTamanho = form.senha.length >= 8 && form.senha.length <= 72;
  const temLetraENumero = /[a-zA-Z]/.test(form.senha) && /[0-9]/.test(form.senha);
  const senhasIguais = form.senha.length > 0 && form.senha === form.confirmacaoSenha;

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (camposErro[campo]) {
      setCamposErro((prev) => ({ ...prev, [campo]: '' }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErroGeral('');
    setCamposErro({});
    setEnviando(true);

    try {
      await cadastrar(form);
      navigate('/login', {
        state: { mensagemSucesso: 'Cadastro realizado com sucesso! Faça login para continuar.' },
      });
    } catch (err) {
      setErroGeral(err.message || 'Não foi possível concluir o cadastro.');
      setCamposErro(err.campos || {});
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="brand-badge">
          <Wallet size={15} />
          Controle Financeiro
        </div>
        <h1>Criar Nova Conta</h1>
        <p className="auth-sub">Cadastre-se para organizar categorias, lançamentos e faturas.</p>

        {erroGeral && (
          <div className="alerta-erro">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>{erroGeral}</strong>
              {camposErro.email && (
                <div style={{ marginTop: '0.25rem' }}>
                  Já possui conta? <Link to="/login" style={{ color: '#7F1D1D', fontWeight: 700 }}>Entrar agora</Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nome"><User size={13} /> Nome Completo</label>
            <div className="input-icon-wrap">
              <User size={16} />
              <input
                id="nome"
                type="text"
                placeholder="Ex.: Ana Souza"
                className={camposErro.nome ? 'input-error' : ''}
                value={form.nome}
                onChange={(e) => atualizarCampo('nome', e.target.value)}
                required
              />
            </div>
            {camposErro.nome && <span className="erro-campo"><AlertCircle size={13} /> {camposErro.nome}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email"><Mail size={13} /> E-mail</label>
            <div className="input-icon-wrap">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                placeholder="ana@exemplo.com"
                className={camposErro.email ? 'input-error' : ''}
                value={form.email}
                onChange={(e) => atualizarCampo('email', e.target.value)}
                required
              />
            </div>
            {camposErro.email && <span className="erro-campo"><AlertCircle size={13} /> {camposErro.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cpf"><FileText size={13} /> CPF</label>
            <div className="input-icon-wrap">
              <FileText size={16} />
              <input
                id="cpf"
                type="text"
                placeholder="000.000.000-00"
                className={camposErro.cpf ? 'input-error' : ''}
                value={form.cpf}
                inputMode="numeric"
                onChange={(e) => atualizarCampo('cpf', mascararCpf(e.target.value))}
                required
              />
            </div>
            {camposErro.cpf && <span className="erro-campo"><AlertCircle size={13} /> {camposErro.cpf}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="senha"><Lock size={13} /> Senha</label>
            <div className="input-icon-wrap">
              <Lock size={16} />
              <input
                id="senha"
                type="password"
                placeholder="Mínimo 8 caracteres"
                className={camposErro.senha ? 'input-error' : ''}
                value={form.senha}
                onChange={(e) => atualizarCampo('senha', e.target.value)}
                required
              />
            </div>
            {camposErro.senha && <span className="erro-campo"><AlertCircle size={13} /> {camposErro.senha}</span>}

            <div className="pwd-checklist">
              <div className={`pwd-item ${temTamanho ? 'ok' : 'no'}`}>
                {temTamanho ? <Check size={14} /> : <X size={14} />} Entre 8 e 72 caracteres
              </div>
              <div className={`pwd-item ${temLetraENumero ? 'ok' : 'no'}`}>
                {temLetraENumero ? <Check size={14} /> : <X size={14} />} Contém letras e números
              </div>
              <div className={`pwd-item ${senhasIguais ? 'ok' : 'no'}`}>
                {senhasIguais ? <Check size={14} /> : <X size={14} />} Confirmação de senha idêntica
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmacaoSenha"><Lock size={13} /> Confirmar Senha</label>
            <div className="input-icon-wrap">
              <Lock size={16} />
              <input
                id="confirmacaoSenha"
                type="password"
                placeholder="Repita a senha"
                className={camposErro.confirmacaoSenha ? 'input-error' : ''}
                value={form.confirmacaoSenha}
                onChange={(e) => atualizarCampo('confirmacaoSenha', e.target.value)}
                required
              />
            </div>
            {camposErro.confirmacaoSenha && (
              <span className="erro-campo"><AlertCircle size={13} /> {camposErro.confirmacaoSenha}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={enviando || !temTamanho || !temLetraENumero || !senhasIguais}
          >
            <UserPlus size={16} />
            {enviando ? 'Cadastrando...' : 'Concluir Cadastro'}
          </button>
        </form>

        <div className="auth-footer">
          Já possui uma conta? <Link to="/login">Fazer login</Link>
        </div>
      </div>
    </div>
  );
}