// Sincronización con la web del negocio.
// - Publicar productos del POS en la web (sin foto).
// - Avisar cambios de precio/nombre.
// - Avisar cuando un producto se queda sin stock (la web lo pausa) o vuelve a tener (la web lo reactiva).
//
// Los cambios se guardan en la tabla web_sync y se mandan en segundo plano. Si no hay internet
// o la web no responde, quedan pendientes y se reintentan solos. Nunca frenan una venta.

const db = require('../config/database');
const { ahoraArgentina } = require('../utils/fecha');

const TIMEOUT_MS = 10000;
const INTERVALO_REINTENTO_MS = 60 * 1000;

let procesando = false;
let timerProximo = null;
let intervalo = null;
let ultimoResultado = null; // { at, ok, mensaje }

// ── Configuración (dirección de la web y clave) ───────────────────

async function getConfig() {
  const r = await db.query(`SELECT clave, valor FROM configuracion WHERE clave IN ('web_url', 'web_clave')`);
  const cfg = {};
  for (const row of r.rows) cfg[row.clave] = row.valor;
  return { url: cfg.web_url || '', clave: cfg.web_clave || '' };
}

async function guardarValor(clave, valor) {
  await db.query(
    `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
     ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor`,
    [clave, valor]
  );
}

function normalizarUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

async function setConfig({ url, clave }) {
  if (url !== undefined) await guardarValor('web_url', normalizarUrl(url));
  // La clave solo se cambia si mandan una nueva (el frontend nunca la recibe de vuelta)
  if (clave) await guardarValor('web_clave', String(clave).trim());
  programar(500);
}

async function estaConfigurada() {
  const { url, clave } = await getConfig();
  return Boolean(url && clave);
}

// ── Llamadas a la web ─────────────────────────────────────────────

class WebError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function llamarWeb(metodo, ruta, body, cfgOverride) {
  const cfg = cfgOverride || await getConfig();
  if (!cfg.url || !cfg.clave) throw new WebError('Falta configurar la conexión con la web', 0);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(`${cfg.url}/api/pos${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'x-pos-key': cfg.clave },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (error) {
    const msg = error.name === 'AbortError' ? 'La web tardó demasiado en responder' : 'No se pudo conectar con la web (¿hay internet?)';
    throw new WebError(msg, 0);
  } finally {
    clearTimeout(timer);
  }

  let data = null;
  try { data = await resp.json(); } catch { /* sin cuerpo */ }
  if (!resp.ok) {
    throw new WebError(data?.error || `La web respondió con error ${resp.status}`, resp.status);
  }
  return data;
}

async function probarConexion(cfg) {
  const actual = await getConfig();
  const usar = {
    url: normalizarUrl(cfg?.url ?? actual.url),
    clave: cfg?.clave || actual.clave
  };
  await llamarWeb('GET', '/ping', null, usar);
  return true;
}

async function getCategorias() {
  return llamarWeb('GET', '/categorias');
}

// ── Cola de cambios ───────────────────────────────────────────────

async function getPendiente(productoId) {
  const r = await db.query('SELECT * FROM web_sync WHERE producto_id = $1', [productoId]);
  return r.rows[0] || null;
}

// Publicar un producto en la web
async function encolarCrear(productoId, categoriaId) {
  await db.query(
    `INSERT INTO web_sync (producto_id, accion, categoria_id, stock_evento, intentos, ultimo_error, updated_at)
     VALUES ($1, 'crear', $2, NULL, 0, NULL, $3)
     ON CONFLICT (producto_id) DO UPDATE SET accion = 'crear', categoria_id = excluded.categoria_id,
       intentos = 0, ultimo_error = NULL, updated_at = excluded.updated_at`,
    [productoId, categoriaId || null, ahoraArgentina()]
  );
  programar();
}

// Avisar un cambio (precio/nombre, y opcionalmente un evento de stock)
async function encolarActualizar(productoId, stockEvento = null) {
  const pendiente = await getPendiente(productoId);
  if (pendiente) {
    // Si todavía no se publicó, la publicación ya va a llevar los datos actuales;
    // solo guardamos el último evento de stock.
    if (stockEvento) {
      await db.query(
        'UPDATE web_sync SET stock_evento = $1, updated_at = $2 WHERE producto_id = $3',
        [stockEvento, ahoraArgentina(), productoId]
      );
    }
  } else {
    await db.query(
      `INSERT INTO web_sync (producto_id, accion, categoria_id, stock_evento, intentos, ultimo_error, updated_at)
       VALUES ($1, 'actualizar', NULL, $2, 0, NULL, $3)`,
      [productoId, stockEvento, ahoraArgentina()]
    );
  }
  programar();
}

// Compara cómo estaban los productos antes de una operación con cómo quedaron,
// y encola los avisos necesarios. Solo mira productos publicados (o por publicar).
async function compararYEncolar(productosAntes) {
  try {
    if (!productosAntes || productosAntes.length === 0) return;
    for (const antes of productosAntes) {
      if (!antes) continue;
      const pendiente = antes.web_producto_id ? null : await getPendiente(antes.id);
      if (!antes.web_producto_id && !pendiente) continue;

      const r = await db.query('SELECT * FROM productos WHERE id = $1', [antes.id]);
      const ahora = r.rows[0];
      if (!ahora) continue;

      const stockAntes = parseInt(antes.stock) || 0;
      const stockAhora = parseInt(ahora.stock) || 0;
      let stockEvento = null;
      if (stockAntes > 0 && stockAhora === 0) stockEvento = 'agotado';
      else if (stockAntes === 0 && stockAhora > 0) stockEvento = 'repuesto';

      const cambioDatos = parseFloat(antes.precio) !== parseFloat(ahora.precio) || antes.nombre !== ahora.nombre;

      if (stockEvento || cambioDatos) {
        await encolarActualizar(ahora.id, stockEvento);
      }
    }
  } catch (error) {
    // Nunca romper la operación principal por la web
    console.error('[web] Error preparando avisos a la web:', error);
  }
}

// Productos publicados en la web (para comparar antes/después de una carga masiva)
async function getPublicados() {
  const r = await db.query(
    `SELECT p.* FROM productos p
     WHERE p.web_producto_id IS NOT NULL
        OR EXISTS (SELECT 1 FROM web_sync s WHERE s.producto_id = p.id)`
  );
  return r.rows;
}

// ── Procesar la cola ──────────────────────────────────────────────

async function procesarItem(item, cfg) {
  const r = await db.query('SELECT * FROM productos WHERE id = $1', [item.producto_id]);
  const producto = r.rows[0];
  if (!producto) {
    await db.query('DELETE FROM web_sync WHERE producto_id = $1', [item.producto_id]);
    return;
  }

  if (item.accion === 'crear' && !producto.web_producto_id) {
    const sinStock = item.stock_evento === 'agotado';
    const data = await llamarWeb('POST', '/productos', {
      nombre: producto.nombre,
      precio: parseFloat(producto.precio),
      categoria_id: item.categoria_id || null,
      sin_stock: sinStock
    }, cfg);
    await db.query('UPDATE productos SET web_producto_id = $1 WHERE id = $2', [data.id, producto.id]);
    await db.query('DELETE FROM web_sync WHERE producto_id = $1', [producto.id]);
    return;
  }

  if (!producto.web_producto_id) {
    await db.query('DELETE FROM web_sync WHERE producto_id = $1', [producto.id]);
    return;
  }

  try {
    await llamarWeb('PUT', `/productos/${producto.web_producto_id}`, {
      nombre: producto.nombre,
      precio: parseFloat(producto.precio),
      stock_evento: item.stock_evento || undefined
    }, cfg);
  } catch (error) {
    if (error.status === 404) {
      // Lo borraron de la web: lo desvinculamos
      await db.query('UPDATE productos SET web_producto_id = NULL WHERE id = $1', [producto.id]);
    } else {
      throw error;
    }
  }
  await db.query('DELETE FROM web_sync WHERE producto_id = $1', [producto.id]);
}

async function procesarCola() {
  if (procesando) return;
  procesando = true;
  try {
    const cfg = await getConfig();
    if (!cfg.url || !cfg.clave) return;

    const r = await db.query('SELECT * FROM web_sync ORDER BY updated_at ASC LIMIT 50');
    for (const item of r.rows) {
      try {
        await procesarItem(item, cfg);
        ultimoResultado = { at: ahoraArgentina(), ok: true, mensaje: 'Sincronizado' };
      } catch (error) {
        await db.query(
          'UPDATE web_sync SET intentos = intentos + 1, ultimo_error = $1 WHERE producto_id = $2',
          [String(error.message).slice(0, 255), item.producto_id]
        );
        ultimoResultado = { at: ahoraArgentina(), ok: false, mensaje: error.message };
        // Si no hay conexión, no tiene sentido seguir con el resto ahora
        if (error.status === 0 || error.status === 401 || error.status === 503) break;
      }
    }
  } catch (error) {
    console.error('[web] Error procesando la cola:', error);
  } finally {
    procesando = false;
  }
}

function programar(ms = 1500) {
  if (timerProximo) clearTimeout(timerProximo);
  timerProximo = setTimeout(() => {
    timerProximo = null;
    procesarCola();
  }, ms);
}

function iniciar() {
  if (intervalo) return;
  intervalo = setInterval(procesarCola, INTERVALO_REINTENTO_MS);
  programar(5000);
}

async function getEstado() {
  const cfg = await getConfig();
  const r = await db.query(
    `SELECT s.producto_id, s.accion, s.intentos, s.ultimo_error, p.nombre
     FROM web_sync s LEFT JOIN productos p ON p.id = s.producto_id
     ORDER BY s.updated_at ASC`
  );
  const publicados = await db.query('SELECT COUNT(*) AS n FROM productos WHERE web_producto_id IS NOT NULL');
  return {
    configurada: Boolean(cfg.url && cfg.clave),
    url: cfg.url,
    tiene_clave: Boolean(cfg.clave),
    publicados: parseInt(publicados.rows[0]?.n) || 0,
    pendientes: r.rows,
    ultimo_resultado: ultimoResultado
  };
}

module.exports = {
  getConfig,
  setConfig,
  probarConexion,
  getCategorias,
  encolarCrear,
  encolarActualizar,
  compararYEncolar,
  getPublicados,
  procesarCola,
  iniciar,
  getEstado,
  WebError
};
