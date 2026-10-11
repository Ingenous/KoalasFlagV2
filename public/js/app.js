/* ---------- Menú móvil ---------- */
const toggle = document.getElementById('navToggle');
const navList = document.getElementById('navList');
toggle.addEventListener('click', () => navList.classList.toggle('open'));
navList.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navList.classList.remove('open')));

const $ = id => document.getElementById(id);
const loginModal = $('loginModal'), admin = $('admin');

/* ---------- Llamadas a la API ---------- */
let logged = false;

async function api(url, opts){
  let res;
  try {
    res = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts));
  } catch(e){
    throw new Error('No se pudo conectar con el servidor.');
  }
  let data = null;
  try { data = await res.json(); } catch(e){}
  if (!res.ok){
    if (res.status === 401) logged = false;
    throw new Error((data && data.error) || 'Error del servidor. Intenta de nuevo.');
  }
  return data;
}
const sendJson = (url, method, body) => api(url, {
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});

/* ---------- Catálogo: se carga de la base de datos ---------- */
let items = [];
const toItem = r => ({
  id: r.id, section: r.seccion, img: '/uploads/' + encodeURIComponent(r.archivo),
  title: r.titulo, pos: r.posicion, num: r.numero, link: r.link
});
async function loadItems(){
  try { items = (await api('/api/imagenes')).map(toItem); } catch(e){ items = []; }
}

/* ---------- Información del sitio: próximo partido y estadísticas ---------- */
/* campo guardado -> [input del panel, elemento del sitio] */
const INFO_FIELDS = {
  rival:['inRival','nextRival'], date:['inDate','nextDate'], venue:['inVenue','nextVenue'], category:['inCategory','nextCategory'],
  played:['inPlayed','statPlayed'], wins:['inWins','statWins'], tds:['inTds','statTds'], players:['inPlayers','statPlayers']
};
const infoBase = {};
Object.keys(INFO_FIELDS).forEach(k => infoBase[k] = $(INFO_FIELDS[k][1]).textContent);

let info = {};
async function loadInfo(){
  try { info = (await api('/api/info')) || {}; } catch(e){ info = {}; }
}
function renderInfo(){
  Object.keys(INFO_FIELDS).forEach(k => $(INFO_FIELDS[k][1]).textContent = info[k] || infoBase[k]);
}
function fillInfoForm(){
  Object.keys(INFO_FIELDS).forEach(k => $(INFO_FIELDS[k][0]).value = info[k] || '');
  $('infoMsg').textContent = '';
}

/* ---------- Sitio público: pintar imágenes del catálogo ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
const PLAY_SVG = '<div class="play"><div class="play-btn"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>';

const base = {};
['highlightGrid','galleryGrid','rosterGrid'].forEach(id => base[id] = $(id).innerHTML);

function renderSite(){
  const by = k => items.filter(i => i.section === k);

  const h = by('highlight');
  $('highlightGrid').innerHTML = h.length ? h.map((i, n) => {
    const inner = '<img src="' + esc(i.img) + '" alt="' + esc(i.title) + '">' + PLAY_SVG +
      '<div class="highlight-meta"><div class="wk">Highlight ' + (n+1) + '</div><h4>' + esc(i.title || 'Jugada destacada') + '</h4></div>';
    const link = safeUrl(i.link);
    return link
      ? '<div class="highlight-card" role="button" tabindex="0" data-video="' + esc(link) + '" data-title="' + esc(i.title || 'Jugada destacada') + '">' + inner + '</div>'
      : '<div class="highlight-card">' + inner + '</div>';
  }).join('') : base.highlightGrid;

  const g = by('gallery');
  const shapes = ['tall','','wide','','','tall','wide'];
  $('galleryGrid').innerHTML = g.length ? g.map((i, n) =>
    '<figure class="g-item has-img ' + shapes[n % shapes.length] + '"><img src="' + esc(i.img) + '" alt="' + esc(i.title || 'Foto del equipo') + '">' +
    (i.title ? '<figcaption>' + esc(i.title) + '</figcaption>' : '') + '</figure>'
  ).join('') : base.galleryGrid;

  const p = by('player');
  $('rosterGrid').innerHTML = p.length ? p.map(i =>
    '<div class="player-card"><div class="player-photo"><img src="' + esc(i.img) + '" alt="' + esc(i.title) + '"></div>' +
    '<div class="player-info"><div class="pos">' + esc(i.pos || 'Jugador') + '</div><h4>' + esc(i.title || 'Nombre del jugador') + '</h4>' +
    (i.num ? '<div class="num-line">#' + esc(i.num) + '</div>' : '') + '</div></div>'
  ).join('') : base.rosterGrid;
}

/* ---------- Reproductor de highlights ---------- */
const videoModal = $('videoModal');
/* Convierte el link guardado en el HTML del reproductor; '' si no se puede incrustar */
function playerHtml(url){
  const frame = src => '<iframe src="' + esc(src) + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  let m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{11})/i);
  if (m) return frame('https://www.youtube.com/embed/' + m[1] + '?autoplay=1&rel=0');
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (m) return frame('https://player.vimeo.com/video/' + m[1] + '?autoplay=1');
  if (/\.(mp4|webm|ogg|ogv|mov|m4v)(?:[?#]|$)/i.test(url)) return '<video src="' + esc(url) + '" controls autoplay playsinline></video>';
  return '';
}
function openVideo(url, title){
  const html = playerHtml(url);
  if (!html){ window.open(url, '_blank', 'noopener'); return; }
  $('videoFrame').innerHTML = html;
  $('videoTitle').textContent = title || '';
  videoModal.classList.add('open');
  document.body.classList.add('no-scroll');
  $('videoClose').focus();
}
function closeVideo(){
  videoModal.classList.remove('open');
  $('videoFrame').innerHTML = '';
  document.body.classList.remove('no-scroll');
}
function cardVideo(e){
  const card = e.target.closest('.highlight-card[data-video]');
  if (card) openVideo(card.dataset.video, card.dataset.title);
  return !!card;
}
$('highlightGrid').addEventListener('click', cardVideo);
$('highlightGrid').addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && cardVideo(e)) e.preventDefault();
});
$('videoClose').addEventListener('click', closeVideo);
videoModal.addEventListener('click', e => { if (e.target === videoModal) closeVideo(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && videoModal.classList.contains('open')) closeVideo(); });

/* ---------- Popup de login ---------- */
function openLogin(){
  $('loginError').textContent = '';
  $('loginForm').reset();
  loginModal.classList.add('open');
  document.body.classList.add('no-scroll');
  $('loginUser').focus();
}
function closeLogin(){
  loginModal.classList.remove('open');
  if (!admin.classList.contains('open')) document.body.classList.remove('no-scroll');
}
function openAdmin(){
  admin.classList.add('open');
  admin.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  fillInfoForm();
  renderCatalog();
}
function closeAdmin(){
  admin.classList.remove('open');
  admin.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

$('loginBtn').addEventListener('click', e => {
  e.preventDefault();
  navList.classList.remove('open');
  logged ? openAdmin() : openLogin();
});
$('loginClose').addEventListener('click', closeLogin);
loginModal.addEventListener('click', e => { if (e.target === loginModal) closeLogin(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && loginModal.classList.contains('open')) closeLogin(); });

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await sendJson('/api/login', 'POST', { usuario: $('loginUser').value, password: $('loginPass').value });
    logged = true;
    closeLogin();
    openAdmin();
  } catch(err){
    $('loginError').textContent = err.message;
    $('loginPass').value = '';
    $('loginPass').focus();
  }
});

$('adminLogout').addEventListener('click', async () => {
  try { await api('/api/logout', { method: 'POST' }); } catch(e){}
  logged = false;
  closeAdmin();
});
$('adminView').addEventListener('click', () => { renderSite(); closeAdmin(); });

/* ---------- Panel: información del sitio ---------- */
$('infoForm').addEventListener('submit', async e => {
  e.preventDefault();
  const data = {};
  Object.keys(INFO_FIELDS).forEach(k => data[k] = $(INFO_FIELDS[k][0]).value.trim());
  const m = $('infoMsg');
  try {
    info = await sendJson('/api/info', 'PUT', data);
    m.textContent = 'Información actualizada.';
    m.classList.remove('err');
    renderInfo();
  } catch(err){
    m.textContent = err.message;
    m.classList.add('err');
  }
});

/* ---------- Panel: formulario de subida ---------- */
const upSection = $('upSection');
/* medida recomendada por sección: [ancho, alto] */
const SIZES = { highlight:[1280,800], player:[800,1000], gallery:[1200,800] };
function syncForm(){
  const s = upSection.value;
  $('upPosWrap').hidden = $('upNumWrap').hidden = (s !== 'player');
  $('upLinkWrap').hidden = (s !== 'highlight');
  $('upTitleLabel').textContent = s === 'player' ? 'Nombre del jugador' : s === 'highlight' ? 'Título de la jugada' : 'Pie de foto (opcional)';
  $('upFileLabel').textContent = 'Imagen JPG, PNG o WebP (recomendado ' + SIZES[s][0] + '×' + SIZES[s][1] + ')';
}
upSection.addEventListener('change', syncForm);
syncForm();

function msg(text, isErr){
  const m = $('upMsg');
  m.textContent = text;
  m.classList.toggle('err', !!isErr);
}

/* Reduce la imagen a la medida recomendada antes de subirla, para no pasar de 5 MB */
function shrink(file, maxSide, quality){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo procesar la imagen.')), 'image/jpeg', quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('uploadForm').addEventListener('submit', async e => {
  e.preventDefault();
  const file = $('upFile').files[0];
  if (!file) return;
  msg('Subiendo imagen…');
  try {
    const section = upSection.value;
    const blob = await shrink(file, Math.max(SIZES[section][0], SIZES[section][1]), 0.85);
    const fd = new FormData();
    fd.append('seccion', section);
    fd.append('titulo', $('upTitle').value.trim());
    fd.append('posicion', $('upPos').value.trim());
    fd.append('numero', $('upNum').value.trim());
    fd.append('link', $('upLink').value.trim());
    fd.append('imagen', blob, 'imagen.jpg');
    items.push(toItem(await api('/api/imagenes', { method: 'POST', body: fd })));
    $('uploadForm').reset();
    syncForm();
    msg('Imagen agregada al catálogo.');
    renderCatalog();
    renderSite();
  } catch(err){
    msg(err.message || 'No se pudo subir la imagen.', true);
  }
});

/* ---------- Panel: catálogo ---------- */
let filter = 'all';
const KIND = { gallery:'Foto', highlight:'Highlight', player:'Jugador' };

function renderCatalog(){
  const list = items.filter(i => filter === 'all' || i.section === filter);
  $('catalogGrid').innerHTML = list.length ? list.map(i =>
    '<div class="cat-card"><img src="' + esc(i.img) + '" alt="' + esc(i.title) + '">' +
    '<div class="cat-info"><div class="kind">' + esc(KIND[i.section]) + '</div>' +
    '<div class="ttl">' + esc(i.title || 'Sin título') + '</div>' +
    (i.section === 'player' && (i.pos || i.num) ? '<div class="sub">' + esc(i.pos) + (i.num ? ' · #' + esc(i.num) : '') + '</div>' : '') +
    '<button class="cat-del" data-id="' + esc(i.id) + '">Eliminar</button></div></div>'
  ).join('') : '<div class="cat-empty">Aún no hay imágenes en esta categoría. Sube la primera con el formulario de arriba.</div>';
}

$('catalogGrid').addEventListener('click', async e => {
  const btn = e.target.closest('.cat-del');
  if (!btn) return;
  if (!confirm('¿Eliminar esta imagen del catálogo?')) return;
  try {
    await api('/api/imagenes/' + encodeURIComponent(btn.dataset.id), { method: 'DELETE' });
  } catch(err){
    alert(err.message);
  }
  await loadItems();
  renderCatalog();
  renderSite();
});

$('catTabs').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  filter = b.dataset.f;
  $('catTabs').querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
  renderCatalog();
});

/* ---------- Arranque ---------- */
loadItems().then(renderSite);
loadInfo().then(renderInfo);
api('/api/session').then(s => { logged = !!(s && s.logged); }).catch(() => {});
