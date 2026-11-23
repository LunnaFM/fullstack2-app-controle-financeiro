import { lazy, Suspense, useState } from 'react';
import { BarChart3, PieChart, TrendingDown, TrendingUp } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import {
  formatarData,
  formatarMoeda,
  periodoDoMes,
  periodoUltimosMeses,
} from '../services/formatacao';
import { Carregando, ErroCarregamento, Vazio } from '../components/Estados';

// Os gráficos (Recharts) só são baixados quando a tela de relatórios é aberta
const GraficosRelatorio = lazy(() => import('../components/GraficosRelatorio'));

const PERIODOS = {
  'mes-atual': { rotulo: 'Mês atual', calcular: () => periodoDoMes(0) },
  'mes-anterior': { rotulo: 'Mês anterior', calcular: () => periodoDoMes(-1) },
  'ultimos-3': { rotulo: 'Últimos 3 meses', calcular: () => periodoUltimosMeses(3) },
  personalizado: { rotulo: 'Personalizado', calcular: null },
};

const formatarPercentual = (valor) =>
  `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

function Variacao({ valor, inverterCores = false }) {
  if (valor === 0) return <span className="variacao neutra">= sem variação</span>;
  const subiu = valor > 0;
  // Para saídas, aumentar é ruim (vermelho); para entradas, aumentar é bom (verde)
  const ruim = inverterCores ? !subiu : subiu;
  return (
    <span className={`variacao ${ruim ? 'ruim' : 'boa'}`}>
      {subiu ? '▲ aumento de ' : '▼ redução de '}
      {formatarMoeda(Math.abs(valor))}
    </span>
  );
}

function TabelaCategorias({ itens, ehEntrada }) {
  if (itens.length === 0) return <Vazio>Nenhum lançamento no período.</Vazio>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Total</th>
            <th>% do total</th>
            <th>Período anterior</th>
            <th>Comparação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((c) => (
            <tr key={c.id}>
              <td><strong>{c.nome}</strong></td>
              <td className="tabular"><strong>{formatarMoeda(c.total)}</strong></td>
              <td className="tabular">{formatarPercentual(c.percentual)}</td>
              <td className="tabular">{formatarMoeda(c.periodoAnterior)}</td>
              <td><Variacao valor={c.variacao} inverterCores={ehEntrada} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Relatorios() {
  const [opcao, setOpcao] = useState('mes-atual');
  const [personalizado, setPersonalizado] = useState(periodoDoMes(0));

  const periodo = opcao === 'personalizado' ? personalizado : PERIODOS[opcao].calcular();
  const periodoValido = periodo.inicio && periodo.fim && periodo.inicio <= periodo.fim;
  const consulta = `inicio=${periodo.inicio}&fim=${periodo.fim}`;

  const categorias = useApi(periodoValido ? `/relatorios/categorias?${consulta}` : null);
  const fontes = useApi(periodoValido ? `/relatorios/fontes-destinos?${consulta}` : null);
  const rc = categorias.dados;
  const rf = fontes.dados;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">ANÁLISE</span>
          <h1>Relatórios</h1>
          <p>Totais calculados no servidor para o período escolhido.</p>
        </div>
      </div>

      <div className="filters-bar report-period-filter">
        <div>
          <label htmlFor="relatorio-periodo">PERÍODO</label>
          <select id="relatorio-periodo" value={opcao} onChange={(e) => setOpcao(e.target.value)}>
            {Object.entries(PERIODOS).map(([chave, p]) => (
              <option key={chave} value={chave}>{p.rotulo}</option>
            ))}
          </select>
        </div>
        {opcao === 'personalizado' ? (
          <>
            <div>
              <label htmlFor="relatorio-inicio">DE</label>
              <input
                id="relatorio-inicio"
                type="date"
                value={personalizado.inicio}
                onChange={(e) => setPersonalizado({ ...personalizado, inicio: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="relatorio-fim">ATÉ</label>
              <input
                id="relatorio-fim"
                type="date"
                value={personalizado.fim}
                onChange={(e) => setPersonalizado({ ...personalizado, fim: e.target.value })}
              />
            </div>
          </>
        ) : (
          <p>
            {formatarData(periodo.inicio)} a {formatarData(periodo.fim)}
            {rc && <> · comparado com {formatarData(rc.periodoAnterior.inicio)} a {formatarData(rc.periodoAnterior.fim)}</>}
          </p>
        )}
      </div>

      {!periodoValido && <ErroCarregamento mensagem="A data final deve ser igual ou posterior à inicial." />}

      {/* RF7 — por categoria */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><PieChart size={17} /> Por categoria</div>
        </div>

        {categorias.carregando && <Carregando />}
        {categorias.erro && <ErroCarregamento mensagem={categorias.erro} onTentarNovamente={categorias.recarregar} />}

        {rc && !categorias.carregando && !categorias.erro && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-top"><span>Total de saídas</span><TrendingDown size={17} color="#B91C1C" /></div>
                <div className="kpi-value tabular" style={{ color: '#B91C1C' }}>{formatarMoeda(rc.totalSaidas)}</div>
                <small>Período anterior: {formatarMoeda(rc.totalSaidasAnterior)}</small>
              </div>
              <div className="kpi-card">
                <div className="kpi-top"><span>Total de entradas</span><TrendingUp size={17} color="#146C43" /></div>
                <div className="kpi-value tabular" style={{ color: '#146C43' }}>{formatarMoeda(rc.totalEntradas)}</div>
                <small>Período anterior: {formatarMoeda(rc.totalEntradasAnterior)}</small>
              </div>
            </div>

            <h3 className="subtitulo">Saídas por categoria</h3>
            {rc.totalSaidas > 0 && (
              <Suspense fallback={<Carregando texto="Carregando gráfico..." />}>
                <GraficosRelatorio tipo="categorias" categorias={rc.categorias} />
              </Suspense>
            )}
            <TabelaCategorias itens={rc.categorias} ehEntrada={false} />

            <h3 className="subtitulo">Entradas por categoria</h3>
            <TabelaCategorias itens={rc.entradas} ehEntrada />
          </>
        )}
      </div>

      {/* RF8 — por fonte/destino */}
      <div className="card">
        <div className="card-header">
          <div className="card-title"><BarChart3 size={17} /> Por fonte / destino</div>
        </div>

        {fontes.carregando && <Carregando />}
        {fontes.erro && <ErroCarregamento mensagem={fontes.erro} onTentarNovamente={fontes.recarregar} />}

        {rf && !fontes.carregando && !fontes.erro && (
          rf.fontesDestinos.length === 0 ? (
            <Vazio>Nenhuma fonte/destino cadastrada.</Vazio>
          ) : (
            <>
              {(rf.totalEntradas > 0 || rf.totalSaidas > 0) && (
                <Suspense fallback={<Carregando texto="Carregando gráfico..." />}>
                  <GraficosRelatorio tipo="fontes" fontesDestinos={rf.fontesDestinos} />
                </Suspense>
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fonte / destino</th>
                      <th>Tipo</th>
                      <th>Entradas</th>
                      <th>Saídas</th>
                      <th>Saldo (contas)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rf.fontesDestinos.map((f) => (
                      <tr key={f.id}>
                        <td><strong>{f.nome}</strong></td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {{ conta: 'Conta', cartao_credito: 'Cartão de crédito', renda: 'Renda' }[f.tipo]}
                        </td>
                        <td className="tabular" style={{ color: '#146C43' }}>{formatarMoeda(f.entradas)}</td>
                        <td className="tabular" style={{ color: '#B91C1C' }}>{formatarMoeda(f.saidas)}</td>
                        <td className="tabular">
                          <strong>{f.saldo === null ? '—' : formatarMoeda(f.saldo)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>Total</strong></td>
                      <td className="tabular"><strong>{formatarMoeda(rf.totalEntradas)}</strong></td>
                      <td className="tabular"><strong>{formatarMoeda(rf.totalSaidas)}</strong></td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        )}
      </div>
    </>
  );
}
