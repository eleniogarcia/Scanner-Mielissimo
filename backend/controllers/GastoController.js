const { GastoModel, CATEGORIAS_GASTO } = require('../models/GastoModel');
const { mesActualArgentina, esMesValido } = require('../utils/fecha');

function mesDeQuery(req) {
  return esMesValido(req.query.mes) ? req.query.mes : mesActualArgentina();
}

class GastoController {

  // GET /api/gastos?mes=YYYY-MM
  static async getByMes(req, res) {
    try {
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
      const { fecha, categoria, descripcion } = req.body;
      const monto = parseFloat(req.body.monto);
      if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return res.status(400).json({ success: false, message: 'La fecha debe tener formato YYYY-MM-DD' });
      }
      if (isNaN(monto) || monto <= 0) {
        return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });
      }
      if (!CATEGORIAS_GASTO.includes(categoria)) {
        return res.status(400).json({ success: false, message: 'Categoría de gasto inválida' });
      }
      const gasto = await GastoModel.create({
        fecha,
        monto,
        categoria,
        descripcion: typeof descripcion === 'string' ? descripcion.trim().slice(0, 255) : null
      });
      res.status(201).json({ success: true, data: gasto });
    } catch (error) {
      console.error('Error creando gasto:', error);
      res.status(500).json({ success: false, message: 'Error al guardar el gasto', error: error.message });
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
