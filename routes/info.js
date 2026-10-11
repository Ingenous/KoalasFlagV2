const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();
const TEXTO = ['rival', 'date', 'venue', 'category'];
const NUMERO = ['played', 'wins', 'tds', 'players'];

router.get('/', async (req, res) => {
  const [rows] = await pool.execute('SELECT clave, valor FROM info_sitio');
  const info = {};
  rows.forEach(r => { info[r.clave] = r.valor; });
  res.json(info);
});

router.put('/', requireAuth, async (req, res) => {
  const body = req.body || {};
  const info = {};
  for (const k of TEXTO){
    info[k] = (typeof body[k] === 'string' ? body[k].trim() : '').slice(0, 40);
  }
  for (const k of NUMERO){
    const v = body[k] == null ? '' : String(body[k]).trim();
    if (v && !/^\d{1,4}$/.test(v)){
      return res.status(400).json({ error: 'Las estadísticas deben ser números de 0 a 9999.' });
    }
    info[k] = v;
  }
  for (const k of Object.keys(info)){
    await pool.execute(
      'INSERT INTO info_sitio (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [k, info[k]]
    );
  }
  res.json(info);
});

module.exports = router;
