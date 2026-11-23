import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  LogOut,
  Tags,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MENU = [
  { para: '/', rotulo: 'Visão Geral', Icone: LayoutDashboard, exato: true },
  { para: '/lancamentos', rotulo: 'Lançamentos', Icone: ArrowLeftRight },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tags },
  { para: '/fontes-destinos', rotulo: 'Fontes / Destinos', Icone: Landmark },
  { para: '/relatorios', rotulo: 'Relatórios', Icone: BarChart3 },
  { para: '/faturas', rotulo: 'Cartões e Faturas', Icone: CreditCard },
];

// Estrutura comum das telas autenticadas: barra superior, menu e a página da rota (Outlet).
export default function Layout() {
  const { usuario, logout } = useAuth();
  const [mostrarAjuda, setMostrarAjuda] = useState(false);

  return (
    <div>
      <header className="appbar">
        <div className="appbar-inner">
          <div className="appbar-brand">
            <Wallet size={22} />
            <span>CONTROLE FINANCEIRO</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.84rem', color: '#D1FAE5' }}>
              Olá, <strong>{usuario?.nome || 'Usuário'}</strong>
            </span>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setMostrarAjuda(!mostrarAjuda)}
            >
              <HelpCircle size={14} /> Ajuda
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={logout}>
              <LogOut size={14} /> Sair
            </button>
          </div>
        </div>
      </header>

      <nav className="tabs-bar">
        <div className="tabs-inner">
          {MENU.map(({ para, rotulo, Icone, exato }) => (
            <NavLink
              key={para}
              to={para}
              end={exato}
              className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}
            >
              <Icone size={15} /> {rotulo}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="main-container">
        {mostrarAjuda && (
          <div className="card" style={{ background: '#F7FAF8' }}>
            <div className="card-header">
              <div className="card-title">
                <HelpCircle size={17} /> Guia rápido
              </div>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setMostrarAjuda(false)}>
                <X size={14} /> Fechar
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <strong>1. Tipos:</strong> lançamentos de <em>saída</em> só aceitam categorias de saída, e os de{' '}
              <em>entrada</em>, categorias de entrada.<br />
              <strong>2. Parcelamento:</strong> só para saídas no cartão de crédito. O valor é dividido em centavos e a
              diferença fica na primeira parcela.<br />
              <strong>3. Fechamento:</strong> compra feita no dia do fechamento ou depois entra na fatura seguinte.<br />
              <strong>4. Relatórios:</strong> todos os totais são calculados no servidor.
            </p>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
