// Funções puras de validação e normalização (sem acesso ao banco).
// Ficam em models/ por serem regras de negócio; podem ser reaproveitadas no front-end.

// Valida os dois dígitos verificadores do CPF
function cpfValido(cpf) {
  const d = String(cpf ?? '').replace(/\D/g, ''); // mantém só os dígitos
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) { // rejeita 111.111.111-11 etc.
    return false;
  }
  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(d[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10]);
}

// Formato simples: algo@algo.algo, sem espaços
function emailValido(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Mínimo de 8 caracteres, com pelo menos uma letra e um número.
// Máximo de 72 caracteres: o bcrypt ignora o que passa disso.
function senhaValida(senha) {
  return (
    typeof senha === 'string' &&
    senha.length >= 8 &&
    senha.length <= 72 &&
    /[A-Za-z]/.test(senha) &&
    /\d/.test(senha)
  );
}

// Normalização antes de gravar/buscar, para que a restrição UNIQUE funcione de verdade:
// "Ana@Email.com " e "ana@email.com" viram o mesmo valor; "529.982.247-25" vira "52998224725".
const normalizarEmail = (email) => String(email).trim().toLowerCase();
const normalizarCpf = (cpf) => String(cpf).replace(/\D/g, '');
const normalizarNome = (nome) => String(nome).trim().replace(/\s+/g, ' ');

module.exports = {
  cpfValido,
  emailValido,
  senhaValida,
  normalizarEmail,
  normalizarCpf,
  normalizarNome,
};
