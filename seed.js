/* Crea (o actualiza) el usuario administrador con la contraseña hasheada.
   Lee ADMIN_USER y ADMIN_PASSWORD de .env.

     npm run seed            -> lo guarda en la base de datos
     npm run seed -- --sql   -> solo imprime el INSERT, para pegarlo en phpMyAdmin */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function main(){
  const usuario = (process.env.ADMIN_USER || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!usuario || !password){
    throw new Error('Faltan ADMIN_USER y ADMIN_PASSWORD en el archivo .env');
  }
  const hash = await bcrypt.hash(password, 12);

  if (process.argv.includes('--sql')){
    console.log('INSERT INTO usuarios (usuario, password_hash) VALUES (' + mysql.escape(usuario) + ', ' + mysql.escape(hash) + ')');
    console.log('  ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);');
    return;
  }

  const pool = require('./db');
  try {
    await pool.execute(
      'INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
      [usuario, hash]
    );
    console.log('Usuario "' + usuario + '" listo.');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('No se pudo crear el usuario:', err.message);
  process.exit(1);
});
