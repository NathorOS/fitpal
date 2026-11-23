const NOMBRE = 'fitpal';
const VERSION = 1;
let _db;

export function abrirDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((ok, fallo) => {
    const req = indexedDB.open(NOMBRE, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const crear = (n, opts, indices = []) => {
        if (db.objectStoreNames.contains(n)) return;
        const s = db.createObjectStore(n, opts);
        indices.forEach(i => s.createIndex(i, i));
      };
      crear('perfil',     { keyPath: 'id' });            // un solo registro: id = 'main'
      crear('config',     { keyPath: 'clave' });
      crear('alimentos',  { keyPath: 'id', autoIncrement: true }, ['nombre']);
      crear('favoritos',  { keyPath: 'id', autoIncrement: true });
      crear('registro',   { keyPath: 'id', autoIncrement: true }, ['fecha']);
      crear('peso',       { keyPath: 'fecha' });
      crear('agua',       { keyPath: 'id', autoIncrement: true }, ['fecha']);
      crear('ayuno',      { keyPath: 'id', autoIncrement: true });
      crear('pasos',      { keyPath: 'fecha' });
      crear('ejercicios', { keyPath: 'id' }, ['grupo']);
      crear('plantillas', { keyPath: 'id', autoIncrement: true }, ['nivel']);
      crear('sesiones',   { keyPath: 'id', autoIncrement: true }, ['fecha']);
      crear('metas',      { keyPath: 'fecha' });
    };
    req.onsuccess = () => { _db = req.result; ok(_db); };
    req.onerror = () => fallo(req.error);
  });
}

const envolver = r => new Promise((ok, fallo) => {
  r.onsuccess = () => ok(r.result);
  r.onerror = () => fallo(r.error);
});

export async function guardar(store, obj) {
  const db = await abrirDB();
  return envolver(db.transaction(store, 'readwrite').objectStore(store).put(obj));
}
export async function obtener(store, clave) {
  const db = await abrirDB();
  return envolver(db.transaction(store).objectStore(store).get(clave));
}
export async function todos(store) {
  const db = await abrirDB();
  return envolver(db.transaction(store).objectStore(store).getAll());
}
export async function porIndice(store, indice, valor) {
  const db = await abrirDB();
  return envolver(db.transaction(store).objectStore(store).index(indice).getAll(valor));
}
export async function borrar(store, clave) {
  const db = await abrirDB();
  return envolver(db.transaction(store, 'readwrite').objectStore(store).delete(clave));
}

// --- Fechas en hora local (YYYY-MM-DD), nunca toISOString() (eso es UTC) ---
export function hoy(d = new Date()) {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

// --- Respaldo ---
export async function exportarTodo() {
  const db = await abrirDB();
  const salida = { _app: 'fitpal', _version: VERSION, _fecha: new Date().toISOString() };
  for (const n of db.objectStoreNames) salida[n] = await todos(n);
  return JSON.stringify(salida);
}

// Importa todo en UNA transacción: si algo falla, no queda nada a medias.
export async function importarTodo(json) {
  const datos = JSON.parse(json);
  if (datos._app !== 'fitpal') throw new Error('El archivo no es un respaldo de FitPal');
  const db = await abrirDB();
  const stores = Object.keys(datos).filter(k => !k.startsWith('_') && db.objectStoreNames.contains(k));
  const tx = db.transaction(stores, 'readwrite');
  for (const store of stores) {
    const s = tx.objectStore(store);
    for (const fila of datos[store]) s.put(fila);
  }
  return new Promise((ok, fallo) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => fallo(tx.error);
    tx.onabort = () => fallo(tx.error);
  });
}
