import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Lancamentos from './pages/Lancamentos';
import Categorias from './pages/Categorias';
import FontesDestinos from './pages/FontesDestinos';
import Relatorios from './pages/Relatorios';
import Faturas from './pages/Faturas';

// Só deixa entrar quem está logado; sem usuário, redireciona para o login.
function RotaProtegida({ children }) {
  const { usuario, carregando, erroSessao } = useAuth();

  if (carregando) {
    return (
      <div className="auth-wrapper">
        <div className="card">Verificando sessão...</div>
      </div>
    );
  }

  if (!usuario && erroSessao) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="alerta-erro" role="alert">{erroSessao}</div>
          <button
            type="button"
            className="btn btn-primary btn-full"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
          <div className="auth-footer">
            <Link to="/login">Ir para o login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  return (
    <>
      {erroSessao && (
        <div className="alerta-erro" role="alert" style={{ margin: 0, borderRadius: 0 }}>
          <span>{erroSessao}</span>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      )}
      {children}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/categorias" element={<Categorias />} />
            <Route path="/fontes-destinos" element={<FontesDestinos />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/faturas" element={<Faturas />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
