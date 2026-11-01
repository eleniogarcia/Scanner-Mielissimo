const { GastoModel, GastoFijoModel, CATEGORIAS_GASTO } = require('../models/GastoModel');
const { mesActualArgentina, esMesValido } = require('../utils/fecha');

function mesDeQuery(req) {
  return esMesValido(req.query.mes) ? req.query.mes : mesActualArgentina();
}

const siguienteMes = (mes) => {
  let [a, m] = mes.split('-').map(Number);
  m += 1;
  if (m > 12) { m = 1; a += 1; }
  return `${a}-${String(m).padStart(2, '0')}`;
};

// Antes de mostrar gastos o balances, crear los gastos fijos del mes que falten
async function generarFijos() {
  try {
    await GastoFijoModel.generarPendientes();
  } catch (error) {
    console.error('Error generando gastos fijos:', error);
  }
}

// Valida y normaliza los datos de un gasto. Devuelve { error } o { datos }.
function validarGasto(body) {
  const { fecha, categoria, descripcion } = body;
  const monto = parseFloat(body.monto);
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'La fecha debe tener formato YYYY-MM-DD' };
  if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' };
  if (!CATEGORIAS_GASTO.includes(categoria)) return { error: 'Categoría de gasto inválida' };
  return {
    datos: {
      fecha,
      monto,
      categoria,
      descripcion: typeof descripcion === 'string' ? descripcion.trim().slice(0, 255) : null
    }
  };
}

// Valida los datos de un gasto fijo (parcial = al editar, permite campos faltantes)
function validarGastoFijo(body, parcial = false) {
  const datos = {};
  if (body.descripcion !== undefined || !parcial) {
    const d = typeof body.descripcion === 'string' ? body.descripcion.trim().slice(0, 255) : '';
    if (!d) return { error: 'Poné una descripción (ej: Alquiler)' };
    datos.descripcion = d;
  }
  if (body.categoria !== undefined || !parcial) {
    if (!CATEGORIAS_GASTO.includes(body.categoria)) return { error: 'Categoría de gasto inválida' };
    datos.categoria = body.categoria;
  }
  if (body.monto !== undefined || !parcial) {
    const monto = parseFloat(body.monto);
    if (isNaN(monto) || monto <= 0) return { error: 'El monto debe ser mayor a 0' };
    datos.monto = monto;
  }
  if (body.dia !== undefined || !parcial) {
    const dia = parseInt(body.dia);
    if (isNaN(dia) || dia < 1 || dia > 31) return { error: 'El día del mes debe ser entre 1 y 31' };
    datos.dia = dia;
  }
  if (body.activo !== undefined) datos.activo = Boolean(body.activo);
  return { datos };
}

class GastoController {

  // GET /api/gastos?mes=YYYY-MM
  static async getByMes(req, res) {
    try {
      await generarFijos();
      const gastos = await GastoModel.getByMes(mesDeQuery(req));
      res.json({ success: true, data: gastos });
    } catch (error) {
      console.error('Error obteniendo gastos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener gastos', error: error.message });
    }
  }

  // POST /api/gastos  { fecha, monto, categoria, descripcion }
  static async create(req, res) {
    try {
      const { error, datos } = validarGasto(req.body);
      if (error) return res.status(400).json({ success: false, message: error });
      const gasto = await GastoModel.create(datos);
      res.status(201).json({ success: true, data: gasto });
    } catch (error) {
      console.error('Error creando gasto:', error);
      res.status(500).json({ success: false, message: 'Error al guardar el gasto', error: error.message });
    }
  }

  // PUT /api/gastos/:id  { fecha, monto, categoria, descripcion } (se pueden mandar solo algunos)
  static async update(req, res) {
    try {
      const actual = await GastoModel.getById(parseInt(req.params.id));
      if (!actual) return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
      const { error, datos } = validarGasto({ ...actual, ...req.body });
      if (error) return res.status(400).json({ success: false, message: error });
      const gasto = await GastoModel.update(actual.id, datos);
      res.json({ success: true, data: gasto });
    } catch (error) {
      console.error('Error editando gasto:', error);
      res.status(500).json({ success: false, message: 'Error al editar el gasto', error: error.message });
    }
  }

  // GET /api/gastos/fijos
  static async getFijos(req, res) {
    try {
      res.json({ success: true, data: await GastoFijoModel.getAll() });
    } catch (error) {
      console.error('Error obteniendo gastos fijos:', error);
      res.status(500).json({ success: false, message: 'Error al obtener gastos fijos', error: error.message });
    }
  }

  // POST /api/gastos/fijos  { descripcion, categoria, monto, dia, empezar: 'este_mes' | 'mes_que_viene' }
  static async createFijo(req, res) {
    try {
      const { error, datos } = validarGastoFijo(req.body);
      if (error) return res.status(400).json({ success: false, message: error });
      const mesActual = mesActualArgentina();
      const desde = req.body.empezar === 'mes_que_viene' ? siguienteMes(mesActual) : mesActual;
      const fijo = await GastoFijoModel.create({ ...datos, desde });
      res.status(201).json({ success: true, data: fijo });
    } catch (error) {
      console.error('Error creando gasto fijo:', error);
      res.status(500).json({ success: false, message: 'Error al guardar el gasto fijo', error: error.message });
    }
  }

  // PUT /api/gastos/fijos/:id  (editar, o pausar/reactivar con { activo })
  static async updateFijo(req, res) {
    try {
      const { error, datos } = validarGastoFijo(req.body, true);
      if (error) return res.status(400).json({ success: false, message: error });
      const fijo = await GastoFijoModel.update(parseInt(req.params.id), datos);
      if (!fijo) return res.status(404).json({ success: false, message: 'Gasto fijo no encontrado' });
      res.json({ success: true, data: fijo });
    } catch (error) {
      console.error('Error editando gasto fijo:', error);
      res.status(500).json({ success: false, message: 'Error al editar el gasto fijo', error: error.message });
    }
  }

  // DELETE /api/gastos/fijos/:id
  static async deleteFijo(req, res) {
    try {
      const fijo = await GastoFijoModel.delete(parseInt(req.params.id));
      if (!fijo) return res.status(404).json({ success: false, message: 'Gasto fijo no encontrado' });
      res.json({ success: true, message: 'Gasto fijo eliminado' });
    } catch (error) {
      console.error('Error eliminando gasto fijo:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar el gasto fijo', error: error.message });
    }
  }

  // DELETE /api/gastos/:id
  static async delete(req, res) {
    try {
      const gasto = await GastoModel.delete(parseInt(req.params.id));
      if (!gasto) return res.status(404).json({ success: false, message: 'Gasto no encontrado' });
      res.json({ success: true, message: 'Gasto eliminado' });
    } catch (error) {
      console.error('Error eliminando gasto:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar el gasto', error: error.message });
    }
  }

  // GET /api/gastos/balance?mes=YYYY-MM
  static async getBalance(req, res) {
    try {
      await generarFijos();
      const balance = await GastoModel.getBalanceMes(mesDeQuery(req));
      res.json({ success: true, data: balance });
    } catch (error) {
      console.error('Error obteniendo balance:', error);
      res.status(500).json({ success: false, message: 'Error al obtener el balance', error: error.message });
    }
  }

  // GET /api/gastos/balance/meses?n=6
  static async getBalanceMeses(req, res) {
    try {
      const n = Math.min(Math.max(parseInt(req.query.n) || 6, 1), 24);
      await generarFijos();
      const balances = await GastoModel.getBalanceUltimosMeses(n);
      res.json({ success: true, data: balances });
    } catch (error) {
      console.error('Error obteniendo balances mensuales:', error);
      res.status(500).json({ success: false, message: 'Error al obtener los balances', error: error.message });
    }
  }

  // GET /api/gastos/categorias
  static getCategorias(req, res) {
    res.json({ success: true, data: CATEGORIAS_GASTO });
  }
}

module.exports = GastoController;
