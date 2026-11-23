import { useState } from 'react';
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useApi } from '../hooks/useApi';
import { formatarMoeda } from '../services/formatacao';
import { Aviso, Carregando, ErroCampo, ErroCarregamento, Vazio } from '../components/Estados';

const FORM_VAZIO = { id: null, nome: '', tipo: 'conta', diaFechamento: '', diaVencimento: '', limite: '' };

const NOMES_TIPO = {
  conta: 'Conta corrente / poupança',
  cartao_credito: 'Cartão de crédito',
  renda: 'Renda / recebimentos',
};

export default function FontesDestinos() {
  const { dados: fontes, carregando, erro, recarregar } = useApi('/fontes-destinos');

  const [form, setForm] = useState(FORM_VAZIO);
  const [camposErro, setCamposErro] = useState({});
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);
  const ehCartao = form.tipo === 'cartao_credito';

  function avisar(tipo, texto) {
    setAviso({ tipo, texto });
    if (tipo === 'sucesso') setTimeout(() => setAviso({ tipo: '', texto: '' }), 4000);
  }

  async function salvar(e) {
    e.preventDefault();
    setCamposErro({});
    setSalvando(true);

    const corpo = { nome: form.nome, tipo: form.tipo };
    if (ehCartao) {
      corpo.dia_fechamento = Number(form.diaFechamento);
      corpo.dia_vencimento = Number(form.diaVencimento);
      corpo.limite = form.limite; // texto com ponto decimal, ex.: "3000.00"
    }

    try {
      await apiFetch(form.id ? `/fontes-destinos/${form.id}` : '/fontes-destinos', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(corpo),
      });
      avisar('sucesso', form.id ? 'Fonte/destino atualizada.' : 'Fonte/destino cadastrada.');
      setForm(FORM_VAZIO);
      recarregar();
    } catch (err) {
      setCamposErro(err.campos || {});
      avisar('erro', err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(fonte) {
    if (!window.confirm(`Excluir "${fonte.nome}"?`)) return;
    try {
      await apiFetch(`/fontes-destinos/${fonte.id}`, { method: 'DELETE' });
      avisar('sucesso', 'Fonte/destino excluída.');
      recarregar();
    } catch (err) {
      avisar('erro', err.message); // 409: há lançamentos vinculados
    }
  }

  const campoNumero = (id, rotulo, campo, props) => (
    <div className="form-group">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type="number"
        className={camposErro[campo.api] ? 'input-error' : ''}
        value={form[campo.form]}
        onChange={(e) => setForm({ ...form, [campo.form]: e.target.value })}
        required
        {...props}
      />
      <ErroCampo mensagem={camposErro[campo.api]} />
    </div>
  );

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">CADASTROS</span>
          <h1>Fontes e destinos</h1>
          <p>De onde o dinheiro vem e para onde vai: contas, cartões de crédito e fontes de renda.</p>
        </div>
      </div>

      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Landmark size={17} /> {form.id ? 'Editar fonte/destino' : 'Nova fonte/destino'}
            </div>
          </div>
          <form onSubmit={salvar} noValidate>
            <div className="form-group">
              <label htmlFor="fonte-nome">Nome</label>
              <input
                id="fonte-nome"
                type="text"
                maxLength={60}
                placeholder="Ex.: Nubank, Conta Banco do Brasil..."
                className={camposErro.nome ? 'input-error' : ''}
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
              <ErroCampo mensagem={camposErro.nome} />
            </div>
            <div className="form-group">
              <label htmlFor="fonte-tipo">Tipo</label>
              <select
                id="fonte-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="conta">{NOMES_TIPO.conta}</option>
                <option value="cartao_credito">{NOMES_TIPO.cartao_credito}</option>
                <option value="renda">{NOMES_TIPO.renda}</option>
              </select>
            </div>

            {ehCartao && (
              <>
                {campoNumero('fonte-fechamento', 'Dia de fechamento', { form: 'diaFechamento', api: 'dia_fechamento' }, { min: 1, max: 31 })}
                {campoNumero('fonte-vencimento', 'Dia de vencimento', { form: 'diaVencimento', api: 'dia_vencimento' }, { min: 1, max: 31 })}
                {campoNumero('fonte-limite', 'Limite (R$)', { form: 'limite', api: 'limite' }, { min: 0, step: '0.01' })}
              </>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={salvando || !form.nome.trim()}>
                <Plus size={15} /> {form.id ? 'Salvar alterações' : 'Cadastrar'}
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
            <div className="card-title">Cadastradas</div>
          </div>

          {carregando && <Carregando />}
          {erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}
          {!carregando && !erro && fontes?.length === 0 && <Vazio>Nenhuma fonte/destino cadastrada.</Vazio>}

          {!carregando && !erro && fontes?.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th>Cartão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fontes.map((f) => (
                    <tr key={f.id}>
                      <td><strong>{f.nome}</strong></td>
                      <td style={{ fontSize: '0.8rem', fontWeight: 700 }}>{NOMES_TIPO[f.tipo]}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {f.tipo === 'cartao_credito'
                          ? `Fecha dia ${f.dia_fechamento} · vence dia ${f.dia_vencimento} · limite ${formatarMoeda(f.limite)}`
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            title="Editar"
                            onClick={() => {
                              setCamposErro({});
                              setForm({
                                id: f.id,
                                nome: f.nome,
                                tipo: f.tipo,
                                diaFechamento: String(f.dia_fechamento ?? ''),
                                diaVencimento: String(f.dia_vencimento ?? ''),
                                limite: String(f.limite ?? ''),
                              });
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            title="Excluir"
                            onClick={() => excluir(f)}
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
