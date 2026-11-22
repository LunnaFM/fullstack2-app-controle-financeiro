import { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  LogOut,
  HelpCircle,
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  Landmark,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Search,
  RotateCcw,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  PieChart,
  BarChart3,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import {
  competenciaDaFatura,
  proximasCompetencias,
  valorEmCentavos,
} from '../services/faturas';
import {
  filtrarLancamentosPorPeriodo,
  serializarCsv,
} from '../services/relatorios';

const DEMO_CATEGORIAS = [
  { id: 1, nome: 'Salário', tipo: 'entrada' },
  { id: 2, nome: 'Alimentação', tipo: 'saida' },
  { id: 3, nome: 'Moradia', tipo: 'saida' },
  { id: 4, nome: 'Transporte', tipo: 'saida' },
];

const DEMO_FONTES = [
  { id: 1, nome: 'Conta Corrente', tipo: 'conta' },
  {
    id: 2,
    nome: 'Cartão de Crédito',
    tipo: 'cartao_credito',
    dia_fechamento: 10,
    dia_vencimento: 17,
    limite: '5000.00',
  },
  { id: 3, nome: 'PIX / Carteira', tipo: 'renda' },
];

const DEMO_LANCAMENTOS = [
  {
    id: 1,
    descricao: 'Salário Mensal',
    valor: 4500.0,
    tipo: 'entrada',
    data: '2026-11-05',
    categoriaId: 1,
    fonteDestinoId: 1,
    parcelas: 1,
  },
  {
    id: 2,
    descricao: 'Aluguel Apartamento',
    valor: 1350.0,
    tipo: 'saida',
    data: '2026-11-10',
    categoriaId: 3,
    fonteDestinoId: 1,
    parcelas: 1,
  },
];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarData(dataStr) {
  if (!dataStr) return '-';
  const limpa = String(dataStr).split('T')[0];
  const partes = limpa.split('-');
  if (partes.length !== 3) return limpa;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterDataLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

async function carregarLancamentos() {
  const porPagina = 100;
  const primeiraPagina = await apiFetch(
    `/lancamentos?pagina=1&porPagina=${porPagina}`
  );

  if (Array.isArray(primeiraPagina)) return primeiraPagina;

  const primeirosDados =
    primeiraPagina?.dados || primeiraPagina?.lancamentos || [];
  const total = Number(primeiraPagina?.total ?? primeirosDados.length);
  const totalPaginas = Math.ceil(total / porPagina);

  if (totalPaginas <= 1) return primeirosDados;

  const paginasRestantes = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, index) =>
      apiFetch(`/lancamentos?pagina=${index + 2}&porPagina=${porPagina}`)
    )
  );

  return [
    ...primeirosDados,
    ...paginasRestantes.flatMap((pagina) =>
      Array.isArray(pagina)
        ? pagina
        : pagina?.dados || pagina?.lancamentos || []
    ),
  ];
}

export default function Painel() {
  const { usuario, logout } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState('visao-geral');
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [modoDemo, setModoDemo] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erroApi, setErroApi] = useState('');
  const [apiParcial, setApiParcial] = useState(false);

  const [categorias, setCategorias] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [periodoRelatorio, setPeriodoRelatorio] = useState('todos');
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState('');
  const [mesFaturaSelecionada, setMesFaturaSelecionada] = useState('');

  const [filtros, setFiltros] = useState({
    busca: '',
    tipo: '',
    categoriaId: '',
    fonteDestinoId: '',
    inicio: '',
    fim: '',
  });

  const [hoje] = useState(obterDataLocal);
  const [formLanc, setFormLanc] = useState({
    id: null,
    descricao: '',
    valor: '',
    tipo: 'saida',
    data: hoje,
    categoriaId: '',
    fonteDestinoId: '',
    parcelas: 1,
  });

  const [formCat, setFormCat] = useState({ id: null, nome: '', tipo: 'saida' });
  const [formFonte, setFormFonte] = useState({
    id: null,
    nome: '',
    tipo: 'conta',
    diaFechamento: '',
    diaVencimento: '',
    limite: '',
  });

  const [itemExcluir, setItemExcluir] = useState(null);
  const [ultimoExcluido, setUltimoExcluido] = useState(null);

  function mostrarFeedback(msg) {
    setErroApi('');
    setAviso(msg);
    setTimeout(() => setAviso(''), 4000);
  }

  function mostrarErro(msg) {
    setAviso('');
    setErroApi(msg);
  }

  async function carregarTudo() {
    const resultados = await Promise.allSettled([
      apiFetch('/categorias'),
      apiFetch('/fontes-destinos'),
      carregarLancamentos(),
    ]);

    const [resCat, resFontes, resLanc] = resultados;

    const falhas = [
      [resCat, 'categorias'],
      [resFontes, 'fontes/destinos'],
      [resLanc, 'lançamentos'],
    ]
      .filter(([resultado]) => resultado.status === 'rejected')
      .map(([, nome]) => nome);

    setApiParcial(falhas.length > 0);

    const apiRespondeu =
      resCat.status === 'fulfilled' ||
      resFontes.status === 'fulfilled' ||
      resLanc.status === 'fulfilled';

    if (!apiRespondeu) {
      setModoDemo(true);
      setCategorias(DEMO_CATEGORIAS);
      setFontes(DEMO_FONTES);
      setLancamentos(DEMO_LANCAMENTOS);
      setErroApi('API indisponível. Os dados exibidos são de demonstração e não serão salvos.');
      return;
    }

    setModoDemo(false);
    setErroApi(
      falhas.length > 0
        ? `Não foi possível carregar: ${falhas.join(', ')}.`
        : ''
    );

    if (resCat.status === 'fulfilled') {
      const lista = Array.isArray(resCat.value) ? resCat.value : resCat.value?.categorias || [];
      setCategorias(lista);
    }
    if (resFontes.status === 'fulfilled') {
      const lista = Array.isArray(resFontes.value)
        ? resFontes.value
        : resFontes.value?.fontesDestinos || resFontes.value?.itens || [];
      setFontes(lista);
    }
    if (resLanc.status === 'fulfilled') {
      setLancamentos(
        resLanc.value.map((item) => ({
          ...item,
          categoriaId: item.categoriaId ?? item.categoria_id,
          fonteDestinoId: item.fonteDestinoId ?? item.fonte_destino_id,
          parcelas: item.parcelas ?? item.total_parcelas,
        }))
      );
    }
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  // Categorias compatíveis com o tipo selecionado no lançamento (Checklist 10.14)
  const categoriasCompatíveis = useMemo(() => {
    return categorias.filter((c) => c.tipo === formLanc.tipo);
  }, [categorias, formLanc.tipo]);

  const categoriaIdSelecionada = categoriasCompatíveis.some(
    (categoria) => String(categoria.id) === String(formLanc.categoriaId)
  )
    ? String(formLanc.categoriaId)
    : String(categoriasCompatíveis[0]?.id || '');
  const fonteDestinoIdSelecionada = fontes.some(
    (fonte) => String(fonte.id) === String(formLanc.fonteDestinoId)
  )
    ? String(formLanc.fonteDestinoId)
    : String(fontes[0]?.id || '');

  const lancamentosDoPeriodo = useMemo(
    () => filtrarLancamentosPorPeriodo(lancamentos, periodoRelatorio, hoje),
    [lancamentos, periodoRelatorio, hoje]
  );

  const resumoKpi = useMemo(() => {
    const entradas = lancamentosDoPeriodo
      .filter((l) => l.tipo === 'entrada')
      .reduce((acc, l) => acc + Number(l.valor || 0), 0);
    const saidas = lancamentosDoPeriodo
      .filter((l) => l.tipo === 'saida')
      .reduce((acc, l) => acc + Number(l.valor || 0), 0);
    return { entradas, saidas, saldo: entradas - saidas };
  }, [lancamentosDoPeriodo]);

  const dadosGraficoCategorias = useMemo(() => {
    const mapa = {};
    lancamentosDoPeriodo
      .filter((l) => l.tipo === 'saida')
      .forEach((l) => {
        const cat =
          l.categoria?.nome ||
          categorias.find((c) => Number(c.id) === Number(l.categoriaId))?.nome ||
          'Outros';
        mapa[cat] = (mapa[cat] || 0) + Number(l.valor || 0);
      });
    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentosDoPeriodo, categorias]);
  const totalGastosCategorias = dadosGraficoCategorias.reduce(
    (total, categoria) => total + categoria.total,
    0
  );

  const dadosGraficoFontes = useMemo(() => {
    const mapa = {};
    lancamentosDoPeriodo.forEach((l) => {
      const f =
        l.fonteDestino?.nome ||
        l.fonte_destino?.nome ||
        fontes.find((item) => Number(item.id) === Number(l.fonteDestinoId))?.nome ||
        'Conta Principal';
      mapa[f] = (mapa[f] || 0) + Number(l.valor || 0);
    });
    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);
  }, [lancamentosDoPeriodo, fontes]);

  const cartoes = useMemo(
    () => fontes.filter((fonte) => fonte.tipo === 'cartao_credito'),
    [fontes]
  );
  const mesesFatura = useMemo(
    () => proximasCompetencias(hoje, 3),
    [hoje]
  );
  const faturasComDetalhe = useMemo(() => {
    const fontesPorId = new Map(
      cartoes.map((cartao) => [String(cartao.id), cartao])
    );
    const lancamentosPorMes = new Map(
      mesesFatura.map((mes) => [mes.chave, []])
    );

    lancamentos.forEach((item) => {
      if (item.tipo !== 'saida') return;

      const cartao = fontesPorId.get(String(item.fonteDestinoId));
      if (!cartao) return;

      const competencia = competenciaDaFatura(
        item.data,
        cartao.dia_fechamento,
        cartao.dia_vencimento
      );
      const itensDoMes = lancamentosPorMes.get(competencia);
      if (itensDoMes) itensDoMes.push(item);
    });

    return mesesFatura.map((mes) => {
      const itens = lancamentosPorMes.get(mes.chave);
      const totalCentavos = itens.reduce(
        (total, item) => total + valorEmCentavos(item.valor),
        0
      );

      return {
        ...mes,
        total: totalCentavos / 100,
        quantidade: itens.length,
        lancamentos: itens,
      };
    });
  }, [cartoes, lancamentos, mesesFatura]);
  const previsaoFaturas = faturasComDetalhe.map((fatura) => ({
    ...fatura,
    quantidade: fatura.quantidade
      ? `${fatura.quantidade} parcela(s) prevista(s)`
      : 'Aguardando lançamentos',
  }));
  const cartaoSelecionado =
    cartoes.find((cartao) => String(cartao.id) === cartaoSelecionadoId) ||
    cartoes[0] ||
    null;
  const faturasDoCartao = useMemo(
    () =>
      faturasComDetalhe.map((fatura) => {
        const itens = fatura.lancamentos.filter(
          (item) => String(item.fonteDestinoId) === String(cartaoSelecionado?.id)
        );
        const totalCentavos = itens.reduce(
          (total, item) => total + valorEmCentavos(item.valor),
          0
        );

        return {
          ...fatura,
          total: totalCentavos / 100,
          quantidade: itens.length,
          lancamentos: itens,
        };
      }),
    [cartaoSelecionado, faturasComDetalhe]
  );
  const faturaSelecionada =
    faturasDoCartao.find((fatura) => fatura.chave === mesFaturaSelecionada) ||
    faturasDoCartao[0] ||
    null;

  const lancamentosRecentes = useMemo(
    () =>
      [...lancamentos]
        .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
        .slice(0, 5),
    [lancamentos]
  );

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtros.busca && !l.descricao.toLowerCase().includes(filtros.busca.toLowerCase())) {
        return false;
      }
      if (filtros.tipo && l.tipo !== filtros.tipo) return false;
      if (filtros.categoriaId && String(l.categoriaId) !== String(filtros.categoriaId)) return false;
      if (filtros.fonteDestinoId && String(l.fonteDestinoId) !== String(filtros.fonteDestinoId))
        return false;
      const dataItem = String(l.data || '').split('T')[0];
      if (filtros.inicio && dataItem < filtros.inicio) return false;
      if (filtros.fim && dataItem > filtros.fim) return false;
      return true;
    });
  }, [lancamentos, filtros]);

  function exportarLancamentosCsv() {
    const linhas = lancamentosFiltrados.map((item) => {
      const categoria =
        item.categoria?.nome ||
        categorias.find((registro) => Number(registro.id) === Number(item.categoriaId))
          ?.nome ||
        '';
      const fonte =
        item.fonteDestino?.nome ||
        item.fonte_destino?.nome ||
        fontes.find((registro) => Number(registro.id) === Number(item.fonteDestinoId))
          ?.nome ||
        '';

      return [
        formatarData(item.data),
        item.descricao,
        item.tipo === 'entrada' ? 'Entrada' : 'Saída',
        categoria,
        fonte,
        Number(item.parcelas) > 1
          ? `${item.parcela_atual ?? 1}/${item.parcelas}`
          : 'Única',
        Number(item.valor || 0).toFixed(2).replace('.', ','),
      ];
    });
    const csv = serializarCsv([
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Fonte / Destino', 'Parcela', 'Valor (R$)'],
      ...linhas,
    ]);
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `lancamentos-${hoje}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function salvarLancamento(e) {
    e.preventDefault();
    setErroApi('');
    const parcelas = Number(formLanc.parcelas) || 1;
    const fonteSelecionada = fontes.find(
      (fonte) => String(fonte.id) === fonteDestinoIdSelecionada
    );

    if (!categoriaIdSelecionada || !fonteDestinoIdSelecionada) {
      mostrarErro('Cadastre ou selecione uma categoria e uma fonte/destino válidos.');
      return;
    }

    if (
      parcelas > 1 &&
      (formLanc.tipo !== 'saida' || fonteSelecionada?.tipo !== 'cartao_credito')
    ) {
      mostrarErro('Parcelamentos exigem uma saída vinculada a um cartão de crédito.');
      return;
    }

    const payload = {
      descricao: formLanc.descricao,
      valor: Number(formLanc.valor),
      tipo: formLanc.tipo,
      data: formLanc.data,
      categoriaId: Number(categoriaIdSelecionada),
      fonteDestinoId: Number(fonteDestinoIdSelecionada),
      parcelas,
      ...(!formLanc.id && { totalParcelas: parcelas }),
    };

    if (modoDemo) {
      if (formLanc.id) {
        setLancamentos((prev) =>
          prev.map((item) => (item.id === formLanc.id ? { ...item, ...payload } : item))
        );
      } else {
        setLancamentos((prev) => [{ id: Date.now(), ...payload }, ...prev]);
      }
      mostrarFeedback('Lançamento salvo (modo demonstração).');
    } else {
      try {
        if (formLanc.id) {
          await apiFetch(`/lancamentos/${formLanc.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
          mostrarFeedback('Lançamento atualizado com sucesso!');
        } else {
          await apiFetch('/lancamentos', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          mostrarFeedback('Lançamento registrado com sucesso!');
        }
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Erro ao salvar lançamento.');
        return;
      }
    }

    setFormLanc({
      id: null,
      descricao: '',
      valor: '',
      tipo: 'saida',
      data: hoje,
      categoriaId: '',
      fonteDestinoId: fontes[0]?.id ? String(fontes[0].id) : '',
      parcelas: 1,
    });
  }

  function editarLancamento(item) {
    setErroApi('');
    setFormLanc({
      id: item.id,
      descricao: item.descricao,
      valor: String(item.valor),
      tipo: item.tipo,
      data: String(item.data || hoje).split('T')[0],
      categoriaId: String(item.categoriaId || ''),
      fonteDestinoId: String(item.fonteDestinoId || fontes[0]?.id || ''),
      parcelas: Number(item.parcelas) || 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function confirmarExclusaoLancamento() {
    if (!itemExcluir) return;
    const alvo = itemExcluir;
    setItemExcluir(null);

    if (!modoDemo) {
      try {
        await apiFetch(`/lancamentos/${alvo.id}`, { method: 'DELETE' });
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Não foi possível excluir o lançamento.');
        return;
      }
    } else {
      setLancamentos((prev) => prev.filter((l) => l.id !== alvo.id));
    }

    setUltimoExcluido(alvo);
    setTimeout(() => setUltimoExcluido(null), 6000);
  }

  async function desfazerExclusao() {
    if (!ultimoExcluido) return;
    const item = ultimoExcluido;
    setUltimoExcluido(null);

    if (!modoDemo) {
      try {
        await apiFetch('/lancamentos', {
          method: 'POST',
          body: JSON.stringify({
            descricao: item.descricao,
            valor: Number(item.valor),
            tipo: item.tipo,
            data: String(item.data).split('T')[0],
            categoriaId: Number(item.categoriaId),
            fonteDestinoId: Number(item.fonteDestinoId),
            totalParcelas: 1,
          }),
        });
        await carregarTudo();
        mostrarFeedback(
          Number(item.parcelas) > 1
            ? 'A parcela foi restaurada como lançamento individual; o grupo original não foi recriado.'
            : 'Lançamento restaurado!'
        );
      } catch (err) {
        mostrarErro(err.message || 'Erro ao restaurar lançamento.');
      }
    } else {
      setLancamentos((prev) => [
        {
          ...item,
          parcelas: 1,
          parcela_atual: 1,
          total_parcelas: 1,
          grupo_parcelamento: null,
        },
        ...prev,
      ]);
      mostrarFeedback(
        Number(item.parcelas) > 1
          ? 'A parcela foi restaurada como lançamento individual; o grupo original não foi recriado.'
          : 'Lançamento restaurado!'
      );
    }
  }

  async function salvarCategoria(e) {
    e.preventDefault();
    setErroApi('');
    const payload = { nome: formCat.nome, tipo: formCat.tipo };

    if (modoDemo) {
      setCategorias((prev) =>
        formCat.id
          ? prev.map((categoria) =>
              categoria.id === formCat.id ? { ...categoria, ...payload } : categoria
            )
          : [...prev, { id: Date.now(), ...payload }]
      );
    } else {
      try {
        if (formCat.id) {
          await apiFetch(`/categorias/${formCat.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch('/categorias', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Erro ao salvar categoria.');
        return;
      }
    }

    setFormCat({ id: null, nome: '', tipo: 'saida' });
    mostrarFeedback('Categoria salva!');
  }

  async function excluirCategoria(id) {
    setErroApi('');
    if (!modoDemo) {
      try {
        await apiFetch(`/categorias/${id}`, { method: 'DELETE' });
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Não é possível excluir categoria em uso.');
        return;
      }
    } else {
      setCategorias((prev) => prev.filter((c) => c.id !== id));
    }
    mostrarFeedback('Categoria removida.');
  }

  async function salvarFonte(e) {
    e.preventDefault();
    setErroApi('');
    const payload = {
      nome: formFonte.nome,
      tipo: formFonte.tipo,
      ...(formFonte.tipo === 'cartao_credito' && {
        dia_fechamento: Number(formFonte.diaFechamento),
        dia_vencimento: Number(formFonte.diaVencimento),
        limite: Number(formFonte.limite),
      }),
    };

    if (modoDemo) {
      setFontes((prev) =>
        formFonte.id
          ? prev.map((fonte) =>
              fonte.id === formFonte.id ? { ...fonte, ...payload } : fonte
            )
          : [...prev, { id: Date.now(), ...payload }]
      );
    } else {
      try {
        if (formFonte.id) {
          await apiFetch(`/fontes-destinos/${formFonte.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });
        } else {
          await apiFetch('/fontes-destinos', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Erro ao salvar fonte/destino.');
        return;
      }
    }

    setFormFonte({
      id: null,
      nome: '',
      tipo: 'conta',
      diaFechamento: '',
      diaVencimento: '',
      limite: '',
    });
    mostrarFeedback('Fonte/Destino salva!');
  }

  async function excluirFonte(id) {
    setErroApi('');
    if (!modoDemo) {
      try {
        await apiFetch(`/fontes-destinos/${id}`, { method: 'DELETE' });
        await carregarTudo();
      } catch (err) {
        mostrarErro(err.message || 'Não é possível excluir fonte/destino em uso.');
        return;
      }
    } else {
      setFontes((prev) => prev.filter((f) => f.id !== id));
    }
    mostrarFeedback('Fonte/Destino removida.');
  }

  const maxFonte = Math.max(...dadosGraficoFontes.map((f) => f.total), 1);

  return (
    <div>
      <header className="appbar">
        <div className="appbar-inner">
          <div className="appbar-brand">
            <Wallet size={22} />
            <span>CONTROLE FINANCEIRO</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }}>
            <span className="status-pill">
              <span className="status-dot" />
              {modoDemo
                ? 'Sessão Ativa · Demo Local'
                : apiParcial
                  ? 'API parcialmente indisponível'
                  : 'API Online · Sessão Ativa'}
            </span>

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
          <button
            type="button"
            className={`tab-btn ${abaAtiva === 'visao-geral' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('visao-geral')}
          >
            <LayoutDashboard size={15} /> Visão Geral
          </button>
          <button
            type="button"
            className={`tab-btn ${abaAtiva === 'faturas' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('faturas')}
          >
            <CreditCard size={15} /> Cartões e Faturas
          </button>
          <button
            type="button"
            className={`tab-btn ${abaAtiva === 'lancamentos' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('lancamentos')}
          >
            <ArrowLeftRight size={15} /> Lançamentos ({lancamentos.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${abaAtiva === 'categorias' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('categorias')}
          >
            <Tags size={15} /> Categorias ({categorias.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${abaAtiva === 'fontes' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('fontes')}
          >
            <Landmark size={15} /> Fontes / Destinos ({fontes.length})
          </button>
        </div>
      </nav>

      <main className="main-container">
        {mostrarAjuda && (
          <div className="card" style={{ background: '#F7FAF8' }}>
            <div className="card-header">
              <div className="card-title">
                <HelpCircle size={17} /> Guia Rápido do Sistema
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setMostrarAjuda(false)}
              >
                <X size={14} /> Fechar
              </button>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <strong>1. Compatibilidade de Tipos:</strong> Lançamentos de <em>Saída</em> aceitam apenas categorias de saída; lançamentos de <em>Entrada</em> aceitam apenas categorias de entrada.<br />
              <strong>2. Parcelamentos e Fechamento:</strong> Compras parceladas dividem o valor exato em centavos pelos meses seguintes. Compras no dia do fechamento entram na fatura seguinte.<br />
              <strong>3. Relatórios:</strong> A aba <em>Visão Geral</em> consolida totais por categoria, fonte/destino e previsão de faturas futuras.
            </p>
          </div>
        )}

        {aviso && (
          <div className="alerta-sucesso">
            <CheckCircle2 size={18} />
            <span>{aviso}</span>
          </div>
        )}

        {erroApi && (
          <div className="alerta-erro">
            <AlertCircle size={18} />
            <span>{erroApi}</span>
          </div>
        )}

        {abaAtiva === 'visao-geral' && (
          <div className="page-heading">
            <div>
              <span className="page-eyebrow">RESUMO FINANCEIRO</span>
              <h1>Visão geral</h1>
              <p>Olá, {usuario?.nome || 'Usuário'}. Veja como estão suas finanças.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setAbaAtiva('lancamentos')}
            >
              <Plus size={16} /> Novo lançamento
            </button>
          </div>
        )}

        {abaAtiva === 'visao-geral' && (
          <>
            <div className="filters-bar report-period-filter">
              <div>
                <label htmlFor="periodo-relatorio">PERÍODO DOS RELATÓRIOS</label>
                <select
                  id="periodo-relatorio"
                  value={periodoRelatorio}
                  onChange={(e) => setPeriodoRelatorio(e.target.value)}
                >
                  <option value="todos">Todo o período</option>
                  <option value="mes-atual">Mês atual</option>
                  <option value="ultimos-3-meses">Últimos 3 meses</option>
                  <option value="ano-atual">Ano atual</option>
                </select>
              </div>
              <p>
                Mês, últimos três meses e ano vão até hoje; todo o período inclui
                todos os registros. A previsão de faturas continua nos próximos
                três meses.
              </p>
            </div>

            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-top">
                  <span>Total de Entradas</span>
                  <TrendingUp size={17} color="#146C43" />
                </div>
                <div className="kpi-value tabular" style={{ color: '#146C43' }}>
                  ▲ {formatarMoeda(resumoKpi.entradas)}
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span>Total de Saídas</span>
                  <TrendingDown size={17} color="#B91C1C" />
                </div>
                <div className="kpi-value tabular" style={{ color: '#B91C1C' }}>
                  ▼ {formatarMoeda(resumoKpi.saidas)}
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span>
                    {periodoRelatorio === 'todos'
                      ? 'Resultado de todos os registros'
                      : 'Resultado do período'}
                  </span>
                  <Wallet size={17} color="#0E3528" />
                </div>
                <div className="kpi-value tabular">{formatarMoeda(resumoKpi.saldo)}</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-top">
                  <span>Próxima Fatura</span>
                  <CreditCard size={17} color="#0E3528" />
                </div>
                <div className="kpi-value tabular">
                  {formatarMoeda(previsaoFaturas[0]?.total || 0)}
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <PieChart size={17} /> Gastos por Categoria
                  </div>
                </div>
                {dadosGraficoCategorias.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Nenhum gasto registrado ainda.
                  </p>
                ) : (
                  dadosGraficoCategorias.map((item) => {
                    const pct = totalGastosCategorias > 0
                      ? Math.round((item.total / totalGastosCategorias) * 100)
                      : 0;
                    return (
                      <div key={item.nome} style={{ marginBottom: '0.95rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                          }}
                        >
                          <span>{item.nome}</span>
                          <span className="tabular">
                            {formatarMoeda(item.total)} ({pct}%)
                          </span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <BarChart3 size={17} /> Movimentação por Fonte / Destino
                  </div>
                </div>
                {dadosGraficoFontes.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Nenhuma movimentação encontrada.
                  </p>
                ) : (
                  dadosGraficoFontes.map((item) => {
                    const pct = Math.round((item.total / maxFonte) * 100);
                    return (
                      <div key={item.nome} style={{ marginBottom: '0.95rem' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '0.86rem',
                            fontWeight: 700,
                          }}
                        >
                          <span>{item.nome}</span>
                          <span className="tabular">{formatarMoeda(item.total)}</span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${pct}%`, background: 'var(--forest)' }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">
                    <Calendar size={17} /> Previsão de Faturas
                  </div>
                  <p className="section-description">Próximos três meses, agrupados pelo vencimento.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setAbaAtiva('faturas')}
                >
                  Ver cartões
                </button>
              </div>

              <div className="kpi-grid" style={{ marginBottom: 0 }}>
                {previsaoFaturas.map((fat) => (
                  <div
                    key={fat.mes}
                    style={{
                      border: '1.5px solid var(--forest)',
                      background: 'var(--bg-sage)',
                      padding: '1rem',
                      borderRadius: '2px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: 'var(--forest)',
                        marginBottom: '0.4rem',
                      }}
                    >
                      <span>{fat.mes}</span>
                      <CreditCard size={15} />
                    </div>
                    <div className="invoice-period">{fat.competencia}</div>
                    <div className="tabular" style={{ fontSize: '1.3rem', fontWeight: 800 }}>
                      {formatarMoeda(fat.total)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      {fat.quantidade}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Lançamentos recentes</div>
                  <p className="section-description">
                    As últimas movimentações registradas na sua conta.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setAbaAtiva('lancamentos')}
                >
                  Ver todos
                </button>
              </div>

              {lancamentosRecentes.length === 0 ? (
                <p className="empty-state">
                  Nenhum lançamento encontrado. Registre sua primeira movimentação.
                </p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Categoria</th>
                        <th>Tipo</th>
                        <th>Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamentosRecentes.map((item) => {
                        const categoria = categorias.find(
                          (registro) => Number(registro.id) === Number(item.categoriaId)
                        );

                        return (
                          <tr key={item.id}>
                            <td className="tabular">{formatarData(item.data)}</td>
                            <td><strong>{item.descricao}</strong></td>
                            <td>{categoria?.nome || '—'}</td>
                            <td>
                              {item.tipo === 'entrada' ? (
                                <span className="badge badge-entrada">Entrada</span>
                              ) : (
                                <span className="badge badge-saida">Saída</span>
                              )}
                            </td>
                            <td className="tabular">
                              <strong>{formatarMoeda(item.valor)}</strong>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {abaAtiva === 'faturas' && (
          <>
            <div className="page-heading">
              <div>
                <span className="page-eyebrow">CARTÕES</span>
                <h1>Cartões e faturas</h1>
                <p>Consulte as parcelas previstas por cartão e mês de vencimento.</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setAbaAtiva('fontes')}
              >
                <Plus size={16} /> Cadastrar cartão
              </button>
            </div>

            {cartoes.length === 0 ? (
              <div className="card empty-card">
                <CreditCard size={28} />
                <h2>Nenhum cartão cadastrado</h2>
                <p>
                  Cadastre um cartão com fechamento, vencimento e limite para acompanhar as faturas.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setAbaAtiva('fontes')}
                >
                  Cadastrar cartão
                </button>
              </div>
            ) : (
              <>
                <div className="card invoice-filter">
                  <div className="form-group">
                    <label htmlFor="cartao-fatura">Cartão</label>
                    <select
                      id="cartao-fatura"
                      value={String(cartaoSelecionado?.id || '')}
                      onChange={(e) => setCartaoSelecionadoId(e.target.value)}
                    >
                      {cartoes.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>
                          {cartao.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="invoice-card-details">
                    <div>
                      <span>Fechamento</span>
                      <strong>Dia {cartaoSelecionado.dia_fechamento}</strong>
                    </div>
                    <div>
                      <span>Vencimento</span>
                      <strong>Dia {cartaoSelecionado.dia_vencimento}</strong>
                    </div>
                    <div>
                      <span>Limite</span>
                      <strong>{formatarMoeda(cartaoSelecionado.limite)}</strong>
                    </div>
                  </div>
                </div>

                <div className="invoice-month-grid">
                  {faturasDoCartao.map((fatura) => (
                    <button
                      type="button"
                      key={fatura.chave}
                      className={`invoice-month-button ${
                        faturaSelecionada?.chave === fatura.chave ? 'active' : ''
                      }`}
                      aria-pressed={faturaSelecionada?.chave === fatura.chave}
                      onClick={() => setMesFaturaSelecionada(fatura.chave)}
                    >
                      <span>{fatura.mes}</span>
                      <strong className="tabular">{formatarMoeda(fatura.total)}</strong>
                      <span>{fatura.competencia}</span>
                      <small>
                        {fatura.quantidade
                          ? `${fatura.quantidade} lançamento(s)`
                          : 'Sem lançamentos previstos'}
                      </small>
                    </button>
                  ))}
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <div className="card-title">Detalhamento da fatura</div>
                      <p className="section-description">
                        {faturaSelecionada?.competencia} · Vencimento dia{' '}
                        {cartaoSelecionado.dia_vencimento}
                      </p>
                    </div>
                    <strong className="invoice-detail-total tabular">
                      {formatarMoeda(faturaSelecionada?.total || 0)}
                    </strong>
                  </div>

                  {!faturaSelecionada?.lancamentos.length ? (
                    <p className="empty-state">
                      Nenhum lançamento previsto para esta fatura.
                    </p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Parcela</th>
                            <th>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {faturaSelecionada.lancamentos.map((item) => {
                            const categoria = categorias.find(
                              (registro) =>
                                Number(registro.id) === Number(item.categoriaId)
                            );

                            return (
                              <tr key={item.id}>
                                <td className="tabular">{formatarData(item.data)}</td>
                                <td><strong>{item.descricao}</strong></td>
                                <td>{categoria?.nome || '—'}</td>
                                <td>
                                  {Number(item.parcelas) > 1
                                    ? `${item.parcela_atual}/${item.parcelas}`
                                    : 'Única'}
                                </td>
                                <td className="tabular">
                                  <strong>{formatarMoeda(item.valor)}</strong>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {abaAtiva === 'lancamentos' && (
          <>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Plus size={17} />
                  {formLanc.id ? 'Editar Lançamento' : 'Novo Lançamento Financeiro'}
                </div>
                {formLanc.id && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setFormLanc({
                        id: null,
                        descricao: '',
                        valor: '',
                        tipo: 'saida',
                        data: hoje,
                        categoriaId: '',
                        fonteDestinoId: fontes[0]?.id ? String(fontes[0].id) : '',
                        parcelas: 1,
                      })
                    }
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>

              <form onSubmit={salvarLancamento}>
                <div className="filters-bar" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Descrição</label>
                    <input
                      type="text"
                      placeholder="Ex.: Mercado, Salário..."
                      value={formLanc.descricao}
                      onChange={(e) => setFormLanc({ ...formLanc, descricao: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={formLanc.valor}
                      onChange={(e) => setFormLanc({ ...formLanc, valor: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Tipo</label>
                    <select
                      value={formLanc.tipo}
                      onChange={(e) =>
                        setFormLanc({
                          ...formLanc,
                          tipo: e.target.value,
                          categoriaId: '',
                        })
                      }
                    >
                      <option value="saida">▼ Saída (Despesa)</option>
                      <option value="entrada">▲ Entrada (Receita)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Data</label>
                    <input
                      type="date"
                      value={formLanc.data}
                      onChange={(e) => setFormLanc({ ...formLanc, data: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Categoria ({formLanc.tipo === 'entrada' ? 'Entrada' : 'Saída'})</label>
                    <select
                      value={categoriaIdSelecionada}
                      onChange={(e) => setFormLanc({ ...formLanc, categoriaId: e.target.value })}
                      required
                    >
                      {categoriasCompatíveis.length === 0 && (
                        <option value="">Cadastre uma categoria deste tipo</option>
                      )}
                      {categoriasCompatíveis.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Fonte / Destino</label>
                    <select
                      value={fonteDestinoIdSelecionada}
                      onChange={(e) => setFormLanc({ ...formLanc, fonteDestinoId: e.target.value })}
                      required
                    >
                      {fontes.length === 0 && (
                        <option value="">Cadastre uma fonte/destino</option>
                      )}
                      {fontes.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Parcelas</label>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={formLanc.parcelas}
                      disabled={Boolean(formLanc.id)}
                      onChange={(e) => setFormLanc({ ...formLanc, parcelas: e.target.value })}
                    />
                  </div>
                </div>

                {formLanc.id && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    A quantidade de parcelas só pode ser definida ao criar um lançamento.
                  </p>
                )}

                {Number(formLanc.parcelas) > 1 && (
                  <div
                    style={{
                      background: 'var(--warning-bg)',
                      border: '1px solid var(--warning-border)',
                      padding: '0.6rem 0.8rem',
                      fontSize: '0.82rem',
                      marginTop: '0.75rem',
                      borderRadius: '2px',
                    }}
                  >
                    <strong>Atenção ao parcelamento:</strong> Serão geradas{' '}
                    <strong>{formLanc.parcelas} parcelas</strong> mensais que somam exatamente{' '}
                    <strong>{formatarMoeda(formLanc.valor || 0)}</strong>.
                  </div>
                )}

                <div style={{ marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={15} />
                    {formLanc.id ? 'Salvar Alterações' : 'Registrar Lançamento'}
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <ArrowLeftRight size={17} /> Histórico de Lançamentos
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={exportarLancamentosCsv}
                    disabled={lancamentosFiltrados.length === 0}
                  >
                    <Download size={13} /> Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() =>
                      setFiltros({
                        busca: '',
                        tipo: '',
                        categoriaId: '',
                        fonteDestinoId: '',
                        inicio: '',
                        fim: '',
                      })
                    }
                  >
                    <RotateCcw size={13} /> Limpar Filtros
                  </button>
                </div>
              </div>

              <div className="filters-bar">
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    <Search size={12} /> BUSCAR DESCRIÇÃO
                  </label>
                  <input
                    type="text"
                    placeholder="Filtrar por nome..."
                    value={filtros.busca}
                    onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    TIPO
                  </label>
                  <select
                    value={filtros.tipo}
                    onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                  >
                    <option value="">Todos</option>
                    <option value="entrada">Entradas</option>
                    <option value="saida">Saídas</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    CATEGORIA
                  </label>
                  <select
                    value={filtros.categoriaId}
                    onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}
                  >
                    <option value="">Todas</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    FONTE / DESTINO
                  </label>
                  <select
                    value={filtros.fonteDestinoId}
                    onChange={(e) =>
                      setFiltros({ ...filtros, fonteDestinoId: e.target.value })
                    }
                  >
                    <option value="">Todas</option>
                    {fontes.map((fonte) => (
                      <option key={fonte.id} value={fonte.id}>
                        {fonte.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    DE (INÍCIO)
                  </label>
                  <input
                    type="date"
                    value={filtros.inicio}
                    onChange={(e) => setFiltros({ ...filtros, inicio: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: 3 }}>
                    ATÉ (FIM)
                  </label>
                  <input
                    type="date"
                    value={filtros.fim}
                    onChange={(e) => setFiltros({ ...filtros, fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Fonte / Destino</th>
                      <th>Tipo</th>
                      <th>Valor</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lancamentosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                          Nenhum lançamento encontrado com os filtros atuais.
                        </td>
                      </tr>
                    ) : (
                      lancamentosFiltrados.map((item) => {
                        const nomeCat =
                          item.categoria?.nome ||
                          categorias.find((c) => Number(c.id) === Number(item.categoriaId))?.nome ||
                          '-';
                        const nomeFonte =
                          item.fonteDestino?.nome ||
                          item.fonte_destino?.nome ||
                          fontes.find((f) => Number(f.id) === Number(item.fonteDestinoId))?.nome ||
                          '-';

                        return (
                          <tr key={item.id}>
                            <td className="tabular">{formatarData(item.data)}</td>
                            <td>
                              <strong>{item.descricao}</strong>
                              {Number(item.parcelas) > 1 && (
                                <span
                                  style={{
                                    marginLeft: '0.45rem',
                                    fontSize: '0.74rem',
                                    background: 'var(--bg-sage)',
                                    border: '1px solid var(--forest)',
                                    padding: '1px 5px',
                                  }}
                                >
                                  {item.parcelas}x
                                </span>
                              )}
                            </td>
                            <td>{nomeCat}</td>
                            <td>{nomeFonte}</td>
                            <td>
                              {item.tipo === 'entrada' ? (
                                <span className="badge badge-entrada">▲ Entrada</span>
                              ) : (
                                <span className="badge badge-saida">▼ Saída</span>
                              )}
                            </td>
                            <td className="tabular" style={{ fontWeight: 700 }}>
                              {formatarMoeda(item.valor)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-sm"
                                  onClick={() => editarLancamento(item)}
                                  disabled={Number(item.parcelas) > 1}
                                  title={
                                    Number(item.parcelas) > 1
                                      ? 'Compras parceladas não podem ser editadas.'
                                      : 'Editar'
                                  }
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
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {abaAtiva === 'categorias' && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Tags size={17} /> {formCat.id ? 'Editar Categoria' : 'Nova Categoria'}
                </div>
              </div>
              <form onSubmit={salvarCategoria}>
                <div className="form-group">
                  <label>Nome da Categoria</label>
                  <input
                    type="text"
                    placeholder="Ex.: Educação, Lazer, Investimentos..."
                    value={formCat.nome}
                    onChange={(e) => setFormCat({ ...formCat, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tipo Padrão</label>
                  <select
                    value={formCat.tipo}
                    onChange={(e) => setFormCat({ ...formCat, tipo: e.target.value })}
                  >
                    <option value="saida">Saída (Despesa)</option>
                    <option value="entrada">Entrada (Receita)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={15} /> {formCat.id ? 'Atualizar' : 'Cadastrar Categoria'}
                  </button>
                  {formCat.id && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => setFormCat({ id: null, nome: '', tipo: 'saida' })}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Categorias Cadastradas</div>
              </div>
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
                        <td>
                          <strong>{c.nome}</strong>
                        </td>
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
                              onClick={() => setFormCat({ id: c.id, nome: c.nome, tipo: c.tipo || 'saida' })}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => excluirCategoria(c.id)}
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
            </div>
          </div>
        )}

        {abaAtiva === 'fontes' && (
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <Landmark size={17} /> {formFonte.id ? 'Editar Fonte / Destino' : 'Nova Fonte / Destino'}
                </div>
              </div>
              <form onSubmit={salvarFonte}>
                <div className="form-group">
                  <label>Nome da Fonte / Destino</label>
                  <input
                    type="text"
                    placeholder="Ex.: Nubank, Conta Banco do Brasil, Carteira..."
                    value={formFonte.nome}
                    onChange={(e) => setFormFonte({ ...formFonte, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Modalidade</label>
                  <select
                    value={formFonte.tipo}
                    onChange={(e) => setFormFonte({ ...formFonte, tipo: e.target.value })}
                  >
                    <option value="conta">Conta Corrente / Poupança</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="renda">Renda / Recebimentos</option>
                  </select>
                </div>
                {formFonte.tipo === 'cartao_credito' && (
                  <>
                    <div className="form-group">
                      <label>Dia de Fechamento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formFonte.diaFechamento}
                        onChange={(e) =>
                          setFormFonte({ ...formFonte, diaFechamento: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Dia de Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formFonte.diaVencimento}
                        onChange={(e) =>
                          setFormFonte({ ...formFonte, diaVencimento: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Limite do Cartão (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formFonte.limite}
                        onChange={(e) =>
                          setFormFonte({ ...formFonte, limite: e.target.value })
                        }
                        required
                      />
                    </div>
                  </>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary">
                    <Plus size={15} /> {formFonte.id ? 'Atualizar' : 'Cadastrar Fonte'}
                  </button>
                  {formFonte.id && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() =>
                        setFormFonte({
                          id: null,
                          nome: '',
                          tipo: 'conta',
                          diaFechamento: '',
                          diaVencimento: '',
                          limite: '',
                        })
                      }
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Fontes e Destinos Cadastrados</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Modalidade</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fontes.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <strong>{f.nome}</strong>
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: '0.78rem', fontWeight: 700 }}>
                          {f.tipo === 'cartao_credito'
                            ? 'Cartão de Crédito'
                            : f.tipo === 'renda'
                              ? 'Renda / Recebimentos'
                              : 'Conta Corrente / Poupança'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => {
                                setFormFonte({
                                  id: f.id,
                                  nome: f.nome,
                                  tipo: f.tipo || 'conta',
                                  diaFechamento: String(f.dia_fechamento || ''),
                                  diaVencimento: String(f.dia_vencimento || ''),
                                  limite: String(f.limite ?? ''),
                                });
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => excluirFonte(f.id)}
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
            </div>
          </div>
        )}
      </main>

      {itemExcluir && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} color="#B91C1C" />
              <h3 style={{ fontSize: '1.05rem', color: 'var(--forest)' }}>Confirmar Exclusão</h3>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              {Number(itemExcluir.parcelas) > 1 ? (
                <>
                  Deseja excluir somente a parcela {itemExcluir.parcela_atual} de {itemExcluir.parcelas} de{' '}
                  <strong>"{itemExcluir.descricao}"</strong>, no valor de{' '}
                  <strong>{formatarMoeda(itemExcluir.valor)}</strong>? O desfazer restaurará apenas esta parcela
                  como lançamento individual.
                </>
              ) : (
                <>
                  Deseja realmente excluir o lançamento <strong>"{itemExcluir.descricao}"</strong> no valor de{' '}
                  <strong>{formatarMoeda(itemExcluir.valor)}</strong>?
                </>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setItemExcluir(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirmarExclusaoLancamento}
              >
                <Trash2 size={14} /> Excluir Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {ultimoExcluido && (
        <div className="toast-undo">
          <span>
            {Number(ultimoExcluido.parcelas) > 1
              ? `Parcela excluída. Desfazer restaura apenas esta parcela como lançamento individual.`
              : <>Lançamento <strong>"{ultimoExcluido.descricao}"</strong> excluído.</>}
          </span>
          <button type="button" className="btn btn-outline btn-sm" onClick={desfazerExclusao}>
            <RotateCcw size={13} /> Desfazer
          </button>
        </div>
      )}
    </div>
  );
}