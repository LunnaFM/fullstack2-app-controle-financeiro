// Ponto único de comunicação com a API:
// - adiciona o cabeçalho Authorization com o token salvo;
// - em 401 (token ausente, inválido ou expirado), faz logout e volta ao login;
// - transforma qualquer erro no formato { status, message, campos }.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch {
    // Servidor fora do ar ou sem rede
    throw { status: 0, message: 'Não foi possível conectar à API. Verifique se o back-end está rodando.', campos: {} };
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && endpoint !== '/auth/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw { status: 401, message: data.erro || 'Sessão expirada.', campos: {} };
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data.erro || 'Ocorreu um erro inesperado.',
      campos: data.campos || {},
    };
  }

  return data;
}
