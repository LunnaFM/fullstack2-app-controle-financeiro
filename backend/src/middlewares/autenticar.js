// Middleware de autenticação JWT: protege as rotas que exigem login.
// Espera o cabeçalho  Authorization: Bearer <token>
// Se o token for válido, coloca o id do usuário em req.usuarioId e segue para a rota.
// Token ausente, inválido ou expirado → 401.
//
// Uso nas rotas protegidas (Parte 2):
//   app.use('/api/categorias', autenticar, categoriasRoutes);
//   ...e nas consultas: WHERE usuario_id = req.usuarioId (nunca do body ou da URL).
const jwt = require('jsonwebtoken');
const { jwt: configJwt } = require('../config/ambiente');

function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');

  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Token não informado.' });
  }

  try {
    const payload = jwt.verify(token, configJwt.segredo, { algorithms: ['HS256'] });
    req.usuarioId = Number(payload.sub); // id do usuário dono do token
    return next();
  } catch (erro) {
    const mensagem = erro.name === 'TokenExpiredError' ? 'Token expirado.' : 'Token inválido.';
    return res.status(401).json({ erro: mensagem });
  }
}

module.exports = autenticar;
