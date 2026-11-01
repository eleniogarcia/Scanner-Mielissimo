// Fechas en horario de Argentina (UTC-3, sin horario de verano).
// Se guardan como texto 'YYYY-MM-DD HH:MM:SS' para que funcionen igual en SQLite y PostgreSQL.

function ahoraArgentina() {
  const arg = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return arg.toISOString().replace('T', ' ').substring(0, 19);
}

function hoyArgentina() {
  return ahoraArgentina().substring(0, 10);
}

function mesActualArgentina() {
  return ahoraArgentina().substring(0, 7);
}

// 'YYYY-MM' → { desde: 'YYYY-MM-01', hasta: 'YYYY-(MM+1)-01' } (hasta es exclusivo)
function rangoMes(mes) {
  const [anio, m] = mes.split('-').map(Number);
  const sig = m === 12 ? { a: anio + 1, m: 1 } : { a: anio, m: m + 1 };
  const pad = n => String(n).padStart(2, '0');
  return {
    desde: `${anio}-${pad(m)}-01`,
    hasta: `${sig.a}-${pad(sig.m)}-01`
  };
}

// Lista de los últimos n meses (incluye el actual), del más reciente al más viejo
function ultimosMeses(n, desdeMes = mesActualArgentina()) {
  const meses = [];
  let [anio, m] = desdeMes.split('-').map(Number);
  for (let i = 0; i < n; i++) {
    meses.push(`${anio}-${String(m).padStart(2, '0')}`);
    m -= 1;
    if (m === 0) { m = 12; anio -= 1; }
  }
  return meses;
}

// Meses desde 'desde' hasta 'hasta' inclusive, en orden ('YYYY-MM'). Máximo `limite` meses (los más recientes).
function mesesEntre(desde, hasta, limite = 24) {
  if (desde > hasta) return [];
  const meses = [];
  let [anio, m] = hasta.split('-').map(Number);
  while (meses.length < limite) {
    const mes = `${anio}-${String(m).padStart(2, '0')}`;
    if (mes < desde) break;
    meses.unshift(mes);
    m -= 1;
    if (m === 0) { m = 12; anio -= 1; }
  }
  return meses;
}

// Fecha del día `dia` en el mes, ajustada si el mes es más corto (ej: 31 en febrero → 28/29)
function fechaDelMes(mes, dia) {
  const [anio, m] = mes.split('-').map(Number);
  const ultimoDia = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  return `${mes}-${String(Math.min(dia, ultimoDia)).padStart(2, '0')}`;
}

function esMesValido(mes) {
  return typeof mes === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

module.exports = { ahoraArgentina, hoyArgentina, mesActualArgentina, rangoMes, ultimosMeses, mesesEntre, fechaDelMes, esMesValido };
