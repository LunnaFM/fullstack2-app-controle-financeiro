import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Plus } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { formatarData, formatarMoeda, formatarReferencia } from '../services/formatacao';
import { Carregando, ErroCarregamento, Vazio } from '../components/Estados';

// RF9: fatura aberta e as próximas, calculadas no servidor (GET /api/relatorios/faturas)
export default function Faturas() {
  const { dados, carregando, erro, recarregar } = useApi('/relatorios/faturas?meses=3');
  const [cartaoId, setCartaoId] = useState('');
  const [referencia, setReferencia] = useState('');

  const cartoes = dados?.cartoes || [];
  const cartao = cartoes.find((c) => String(c.id) === cartaoId) || cartoes[0];
  const fatura = cartao?.faturas.find((f) => f.referencia === referencia) || cartao?.faturas[0];
  const usoPercentual = cartao && cartao.limite > 0
    ? Math.min(100, (cartao.limiteUtilizado / cartao.limite) * 100)
    : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="page-eyebrow">CARTÕES</span>
          <h1>Cartões e faturas</h1>
          <p>Fatura aberta e previsão das próximas, com as parcelas futuras das compras parceladas.</p>
        </div>
        <Link to="/fontes-destinos" className="btn btn-primary">
          <Plus size={16} /> Cadastrar cartão
        </Link>
      </div>

      {carregando && <Carregando texto="Calculando faturas..." />}
      {erro && <ErroCarregamento mensagem={erro} onTentarNovamente={recarregar} />}

      {!carregando && !erro && cartoes.length === 0 && (
        <div className="card empty-card">
          <CreditCard size={28} />
          <h2>Nenhum cartão cadastrado</h2>
          <p>Cadastre um cartão com fechamento, vencimento e limite para acompanhar as faturas.</p>
        </div>
      )}

      {!carregando && !erro && cartao && (
        <>
          <div className="card invoice-filter">
            <div className="form-group">
              <label htmlFor="cartao-fatura">Cartão</label>
              <select
                id="cartao-fatura"
                value={String(cartao.id)}
                onChange={(e) => {
                  setCartaoId(e.target.value);
                  setReferencia('');
                }}
              >
                {cartoes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="invoice-card-details">
              <div><span>Fechamento</span><strong>Dia {cartao.diaFechamento}</strong></div>
              <div><span>Vencimento</span><strong>Dia {cartao.diaVencimento}</strong></div>
              <div><span>Limite</span><strong>{formatarMoeda(cartao.limite)}</strong></div>
              <div><span>Limite utilizado</span><strong style={{ color: '#B91C1C' }}>{formatarMoeda(cartao.limiteUtilizado)}</strong></div>
              <div><span>Limite disponível</span><strong style={{ color: '#146C43' }}>{formatarMoeda(cartao.limiteDisponivel)}</strong></div>
            </div>
            <div className="progress-track" title={`${usoPercentual.toFixed(0)}% do limite comprometido`}>
              <div className="progress-fill" style={{ width: `${usoPercentual}%` }} />
            </div>
            <small className="section-description">
              O limite é comprometido por todas as parcelas que ainda não venceram.
            </small>
          </div>

          <div className="invoice-month-grid">
            {cartao.faturas.map((f) => (
              <button
                type="button"
                key={f.referencia}
                className={`invoice-month-button ${fatura?.referencia === f.referencia ? 'active' : ''}`}
                aria-pressed={fatura?.referencia === f.referencia}
                onClick={() => setReferencia(f.referencia)}
              >
                <span>{f.situacao === 'aberta' ? 'Fatura aberta' : 'Próxima'}</span>
                <strong className="tabular">{formatarMoeda(f.total)}</strong>
                <span>{formatarReferencia(f.referencia)}</span>
                <small>
                  Fecha {formatarData(f.fechamento)} · vence {formatarData(f.vencimento)}
                </small>
              </button>
            ))}
          </div>

          {fatura && (
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Fatura de {formatarReferencia(fatura.referencia)}</div>
                  <p className="section-description">
                    Fechamento em {formatarData(fatura.fechamento)} · vencimento em {formatarData(fatura.vencimento)}
                  </p>
                </div>
                <strong className="invoice-detail-total tabular">{formatarMoeda(fatura.total)}</strong>
              </div>

              {fatura.lancamentos.length === 0 ? (
                <Vazio>Nenhum lançamento previsto para esta fatura.</Vazio>
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
                      {fatura.lancamentos.map((l) => (
                        <tr key={l.id}>
                          <td className="tabular">{formatarData(l.data)}</td>
                          <td><strong>{l.descricao}</strong></td>
                          <td>{l.categoria}</td>
                          <td>{l.parcela === '1/1' ? 'Única' : l.parcela}</td>
                          <td className="tabular"><strong>{formatarMoeda(l.valor)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
