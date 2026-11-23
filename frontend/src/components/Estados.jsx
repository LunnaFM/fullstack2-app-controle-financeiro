import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';

// Componentes de estado usados em todas as telas que consomem a API.

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="estado-carregando" role="status">
      <Loader2 size={18} className="girando" /> {texto}
    </div>
  );
}

export function ErroCarregamento({ mensagem, onTentarNovamente }) {
  return (
    <div className="alerta-erro" role="alert">
      <AlertCircle size={18} />
      <span>{mensagem}</span>
      {onTentarNovamente && (
        <button type="button" className="btn btn-outline btn-sm" onClick={onTentarNovamente}>
          <RotateCcw size={13} /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function Vazio({ children }) {
  return <p className="empty-state">{children}</p>;
}

export function Aviso({ tipo = 'sucesso', children }) {
  if (!children) return null;
  return tipo === 'erro' ? (
    <div className="alerta-erro" role="alert">
      <AlertCircle size={18} />
      <span>{children}</span>
    </div>
  ) : (
    <div className="alerta-sucesso" role="status">
      <CheckCircle2 size={18} />
      <span>{children}</span>
    </div>
  );
}

export function ErroCampo({ mensagem }) {
  if (!mensagem) return null;
  return (
    <span className="erro-campo">
      <AlertCircle size={13} /> {mensagem}
    </span>
  );
}
