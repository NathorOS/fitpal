const NOMBRE = 'nathorfit';
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
    req.onsuccess = () => {
      _db = req.result;
      // Si el navegador cierra la conexión o otra pestaña actualiza la base,
      // se olvida la conexión para que la próxima llamada abra una nueva.
      _db.onclose = () => { _db = null; };
      _db.onversionchange = () => { _db.close(); _db = null; };
      ok(_db);
    };
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
export const CLAVES_PRIVADAS = ['gemini_clave'];
export async function exportarTodo() {
  const db = await abrirDB();
  const salida = { _app: 'nathorfit', _version: VERSION, _fecha: new Date().toISOString() };
  for (const n of db.objectStoreNames) salida[n] = await todos(n);
  // La clave de la IA es personal: nunca sale del teléfono, ni en un respaldo.
  salida.config = (salida.config ?? []).filter(c => !CLAVES_PRIVADAS.includes(c.clave));
  return JSON.stringify(salida);
}

/** Revisa un respaldo antes de importarlo. Devuelve { fecha, comidas, pesos } o lanza un error claro. */
export function leerRespaldo(json) {
  let datos;
  try { datos = typeof json === 'string' ? JSON.parse(json) : json; } catch { throw new Error('El archivo no se puede leer: no es un respaldo de Nathor Fit.'); }
  if (datos?._app !== 'nathorfit') throw new Error('El archivo no es un respaldo de Nathor Fit.');
  if (Number(datos._version) > VERSION) throw new Error('El respaldo es de una versión más nueva de Nathor Fit. Actualizá la app y probá de nuevo.');
  const perfil = Array.isArray(datos.perfil) ? datos.perfil.find(p => p.id === 'main') : null;
  if (!perfil) throw new Error('El respaldo no tiene un perfil: no se puede restaurar.');
  for (const [k, v] of Object.entries(datos)) if (!k.startsWith('_') && !Array.isArray(v)) throw new Error('El respaldo está dañado.');
  return { datos, fecha: datos._fecha ? new Date(datos._fecha) : null, comidas: datos.registro?.length ?? 0, pesos: datos.peso?.length ?? 0, nombre: perfil.nombre };
}

/**
 * Restaura un respaldo REEMPLAZANDO los datos del teléfono, en UNA transacción:
 * si algo falla, no queda nada a medias. La clave de la IA del teléfono se conserva.
 */
export async function importarTodo(json) {
  const { datos } = leerRespaldo(json);
  const db = await abrirDB();
  const stores = [...db.objectStoreNames];
  const privadas = (await todos('config')).filter(c => CLAVES_PRIVADAS.includes(c.clave));
  const tx = db.transaction(stores, 'readwrite');
  for (const store of stores) {
    const s = tx.objectStore(store);
    s.clear();
    const filas = (datos[store] ?? []).filter(f => !(store === 'config' && CLAVES_PRIVADAS.includes(f.clave)));
    for (const fila of filas) s.put(fila);
    if (store === 'config') for (const c of privadas) s.put(c);
  }
  return new Promise((ok, fallo) => {
    tx.oncomplete = () => ok();
    tx.onerror = () => fallo(tx.error);
    tx.onabort = () => fallo(tx.error);
  });
}

/** Borra la base entera (empezar de cero). */
export async function borrarTodo() {
  const db = await abrirDB();
  db.close(); _db = null;
  await new Promise((ok, fallo) => {
    const r = indexedDB.deleteDatabase(NOMBRE);
    r.onsuccess = () => ok(); r.onerror = () => fallo(r.error); r.onblocked = () => ok();
  });
}
