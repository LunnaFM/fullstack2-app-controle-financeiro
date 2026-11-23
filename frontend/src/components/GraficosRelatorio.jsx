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
import { formatarMoeda } from '../services/formatacao';

const CORES = ['#146C43', '#0E3528', '#1E6091', '#D97706', '#9F1239', '#0D9488', '#C2410C', '#4D7C0F'];
const compacto = (valor) =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
const estiloTooltip = { border: '1px solid var(--border-subtle)', borderRadius: '2px' };

// Gráfico de rosca das saídas por categoria (RF7)
export function GraficoCategorias({ categorias }) {
  const dados = categorias.filter((c) => c.total > 0);
  return (
    <div className="report-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={dados} dataKey="total" nameKey="nome" innerRadius={55} outerRadius={88} paddingAngle={3}>
            {dados.map((item, i) => (
              <Cell key={item.id} fill={CORES[i % CORES.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(valor) => formatarMoeda(valor)} contentStyle={estiloTooltip} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Barras de entradas x saídas por fonte/destino (RF8)
export function GraficoFontesDestinos({ fontesDestinos }) {
  const dados = fontesDestinos.filter((f) => f.entradas > 0 || f.saidas > 0);
  return (
    <div className="report-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 12, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={compacto} />
          <Tooltip formatter={(valor, nome) => [formatarMoeda(valor), nome]} contentStyle={estiloTooltip} />
          <Legend />
          <Bar dataKey="entradas" name="Entradas" fill="#146C43" radius={[3, 3, 0, 0]} />
          <Bar dataKey="saidas" name="Saídas" fill="#B91C1C" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function GraficosRelatorio({ tipo, ...props }) {
  return tipo === 'categorias' ? <GraficoCategorias {...props} /> : <GraficoFontesDestinos {...props} />;
}
