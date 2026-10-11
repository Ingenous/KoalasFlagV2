const express = require('express');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { upload, detectExt, UPLOADS_DIR } = require('../middleware/upload');

const router = express.Router();
const SECCIONES = ['gallery', 'highlight', 'player'];

const text = (v, max) => (typeof v === 'string' ? v.trim() : '').slice(0, max);

router.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT id, seccion, titulo, posicion, numero, link, archivo FROM imagenes ORDER BY id'
  );
  res.json(rows);
});

router.post('/', requireAuth, upload.single('imagen'), async (req, res) => {
  const body = req.body || {};
  const seccion = body.seccion;
  if (!SECCIONES.includes(seccion)){
    return res.status(400).json({ error: 'Sección no válida.' });
  }
  if (!req.file){
    return res.status(400).json({ error: 'Falta la imagen.' });
  }
  const ext = detectExt(req.file.buffer);
  if (!ext){
    return res.status(400).json({ error: 'Solo se aceptan imágenes JPG, PNG o WebP.' });
  }

  const titulo = text(body.titulo, 80);
  const posicion = seccion === 'player' ? text(body.posicion, 30) : '';
  const numero = seccion === 'player' ? text(body.numero, 3) : '';
  const link = seccion === 'highlight' ? text(body.link, 500) : '';
  if (link && !/^https?:\/\//i.test(link)){
    return res.status(400).json({ error: 'El link del video debe empezar con http:// o https://' });
  }

  const archivo = crypto.randomBytes(16).toString('hex') + ext;
  const destino = path.join(UPLOADS_DIR, archivo);
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(destino, req.file.buffer, { flag: 'wx' });

  try {
    const [result] = await pool.execute(
      'INSERT INTO imagenes (seccion, titulo, posicion, numero, link, archivo) VALUES (?, ?, ?, ?, ?, ?)',
      [seccion, titulo, posicion, numero, link, archivo]
    );
    res.status(201).json({ id: result.insertId, seccion, titulo, posicion, numero, link, archivo });
  } catch (err){
    await fs.unlink(destino).catch(() => {});
    throw err;
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0){
    return res.status(400).json({ error: 'Id no válido.' });
  }
  const [rows] = await pool.execute('SELECT archivo FROM imagenes WHERE id = ?', [id]);
  if (!rows.length){
    return res.status(404).json({ error: 'La imagen ya no existe.' });
  }
  await pool.execute('DELETE FROM imagenes WHERE id = ?', [id]);
  await fs.unlink(path.join(UPLOADS_DIR, path.basename(rows[0].archivo))).catch(err => {
    if (err.code !== 'ENOENT') console.error('No se pudo borrar el archivo:', err.message);
  });
  res.json({ ok: true });
});

module.exports = router;
