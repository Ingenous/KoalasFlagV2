const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const router = express.Router();

/* 10 intentos fallidos por IP cada 15 minutos */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.' }
});

/* Se compara contra este hash cuando el usuario no existe, para que la respuesta tarde lo mismo */
const DUMMY_HASH = bcrypt.hashSync('sin-usuario', 12);

router.post('/login', loginLimiter, async (req, res) => {
  const body = req.body || {};
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!usuario || !password || usuario.length > 50 || password.length > 200){
    return res.status(400).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  const [rows] = await pool.execute('SELECT id, usuario, password_hash FROM usuarios WHERE usuario = ? LIMIT 1', [usuario]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok){
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'No se pudo iniciar sesión.' });
    req.session.userId = user.id;
    req.session.usuario = user.usuario;
    res.json({ logged: true, usuario: user.usuario });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('koalas.sid');
    res.json({ logged: false });
  });
});

router.get('/session', (req, res) => {
  const logged = !!(req.session && req.session.userId);
  res.json(logged ? { logged, usuario: req.session.usuario } : { logged });
});

module.exports = router;
