const path = require('path');
const multer = require('multer');

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'));

/* El archivo se recibe en memoria: no toca el disco hasta que pasa la validación */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 }
});

/* Tipo real según los primeros bytes; devuelve la extensión o null */
function detectExt(buf){
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return '.jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return '.png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return '.webp';
  return null;
}

module.exports = { upload, detectExt, UPLOADS_DIR, MAX_BYTES };
