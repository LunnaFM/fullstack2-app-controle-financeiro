import { useState } from 'react';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Aviso, Carregando, ErroCampo, ErroCarregamento, Vazio } from '../components/Estados';

const FORM_VAZIO = { id: null, nome: '', tipo: 'saida' };

export default function Categorias() {
  const { dados: categorias, carregando, erro, recarregar } = useApi('/categorias');

  const [form, setForm] = useState(FORM_VAZIO);
  const [camposErro, setCamposErro] = useState({});
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  function avisar(tipo, texto) {
    setAviso({ tipo, texto });
    if (tipo === 'sucesso') setTimeout(() => setAviso({ tipo: '', texto: '' }), 4000);
  }

  async function salvar(e) {
    e.preventDefault();
    setCamposErro({});
    setSalvando(true);
    try {
      await apiFetch(form.id ? `/categorias/${form.id}` : '/categorias', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify({ nome: form.nome, tipo: form.tipo }),
      });
      avisar('sucesso', form.id ? 'Categoria atualizada.' : 'Categoria cadastrada.');
      setForm(FORM_VAZIO);
      recarregar();
    } catch (err) {
      setCamposErro(err.campos || {});
      avisar('erro', err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) return;
    try {
      await apiFetch(`/categorias/${categoria.id}`, { method: 'DELETE' });
      avisar('sucesso', 'Categoria excluída.');
      recarregar();
    } catch (err) {
      // 409: a categoria tem lançamentos vinculados
      avisar('erro', err.message);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">CADASTROS</span>
          <h1>Categorias</h1>
          <p>Organize suas entradas e saídas. Categorias com lançamentos não podem ser excluídas.</p>
        </div>
      </div>

      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Tags size={17} /> {form.id ? 'Editar categoria' : 'Nova categoria'}
            </div>
          </div>
          <form onSubmit={salvar} noValidate>
            <div className="form-group">
              <label htmlFor="cat-nome">Nome</label>
              <input
                id="cat-nome"
                type="text"
                maxLength={60}
                placeholder="Ex.: Educação, Lazer, Investimentos..."
                className={camposErro.nome ? 'input-error' : ''}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
              <ErroCampo mensagem={camposErro.nome} />
            </div>
            <div className="form-group">
              <label htmlFor="cat-tipo">Tipo</label>
              <select
                id="cat-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="saida">Saída (despesa)</option>
                <option value="entrada">Entrada (receita)</option>
              </select>
              <ErroCampo mensagem={camposErro.tipo} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={salvando || !form.nome.trim()}>
                <Plus size={15} /> {form.id ? 'Salvar alterações' : 'Cadastrar categoria'}
              </button>
              {form.id && (
                <button type="button" className="btn btn-outline" onClick={() => setForm(FORM_VAZIO)}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Categorias cadastradas</div>
          </div>

          {carregando && <Carregando />}
          {erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
          {!carregando && !erro && categorias?.length === 0 && (
            <Vazio>Nenhuma categoria cadastrada.</Vazio>
          )}

          {!carregando && !erro && categorias?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categorias.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.nome}</strong></td>
                      <td>
                        {c.tipo === 'entrada' ? (
                          <span className="badge badge-entrada">▲ Entrada</span>
                        ) : (
                          <span className="badge badge-saida">▼ Saída</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Editar"
                            onClick={() => {
                              setCamposErro({});
                              setForm({ id: c.id, nome: c.nome, tipo: c.tipo });
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            title="Excluir"
                            onClick={() => excluir(c)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
