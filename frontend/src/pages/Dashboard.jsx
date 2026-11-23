import { lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CreditCard, Plus, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import {
  formatarData,
  formatarMoeda,
  formatarReferencia,
  periodoDoMes,
} from '../services/formatacao';
import { Carregando, ErroCarregamento, Vazio } from '../components/Estados';

const RelatorioGraficos = lazy(() => import('../components/RelatorioGraficos'));

// Resumo do mês corrente. Todos os números vêm prontos da API.
export default function Dashboard() {
  const { usuario } = useAuth();
  const { inicio, fim } = periodoDoMes(0);
  const periodo = `inicio=${inicio}&fim=${fim}`;

  const lancamentos = useApi(`/lancamentos?${periodo}&porPagina=5`);
  const categorias = useApi(`/relatorios/categorias?${periodo}`);
  const fontes = useApi(`/relatorios/fontes-destinos?${periodo}`);
  const faturas = useApi('/relatorios/faturas?meses=2');

  const totais = lancamentos.dados?.totais;
  const entradas = Number(totais?.entradas || 0);
  const saidas = Number(totais?.saidas || 0);

  // Soma, mês a mês, as faturas de todos os cartões
  const previsao = useMemo(() => {
    const porReferencia = new Map();
    for (const cartao of faturas.dados?.cartoes || []) {
      for (const f of cartao.faturas) {
        const atual = porReferencia.get(f.referencia) || { referencia: f.referencia, total: 0, itens: 0 };
        atual.total += f.total;
        atual.itens += f.lancamentos.length;
        porReferencia.set(f.referencia, atual);
      }
    }
    return [...porReferencia.values()].sort((a, b) => a.referencia.localeCompare(b.referencia));
  }, [faturas.dados]);

  const carregando = lancamentos.carregando || categorias.carregando || fontes.carregando;
  const erro = lancamentos.erro || categorias.erro || fontes.erro;
  const recarregarTudo = () => {
    lancamentos.recarregar();
    categorias.recarregar();
    fontes.recarregar();
    faturas.recarregar();
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">RESUMO DO MÊS</span>
          <h1>Visão geral</h1>
          <p>
            Olá, {usuario?.nome || 'Usuário'}. Resumo de {formatarData(inicio)} a {formatarData(fim)}.
          </p>
        </div>
        <Link to="/lancamentos" className="btn btn-primary">
          <Plus size={16} /> Novo lançamento
        </Link>
      </div>

      {erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregarTudo} />}
      {carregando && <Carregando texto="Carregando resumo..." />}

      {!carregando && !erro && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-top"><span>Entradas do mês</span><TrendingUp size={17} color="#146C43" /></div>
              <div className="kpi-value tabular" style={{ color: '#146C43' }}>▲ {formatarMoeda(entradas)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><span>Saídas do mês</span><TrendingDown size={17} color="#B91C1C" /></div>
              <div className="kpi-value tabular" style={{ color: '#B91C1C' }}>▼ {formatarMoeda(saidas)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><span>Saldo do mês</span><Wallet size={17} color="#0E3528" /></div>
              <div className="kpi-value tabular">{formatarMoeda(totais?.saldo)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-top"><span>Fatura aberta</span><CreditCard size={17} color="#0E3528" /></div>
              <div className="kpi-value tabular">{formatarMoeda(previsao[0]?.total || 0)}</div>
            </div>
          </div>

          <Suspense fallback={<Carregando texto="Carregando gráficos..." />}>
            <RelatorioGraficos
              categorias={(categorias.dados?.categorias || []).filter((c) => c.total > 0)}
              fontes={(fontes.dados?.fontesDestinos || [])
                .map((f) => ({ nome: f.nome, total: f.entradas + f.saidas }))
                .filter((f) => f.total > 0)}
              entradas={entradas}
              saidas={saidas}
              formatarMoeda={formatarMoeda}
            />
          </Suspense>
        </>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title"><Calendar size={17} /> Previsão de faturas</div>
            <p className="section-description">Soma de todos os cartões, pelo mês de vencimento.</p>
          </div>
          <Link to="/faturas" className="btn btn-outline btn-sm">Ver cartões</Link>
        </div>
        {faturas.carregando && <Carregando />}
        {faturas.erro && <ErroCarregamento mensagem={faturas.erro} onTentarNovamente={faturas.recarregar} />}
        {!faturas.carregando && !faturas.erro && previsao.length === 0 && (
          <Vazio>Nenhum cartão de crédito cadastrado.</Vazio>
        )}
        {previsao.length > 0 && (
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            {previsao.map((f, i) => (
              <div key={f.referencia} className="previsao-fatura">
                <div className="previsao-topo">
                  <span>{i === 0 ? 'Fatura aberta' : `Próxima ${i}`}</span>
                  <CreditCard size={15} />
                </div>
                <div className="invoice-period">{formatarReferencia(f.referencia)}</div>
                <div className="tabular" style={{ fontSize: '1.3rem', fontWeight: 800 }}>{formatarMoeda(f.total)}</div>
                <small>{f.itens} lançamento(s)</small>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Lançamentos recentes do mês</div>
          </div>
          <Link to="/lancamentos" className="btn btn-outline btn-sm">Ver todos</Link>
        </div>
        {!lancamentos.carregando && lancamentos.dados?.dados.length === 0 && (
          <Vazio>Nenhum lançamento neste mês. Registre sua primeira movimentação.</Vazio>
        )}
        {lancamentos.dados?.dados.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.dados.dados.map((item) => (
                  <tr key={item.id}>
                    <td className="tabular">{formatarData(item.data)}</td>
                    <td>
                      <strong>{item.descricao}</strong>
                      {item.total_parcelas > 1 && (
                        <span className="selo-parcela">{item.parcela_atual}/{item.total_parcelas}</span>
                      )}
                    </td>
                    <td>
                      {item.tipo === 'entrada' ? (
                        <span className="badge badge-entrada">Entrada</span>
                      ) : (
                        <span className="badge badge-saida">Saída</span>
                      )}
                    </td>
                    <td className="tabular"><strong>{formatarMoeda(item.valor)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
