const API_URL = 'http://localhost:3000/api';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

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