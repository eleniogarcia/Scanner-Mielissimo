const { CajaModel, CajaError } = require('../models/CajaModel');
const { CATEGORIAS_GASTO } = require('../models/GastoModel');

function manejarError(res, error, mensaje) {
  if (error instanceof CajaError) {
    return res.status(error.status).json({ success: false, code: error.code, message: error.message });
  }
  console.error(`${mensaje}:`, error);
  res.status(500).json({ success: false, message: mensaje, error: error.message });
}

function montoValido(valor, { permitirCero = false } = {}) {
  const n = parseFloat(valor);
  if (isNaN(n) || !isFinite(n)) return null;
  if (permitirCero ? n < 0 : n <= 0) return null;
  return n;
}

class CajaController {

  // GET /api/caja/actual
  static async getActual(req, res) {
    try {
      const estado = await CajaModel.getEstadoActual();
      res.json({ success: true, data: estado });
    } catch (error) {
      manejarError(res, error, 'Error al obtener la caja');
    }
  }

  // POST /api/caja/abrir  { monto_inicial, observaciones }
  static async abrir(req, res) {
    try {
      const monto = montoValido(req.body.monto_inicial, { permitirCero: true });
      if (monto === null) {
        return res.status(400).json({ success: false, message: 'El monto inicial debe ser un número mayor o igual a 0' });
      }
      const caja = await CajaModel.abrir(monto, req.body.observaciones);
      res.status(201).json({ success: true, message: 'Caja abierta', data: caja });
    } catch (error) {
      manejarError(res, error, 'Error al abrir la caja');
    }
  }

  // POST /api/caja/cerrar  { monto_contado, observaciones }
  static async cerrar(req, res) {
    try {
      const monto = montoValido(req.body.monto_contado, { permitirCero: true });
      if (monto === null) {
        return res.status(400).json({ success: false, message: 'Ingresá cuánto efectivo contaste en la caja' });
      }
      const resultado = await CajaModel.cerrar(monto, req.body.observaciones);
      res.json({ success: true, message: 'Caja cerrada', data: resultado });
    } catch (error) {
      manejarError(res, error, 'Error al cerrar la caja');
    }
  }

  // POST /api/caja/movimientos  { tipo, monto, motivo, es_gasto, categoria }
  static async agregarMovimiento(req, res) {
    try {
      const { tipo, motivo, es_gasto, categoria } = req.body;
      if (!['ingreso', 'retiro'].includes(tipo)) {
        return res.status(400).json({ success: false, message: 'El tipo debe ser "ingreso" o "retiro"' });
      }
      const monto = montoValido(req.body.monto);
      if (monto === null) {
        return res.status(400).json({ success: false, message: 'El monto debe ser mayor a 0' });
      }
      const esGasto = tipo === 'retiro' && Boolean(es_gasto);
      if (esGasto && !CATEGORIAS_GASTO.includes(categoria)) {
        return res.status(400).json({ success: false, message: 'Categoría de gasto inválida' });
      }
      const mov = await CajaModel.agregarMovimiento({
        tipo,
        monto,
        motivo: typeof motivo === 'string' ? motivo.trim().slice(0, 255) : null,
        esGasto,
        categoria
      });
      res.status(201).json({ success: true, data: mov });
    } catch (error) {
      manejarError(res, error, 'Error al registrar el movimiento');
    }
  }

  // DELETE /api/caja/movimientos/:id
  static async eliminarMovimiento(req, res) {
    try {
      await CajaModel.eliminarMovimiento(parseInt(req.params.id));
      res.json({ success: true, message: 'Movimiento eliminado' });
    } catch (error) {
      manejarError(res, error, 'Error al eliminar el movimiento');
    }
  }

  // GET /api/caja/historial
  static async getHistorial(req, res) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 30, 200);
      const offset = parseInt(req.query.offset) || 0;
      const cajas = await CajaModel.getHistorial(limit, offset);
      res.json({ success: true, data: cajas });
    } catch (error) {
      manejarError(res, error, 'Error al obtener el historial de cajas');
    }
  }

  // GET /api/caja/:id
  static async getDetalle(req, res) {
    try {
      const detalle = await CajaModel.getDetalle(parseInt(req.params.id));
      if (!detalle) return res.status(404).json({ success: false, message: 'Caja no encontrada' });
      res.json({ success: true, data: detalle });
    } catch (error) {
      manejarError(res, error, 'Error al obtener la caja');
    }
  }
}

module.exports = CajaController;
