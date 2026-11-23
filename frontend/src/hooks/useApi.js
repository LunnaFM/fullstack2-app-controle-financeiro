import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../services/api';

// Carrega um endpoint da API e expõe os três estados que toda tela precisa tratar:
// carregando, erro e os dados. "recarregar" busca de novo (ex.: depois de salvar).
// Passe endpoint = null para não carregar nada.
export function useApi(endpoint) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(endpoint));
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (!endpoint) return undefined;
    let ativo = true; // evita atualizar o estado de uma requisição antiga

    setCarregando(true);
    setErro('');
    apiFetch(endpoint)
      .then((resposta) => ativo && setDados(resposta))
      .catch((e) => ativo && setErro(e.message || 'Não foi possível carregar os dados.'))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, [endpoint, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  return { dados, carregando, erro, recarregar };
}
