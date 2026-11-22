import {
  ArrowLeftRight,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CORES_GRAFICO = [
  '#146C43', // Verde Esmeralda (principal)
  '#0E3528', // Verde Floresta
  '#1E6091', // Azul Petróleo
  '#D97706', // Âmbar / Mostarda
  '#9F1239', // Vinho / Bordô
  '#0D9488', // Verde-Água Profundo
  '#C2410C', // Terracota
  '#4D7C0F', // Verde Oliva Escuro
];

export default function RelatorioGraficos({
  categorias,
  fontes,
  entradas,
  saidas,
  formatarMoeda,
}) {
  const comparacaoEntradasSaidas = [
    { nome: 'Período selecionado', entradas, saidas },
  ];
  const percentualSaidas =
    entradas > 0 ? (saidas / entradas) * 100 : null;
  const saldoPeriodo = entradas - saidas;

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <PieChartIcon size={17} /> Gastos por Categoria
          </div>
        </div>
        {categorias.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Nenhum gasto registrado ainda.
          </p>
        ) : (
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorias}
                  dataKey="total"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={88}
                  paddingAngle={3}
                >
                  {categorias.map((item, index) => (
                    <Cell
                      key={item.nome}
                      fill={CORES_GRAFICO[index % CORES_GRAFICO.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(valor) => formatarMoeda(valor)}
                  contentStyle={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <BarChart3 size={17} /> Movimentação por Fonte / Destino
          </div>
        </div>
        {fontes.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Nenhuma movimentação encontrada.
          </p>
        ) : (
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={fontes}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(valor) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(valor)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="nome"
                  width={105}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(valor) => formatarMoeda(valor)}
                  contentStyle={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                  }}
                />
                <Bar
                  dataKey="total"
                  name="Movimentação"
                  fill="#146C43"
                  radius={[0, 3, 3, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ArrowLeftRight size={17} /> Entradas x Saídas
          </div>
        </div>
        <p className="section-description">
          {percentualSaidas === null
            ? 'Registre entradas para comparar a proporção de gastos.'
            : `As saídas representam ${percentualSaidas.toLocaleString('pt-BR', {
                maximumFractionDigits: 1,
              })}% das entradas. Resultado do período: ${formatarMoeda(saldoPeriodo)}.`}
        </p>
        {entradas === 0 && saidas === 0 ? (
          <p className="empty-state">Nenhuma entrada ou saída no período selecionado.</p>
        ) : (
          <div className="report-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={comparacaoEntradasSaidas}
                margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(valor) =>
                    new Intl.NumberFormat('pt-BR', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(valor)
                  }
                />
                <Tooltip
                  formatter={(valor, nome) => [formatarMoeda(valor), nome]}
                  contentStyle={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '2px',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="entradas"
                  name="Entradas"
                  fill="#146C43"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="saidas"
                  name="Saídas"
                  fill="#B91C1C"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
