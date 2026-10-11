require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const pool = require('./db');
const { UPLOADS_DIR } = require('./middleware/upload');

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const SESSION_HOURS = 8;

if (!process.env.SESSION_SECRET){
  console.error('Falta SESSION_SECRET en el archivo .env');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
/* En Hostinger la app queda detrás de un proxy: hace falta para la cookie segura y el límite por IP */
if (PROD) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      /* reproductor de highlights */
      frameSrc: ['https://www.youtube.com', 'https://player.vimeo.com'],
      mediaSrc: ["'self'", 'https:'],
      upgradeInsecureRequests: PROD ? [] : null
    }
  }
}));

app.use(express.json({ limit: '20kb' }));

app.use(session({
  name: 'koalas.sid',
  secret: process.env.SESSION_SECRET,
  store: new MySQLStore({ expiration: SESSION_HOURS * 60 * 60 * 1000 }, pool),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
    maxAge: SESSION_HOURS * 60 * 60 * 1000
  }
}));

app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api', require('./routes/auth'));
app.use('/api/imagenes', require('./routes/imagenes'));
app.use('/api/info', require('./routes/info'));
app.use('/api', (req, res) => res.status(404).json({ error: 'No encontrado.' }));

app.use('/uploads', express.static(UPLOADS_DIR, { index: false, maxAge: '30d', immutable: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError){
    const error = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 5 MB.' : 'No se pudo recibir la imagen.';
    return res.status(400).json({ error });
  }
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large'){
    return res.status(400).json({ error: 'Solicitud no válida.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error del servidor. Intenta de nuevo.' });
});

app.listen(PORT, () => console.log('Koalas listo en http://localhost:' + PORT));
