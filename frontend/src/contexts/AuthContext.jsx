import { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

const AuthContext = createContext(null);

function usuarioSalvo() {
  const salvo = localStorage.getItem('usuario');
  if (!salvo) return null;

  try {
    return JSON.parse(salvo);
  } catch {
    localStorage.removeItem('usuario');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioSalvo);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [carregando, setCarregando] = useState(Boolean(localStorage.getItem('token')));
  const [erroSessao, setErroSessao] = useState('');

  useEffect(() => {
    if (!token) {
      setCarregando(false);
      return;
    }

    apiFetch('/auth/me')
      .then((dadosUsuario) => {
        setUsuario(dadosUsuario);
        setErroSessao('');
        localStorage.setItem('usuario', JSON.stringify(dadosUsuario));
      })
      .catch((erro) => {
        if (erro.status === 401 || erro.status === 404) {
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setToken(null);
          setUsuario(null);
          return;
        }

        setErroSessao(
          'Não foi possível validar a sessão por um problema de conexão. Tente novamente.'
        );
      })
      .finally(() => {
        setCarregando(false);
      });
  }, [token]);

  async function login(email, senha) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
    setErroSessao('');
    return data;
  }

  async function cadastrar(dados) {
    return await apiFetch('/auth/cadastro', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    setErroSessao('');
  }

  return (
    <AuthContext.Provider
      value={{ usuario, token, carregando, erroSessao, login, cadastrar, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}