import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useApi } from '../hooks/useApi';
import { formatarData, formatarMoeda, hojeISO, periodoDoMes } from '../services/formatacao';
import { serializarCsv } from '../services/relatorios';
import { Aviso, Carregando, ErroCampo, ErroCarregamento, Vazio } from '../components/Estados';

const POR_PAGINA = 20;

const formVazio = () => ({
  id: null,
  descricao: '',
  valor: '',
  tipo: 'saida',
  data: hojeISO(),
  categoriaId: '',
  fonteDestinoId: '',
  parcelas: 1,
});

const filtrosPadrao = () => ({
  busca: '',
  tipo: '',
  categoriaId: '',
  fonteDestinoId: '',
  ...periodoDoMes(0), // padrão: mês corrente
});

function montarConsulta(filtros, pagina, porPagina) {
  const params = new URLSearchParams({ pagina, porPagina });
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor) params.set(chave, valor);
  }
  return `/lancamentos?${params}`;
}

export default function Lancamentos() {
  const { dados: categorias } = useApi('/categorias');
  const { dados: fontes } = useApi('/fontes-destinos');

  const [filtros, setFiltros] = useState(filtrosPadrao);
  const [busca, setBusca] = useState(''); // texto digitado; vai para os filtros após uma pausa
  const [pagina, setPagina] = useState(1);
  const lista = useApi(montarConsulta(filtros, pagina, POR_PAGINA));

  const [form, setForm] = useState(formVazio);
  const [camposErro, setCamposErro] = useState({});
  const [aviso, setAviso] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);
  const [itemExcluir, setItemExcluir] = useState(null);
  const [ultimoExcluido, setUltimoExcluido] = useState(null);

  // Busca por descrição: espera o usuário parar de digitar para consultar a API
  useEffect(() => {
    const espera = setTimeout(() => {
      setFiltros((f) => (f.busca === busca ? f : { ...f, busca }));
      setPagina(1);
    }, 400);
    return () => clearTimeout(espera);
  }, [busca]);

  const nomeCategoria = useMemo(
    () => Object.fromEntries((categorias || []).map((c) => [c.id, c.nome])),
    [categorias],
  );
  const fontesPorId = useMemo(
    () => Object.fromEntries((fontes || []).map((f) => [f.id, f])),
    [fontes],
  );

  const categoriasDoTipo = (categorias || []).filter((c) => c.tipo === form.tipo);
  const fonteEscolhida = fontesPorId[form.fonteDestinoId];
  const podeParcelar = !form.id && form.tipo === 'saida' && fonteEscolhida?.tipo === 'cartao_credito';

  function avisar(tipo, texto) {
    setAviso({ tipo, texto });
    if (tipo === 'sucesso') setTimeout(() => setAviso({ tipo: '', texto: '' }), 4000);
  }

  function alterarFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
    setPagina(1);
  }

  // Validação no cliente (o servidor valida de novo; as mensagens dele aparecem nos campos)
  function validar() {
    const erros = {};
    if (!form.descricao.trim()) erros.descricao = 'Informe a descrição.';
    if (!(Number(form.valor) > 0)) erros.valor = 'Informe um valor maior que zero.';
    if (!form.data) erros.data = 'Informe a data.';
    if (!form.categoriaId) erros.categoria_id = 'Escolha uma categoria.';
    if (!form.fonteDestinoId) erros.fonte_destino_id = 'Escolha uma fonte/destino.';
    const parcelas = Number(form.parcelas);
    if (podeParcelar && !(Number.isInteger(parcelas) && parcelas >= 1 && parcelas <= 48)) {
      erros.total_parcelas = 'Informe de 1 a 48 parcelas.';
    }
    return erros;
  }

  async function salvar(e) {
    e.preventDefault();
    const erros = validar();
    setCamposErro(erros);
    if (Object.keys(erros).length > 0) return;

    const corpo = {
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      valor: Number(form.valor).toFixed(2),
      data: form.data,
      categoria_id: Number(form.categoriaId),
      fonte_destino_id: Number(form.fonteDestinoId),
      total_parcelas: podeParcelar ? Number(form.parcelas) : 1,
    };

    setSalvando(true);
    try {
      const resposta = await apiFetch(form.id ? `/lancamentos/${form.id}` : '/lancamentos', {
        method: form.id ? 'PUT' : 'POST',
        body: JSON.stringify(corpo),
      });
      if (form.id) {
        avisar('sucesso', 'Lançamento atualizado.');
      } else if (resposta.total_parcelas > 1) {
        avisar('sucesso', `Compra registrada em ${resposta.total_parcelas} parcelas: ${resposta.valores.map(formatarMoeda).join(' + ')}.`);
      } else {
        avisar('sucesso', 'Lançamento registrado.');
      }
      setForm(formVazio());
      setCamposErro({});
      lista.recarregar();
    } catch (err) {
      setCamposErro(err.campos || {});
      avisar('erro', err.message);
    } finally {
      setSalvando(false);
    }
  }

  function editar(item) {
    setCamposErro({});
    setForm({
      id: item.id,
      descricao: item.descricao,
      valor: String(item.valor),
      tipo: item.tipo,
      data: item.data,
      categoriaId: String(item.categoria_id),
      fonteDestinoId: String(item.fonte_destino_id),
      parcelas: 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function excluir(todasParcelas) {
    const alvo = itemExcluir;
    setItemExcluir(null);
    try {
      const resposta = await apiFetch(
        `/lancamentos/${alvo.id}${todasParcelas ? '?todasParcelas=true' : ''}`,
        { method: 'DELETE' },
      );
      lista.recarregar();
      if (alvo.total_parcelas > 1) {
        avisar('sucesso', `${resposta.excluidos} parcela(s) excluída(s).`);
      } else {
        // Lançamento simples: oferece "desfazer" por alguns segundos
        setUltimoExcluido(alvo);
        setTimeout(() => setUltimoExcluido(null), 6000);
      }
    } catch (err) {
      avisar('erro', err.message);
    }
  }

  async function desfazerExclusao() {
    const item = ultimoExcluido;
    setUltimoExcluido(null);
    try {
      await apiFetch('/lancamentos', {
        method: 'POST',
        body: JSON.stringify({
          tipo: item.tipo,
          descricao: item.descricao,
          valor: item.valor,
          data: item.data,
          categoria_id: item.categoria_id,
          fonte_destino_id: item.fonte_destino_id,
        }),
      });
      avisar('sucesso', 'Lançamento restaurado.');
      lista.recarregar();
    } catch (err) {
      avisar('erro', err.message);
    }
  }

  // Exporta TODOS os lançamentos do filtro atual (percorre as páginas da API)
  async function exportarCsv() {
    try {
      const itens = [];
      let paginaAtual = 1;
      let total = Infinity;
      while (itens.length < total) {
        const r = await apiFetch(montarConsulta(filtros, paginaAtual, 100));
        itens.push(...r.dados);
        total = r.total;
        paginaAtual += 1;
        if (r.dados.length === 0) break;
      }
      const csv = serializarCsv([
        ['Data', 'Descrição', 'Tipo', 'Categoria', 'Fonte / Destino', 'Parcela', 'Valor (R$)'],
        ...itens.map((l) => [
          formatarData(l.data),
          l.descricao,
          l.tipo === 'entrada' ? 'Entrada' : 'Saída',
          nomeCategoria[l.categoria_id] || '',
          fontesPorId[l.fonte_destino_id]?.nome || '',
          l.total_parcelas > 1 ? `${l.parcela_atual}/${l.total_parcelas}` : 'Única',
          String(l.valor).replace('.', ','),
        ]),
      ]);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `lancamentos-${filtros.inicio}-a-${filtros.fim}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      avisar('erro', err.message);
    }
  }

  const resultado = lista.dados;
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / resultado.porPagina)) : 1;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">MOVIMENTAÇÕES</span>
          <h1>Lançamentos</h1>
          <p>Registre entradas e saídas. Compras no cartão de crédito podem ser parceladas em até 48 vezes.</p>
        </div>
      </div>

      <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Plus size={17} /> {form.id ? 'Editar lançamento' : 'Novo lançamento'}
          </div>
          {form.id && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setForm(formVazio())}>
              Cancelar edição
            </button>
          )}
        </div>

        <form onSubmit={salvar} noValidate>
          <div className="filters-bar form-lancamento">
            <div className="form-group">
              <label htmlFor="lanc-descricao">Descrição</label>
              <input
                id="lanc-descricao"
                type="text"
                maxLength={120}
                placeholder="Ex.: Mercado, Salário..."
                className={camposErro.descricao ? 'input-error' : ''}
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
              <ErroCampo mensagem={camposErro.descricao} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-valor">Valor (R$)</label>
              <input
                id="lanc-valor"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                className={camposErro.valor ? 'input-error' : ''}
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
              <ErroCampo mensagem={camposErro.valor} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-tipo">Tipo</label>
              <select
                id="lanc-tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value, categoriaId: '' })}
              >
                <option value="saida">▼ Saída (despesa)</option>
                <option value="entrada">▲ Entrada (receita)</option>
              </select>
              <ErroCampo mensagem={camposErro.tipo} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-data">Data</label>
              <input
                id="lanc-data"
                type="date"
                className={camposErro.data ? 'input-error' : ''}
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
              <ErroCampo mensagem={camposErro.data} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-categoria">Categoria ({form.tipo === 'entrada' ? 'entrada' : 'saída'})</label>
              <select
                id="lanc-categoria"
                className={camposErro.categoria_id ? 'input-error' : ''}
                value={form.categoriaId}
                onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categoriasDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              <ErroCampo mensagem={camposErro.categoria_id} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-fonte">Fonte / destino</label>
              <select
                id="lanc-fonte"
                className={camposErro.fonte_destino_id ? 'input-error' : ''}
                value={form.fonteDestinoId}
                onChange={(e) => setForm({ ...form, fonteDestinoId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {(fontes || []).map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
              <ErroCampo mensagem={camposErro.fonte_destino_id} />
            </div>

            <div className="form-group">
              <label htmlFor="lanc-parcelas">Parcelas</label>
              <input
                id="lanc-parcelas"
                type="number"
                min="1"
                max="48"
                disabled={!podeParcelar}
                title={podeParcelar ? '' : 'Parcelamento só para saídas no cartão de crédito'}
                className={camposErro.total_parcelas ? 'input-error' : ''}
                value={podeParcelar ? form.parcelas : 1}
                onChange={(e) => setForm({ ...form, parcelas: e.target.value })}
              />
              <ErroCampo mensagem={camposErro.total_parcelas} />
            </div>
          </div>

          {podeParcelar && Number(form.parcelas) > 1 && (
            <div className="aviso-parcelamento">
              Serão geradas <strong>{form.parcelas} parcelas</strong> mensais que somam exatamente{' '}
              <strong>{formatarMoeda(form.valor)}</strong> (a diferença de centavos fica na primeira).
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <Plus size={15} /> {form.id ? 'Salvar alterações' : 'Registrar lançamento'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ArrowLeftRight size={17} /> Histórico
          </div>
          <div className="card-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={exportarCsv}
              disabled={!resultado || resultado.total === 0}
            >
              <Download size={13} /> Exportar CSV
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setBusca('');
                setFiltros(filtrosPadrao());
                setPagina(1);
              }}
            >
              <RotateCcw size={13} /> Mês atual
            </button>
          </div>
        </div>

        <div className="filters-bar">
          <div>
            <label htmlFor="filtro-busca"><Search size={12} /> DESCRIÇÃO</label>
            <input
              id="filtro-busca"
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filtro-tipo">TIPO</label>
            <select id="filtro-tipo" value={filtros.tipo} onChange={(e) => alterarFiltro('tipo', e.target.value)}>
              <option value="">Todos</option>
              <option value="entrada">Entradas</option>
              <option value="saida">Saídas</option>
            </select>
          </div>
          <div>
            <label htmlFor="filtro-categoria">CATEGORIA</label>
            <select
              id="filtro-categoria"
              value={filtros.categoriaId}
              onChange={(e) => alterarFiltro('categoriaId', e.target.value)}
            >
              <option value="">Todas</option>
              {(categorias || []).map((c) => (
                <option key={c.id} value={c.id}>{c.nome} ({c.tipo === 'entrada' ? 'entrada' : 'saída'})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-fonte">FONTE / DESTINO</label>
            <select
              id="filtro-fonte"
              value={filtros.fonteDestinoId}
              onChange={(e) => alterarFiltro('fonteDestinoId', e.target.value)}
            >
              <option value="">Todas</option>
              {(fontes || []).map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filtro-inicio">DE</label>
            <input
              id="filtro-inicio"
              type="date"
              value={filtros.inicio}
              onChange={(e) => alterarFiltro('inicio', e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="filtro-fim">ATÉ</label>
            <input
              id="filtro-fim"
              type="date"
              value={filtros.fim}
              onChange={(e) => alterarFiltro('fim', e.target.value)}
            />
          </div>
        </div>

        {resultado && (
          <div className="kpi-grid totais-periodo">
            <div className="kpi-card">
              <div className="kpi-top"><span>Entradas no período</span><TrendingUp size={17} color="#146C43" /></div>
              <div className="kpi-value tabular" style={{ color: '#146C43' }}>{formatarMoeda(resultado.totais.entradas)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><span>Saídas no período</span><TrendingDown size={17} color="#B91C1C" /></div>
              <div className="kpi-value tabular" style={{ color: '#B91C1C' }}>{formatarMoeda(resultado.totais.saidas)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><span>Saldo (entradas − saídas)</span><Wallet size={17} color="#0E3528" /></div>
              <div className="kpi-value tabular">{formatarMoeda(resultado.totais.saldo)}</div>
            </div>
          </div>
        )}

        {lista.carregando && <Carregando texto="Carregando lançamentos..." />}
        {lista.erro && <ErroCarregamento mensagem={lista.erro} onTentarNovamente={lista.recarregar} />}
        {!lista.carregando && !lista.erro && resultado?.total === 0 && (
          <Vazio>Nenhum lançamento encontrado com os filtros atuais.</Vazio>
        )}

        {!lista.carregando && !lista.erro && resultado?.total > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Fonte / destino</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.dados.map((item) => (
                    <tr key={item.id}>
                      <td className="tabular">{formatarData(item.data)}</td>
                      <td>
                        <strong>{item.descricao}</strong>
                        {item.total_parcelas > 1 && (
                          <span className="selo-parcela">{item.parcela_atual}/{item.total_parcelas}</span>
                        )}
                      </td>
                      <td>{nomeCategoria[item.categoria_id] || '—'}</td>
                      <td>{fontesPorId[item.fonte_destino_id]?.nome || '—'}</td>
                      <td>
                        {item.tipo === 'entrada' ? (
                          <span className="badge badge-entrada">▲ Entrada</span>
                        ) : (
                          <span className="badge badge-saida">▼ Saída</span>
                        )}
                      </td>
                      <td className="tabular" style={{ fontWeight: 700 }}>{formatarMoeda(item.valor)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            onClick={() => editar(item)}
                            disabled={item.total_parcelas > 1}
                            title={item.total_parcelas > 1 ? 'Para alterar uma compra parcelada, exclua as parcelas e cadastre de novo.' : 'Editar'}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => setItemExcluir(item)}
                            title="Excluir"
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

            <div className="paginacao">
              <span>
                {resultado.total} lançamento(s) · página {resultado.pagina} de {totalPaginas}
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina(pagina - 1)}
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina(pagina + 1)}
                >
                  Próxima <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {itemExcluir && (
        <div className="modal-backdrop">
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="titulo-excluir">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} color="#B91C1C" />
              <h3 id="titulo-excluir" style={{ fontSize: '1.05rem', color: 'var(--forest)' }}>Confirmar exclusão</h3>
            </div>

            {itemExcluir.total_parcelas > 1 ? (
              <p className="modal-texto">
                <strong>"{itemExcluir.descricao}"</strong> é a parcela {itemExcluir.parcela_atual} de{' '}
                {itemExcluir.total_parcelas} ({formatarMoeda(itemExcluir.valor)}). Deseja excluir apenas esta parcela
                ou todas as parcelas da compra?
              </p>
            ) : (
              <p className="modal-texto">
                Deseja excluir <strong>"{itemExcluir.descricao}"</strong>, no valor de{' '}
                <strong>{formatarMoeda(itemExcluir.valor)}</strong>?
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '0.6rem' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setItemExcluir(null)}>
                Cancelar
              </button>
              {itemExcluir.total_parcelas > 1 ? (
                <>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(false)}>
                    <Trash2 size={14} /> Apenas esta parcela
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(true)}>
                    <Trash2 size={14} /> Todas as {itemExcluir.total_parcelas} parcelas
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => excluir(false)}>
                  <Trash2 size={14} /> Excluir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {ultimoExcluido && (
        <div className="toast-undo">
          <span>
            Lançamento <strong>"{ultimoExcluido.descricao}"</strong> excluído.
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={desfazerExclusao}>
            <RotateCcw size={13} /> Desfazer
          </button>
        </div>
      )}
    </>
  );
}
