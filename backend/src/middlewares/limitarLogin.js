// Rate limiting na rota de login: dificulta ataques de força bruta (tentar muitas senhas).
// Conta apenas as tentativas que falharam; um login bem-sucedido não consome o limite.
const { rateLimit } = require('express-rate-limit');

const JANELA_MINUTOS = 15;
const MAXIMO_TENTATIVAS = 10;

const limitarLogin = rateLimit({
  windowMs: JANELA_MINUTOS * 60 * 1000,
  limit: MAXIMO_TENTATIVAS, // por IP, dentro da janela
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8', // informa o limite nos cabeçalhos RateLimit
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      erro: `Muitas tentativas de login. Tente novamente em ${JANELA_MINUTOS} minutos.`,
    });
  },
});

module.exports = limitarLogin;
