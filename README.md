# Koalas Flag Football

Sitio del equipo con panel de administración. Backend en Node.js + Express y base de datos MySQL: las imágenes y la información que se suben desde el panel las ve todo el mundo.

## Estructura

```
server.js            Servidor Express (seguridad, sesiones, rutas)
db.js                Conexión a MySQL
routes/              auth.js, imagenes.js, info.js
middleware/          requireAuth.js, upload.js
public/              index.html, css/styles.css, js/app.js
uploads/             Imágenes subidas (no se suben a git)
schema.sql           Tablas de la base de datos
seed.js              Crea el usuario administrador
.env.example         Plantilla de configuración
```

## API

| Método | Ruta | Sesión | Qué hace |
|---|---|---|---|
| POST | `/api/login` | no | Inicia sesión. Máximo 10 intentos fallidos cada 15 minutos por IP |
| POST | `/api/logout` | no | Cierra la sesión |
| GET | `/api/session` | no | Indica si hay sesión activa |
| GET | `/api/imagenes` | no | Lista de imágenes |
| POST | `/api/imagenes` | sí | Sube una imagen (`multipart/form-data`, campo `imagen`) |
| DELETE | `/api/imagenes/:id` | sí | Borra el registro y el archivo |
| GET | `/api/info` | no | Próximo partido y estadísticas |
| PUT | `/api/info` | sí | Actualiza próximo partido y estadísticas |

Imágenes: solo JPG, PNG o WebP, máximo 5 MB. El servidor revisa el contenido real del archivo, no la extensión. El panel reduce la foto antes de subirla a la medida recomendada:

| Sección | Medida recomendada |
|---|---|
| Highlights | 1280 × 800 (16:10) |
| Conoce al equipo | 800 × 1000 (4:5) |
| Fotos | 1200 × 800 |

## Correrlo en local

Necesitas Node.js 18 o superior y MySQL Server 8.

1. Instala las dependencias:
   ```
   npm install
   ```
2. Crea la base de datos (ver la sección de MySQL Workbench).
3. Copia `.env.example` como `.env` y llena:
   - `DB_PASSWORD`: la contraseña de tu MySQL.
   - `SESSION_SECRET`: un texto largo y aleatorio. Genera uno con
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `ADMIN_USER` y `ADMIN_PASSWORD`: el usuario y la contraseña del panel.
4. Crea el usuario administrador:
   ```
   npm run seed
   ```
   Puedes volver a correrlo cuando quieras cambiar la contraseña.
5. Arranca el servidor:
   ```
   npm start
   ```
   Abre http://localhost:3000. Con `npm run dev` el servidor se reinicia solo al guardar cambios.

## Crear la base en MySQL Workbench

1. Abre MySQL Workbench y entra a tu conexión local (**Local instance MySQL80**).
2. Menú **File > Open SQL Script…** y elige `schema.sql`.
3. Presiona el rayo (**Execute**, o `Ctrl+Shift+Enter`) para ejecutar todo el archivo.
4. En el panel **Schemas** da clic en el botón de actualizar. Debe aparecer `koalas_flag` con las tablas `usuarios`, `imagenes` e `info_sitio`.

La tabla `sessions` no está en el script: la crea el servidor la primera vez que arranca.

## Desplegar en Hostinger

Necesitas un plan que incluya aplicaciones Node.js (Business o Cloud). Los nombres de los menús de hPanel pueden variar un poco.

### 1. Base de datos

1. En hPanel entra a **Bases de datos > Gestión** y crea una base MySQL. Anota el nombre de la base, el usuario (ambos empiezan con algo como `u123456789_`) y la contraseña.
2. Abre **phpMyAdmin** para esa base y ve a la pestaña **Importar**.
3. Antes de importar `schema.sql`, borra de una copia del archivo las líneas `CREATE DATABASE…` y `USE koalas_flag;`. En Hostinger la base ya existe con otro nombre.
4. Importa el archivo.

### 2. Aplicación Node.js

1. Sube el proyecto a un repositorio de GitHub. El `.gitignore` ya excluye `.env`, `node_modules` y las imágenes.
2. En hPanel entra a **Sitios web > Agregar sitio web > Aplicación web Node.js** y conecta el repositorio (o sube un `.zip` sin `node_modules`).
3. Configura:
   - Comando de instalación: `npm install`
   - Comando de inicio: `npm start` (archivo de entrada `server.js`)
   - Versión de Node: 20 o superior
4. En **Variables de entorno** agrega:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DB_HOST` | `localhost` (o el host que indique hPanel) |
   | `DB_PORT` | `3306` |
   | `DB_USER` | el usuario de la base |
   | `DB_PASSWORD` | la contraseña de la base |
   | `DB_NAME` | el nombre de la base |
   | `SESSION_SECRET` | un texto largo y aleatorio, distinto al de tu computadora |

   No definas `PORT`: Hostinger lo asigna. `ADMIN_USER` y `ADMIN_PASSWORD` no hacen falta en el servidor si creas el usuario como en el paso 3.
5. Despliega y activa el SSL del dominio. Con `NODE_ENV=production` la cookie de sesión solo viaja por HTTPS, así que sin SSL el login no funciona.

### 3. Usuario administrador

Lo más simple es generar el `INSERT` en tu computadora y pegarlo en phpMyAdmin:

```
npm run seed -- --sql
```

Copia las dos líneas que imprime, pégalas en la pestaña **SQL** de phpMyAdmin y ejecuta. La contraseña viaja ya hasheada. Si tu plan tiene acceso SSH, también puedes correr `npm run seed` en el servidor con `ADMIN_USER` y `ADMIN_PASSWORD` definidas.

### 4. Imágenes subidas

Las imágenes viven en la carpeta `uploads/` del servidor, no en git. Revisa que sigan ahí después de volver a desplegar. Si un despliegue las borra, crea una carpeta fuera de la aplicación y pon su ruta completa en la variable `UPLOADS_DIR`. Conviene descargar un respaldo de esa carpeta y de la base de vez en cuando.

## Seguridad

- La contraseña se guarda como hash de bcrypt; no aparece en el código.
- Todas las consultas a MySQL son preparadas.
- Cookie de sesión `httpOnly`, `sameSite=lax` y `secure` en producción. Las sesiones se guardan en MySQL y duran 8 horas.
- `helmet` aplica una política que solo permite scripts propios y videos incrustados de YouTube y Vimeo.
- Todo texto que viene de la base se escapa antes de pintarlo.
