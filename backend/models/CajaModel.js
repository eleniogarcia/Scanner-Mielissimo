const db = require('../config/database');
const { ahoraArgentina, hoyArgentina } = require('../utils/fecha');
const { withTransaction } = require('../utils/transaction');

const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia'];
const num = v => parseFloat(v) || 0;
const redondear = v => Math.round(v * 100) / 100;

class CajaError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class CajaModel {

  static async getAbierta(query = db.query) {
    const r = await query(`SELECT * FROM cajas WHERE estado = 'abierta' ORDER BY id DESC LIMIT 1`);
    return r.rows[0] || null;
  }

  static async getById(id, query = db.query) {
    const r = await query('SELECT * FROM cajas WHERE id = $1', [id]);
    return r.rows[0] || null;
  }

  static async getMovimientos(cajaId, query = db.query) {
    const r = await query(
      `SELECT m.*, g.categoria AS gasto_categoria
       FROM caja_movimientos m
       LEFT JOIN gastos g ON g.id = m.gasto_id
       WHERE m.caja_id = $1
       ORDER BY m.created_at DESC, m.id DESC`,
      [cajaId]
    );
    return r.rows;
  }

  // Calcula en vivo los totales de una caja: ventas por método, ingresos, retiros y efectivo esperado
  static async calcularResumen(caja, query = db.query) {
    const ventasR = await query(
      `SELECT COALESCE(metodo_pago, 'efectivo') AS metodo_pago,
              COUNT(*) AS cantidad,
              COALESCE(SUM(total), 0) AS total
       FROM ventas
       WHERE caja_id = $1
       GROUP BY COALESCE(metodo_pago, 'efectivo')`,
      [caja.id]
    );
    const movsR = await query(
      `SELECT tipo, COALESCE(SUM(monto), 0) AS total
       FROM caja_movimientos
       WHERE caja_id = $1
       GROUP BY tipo`,
      [caja.id]
    );

    const porMetodo = {};
    for (const m of METODOS_PAGO) porMetodo[m] = { cantidad: 0, total: 0 };
    let cantidadVentas = 0;
    let totalVentas = 0;
    for (const row of ventasR.rows) {
      const metodo = METODOS_PAGO.includes(row.metodo_pago) ? row.metodo_pago : 'efectivo';
      porMetodo[metodo].cantidad += parseInt(row.cantidad) || 0;
      porMetodo[metodo].total = redondear(porMetodo[metodo].total + num(row.total));
      cantidadVentas += parseInt(row.cantidad) || 0;
      totalVentas += num(row.total);
    }

    let ingresos = 0;
    let retiros = 0;
    for (const row of movsR.rows) {
      if (row.tipo === 'ingreso') ingresos = num(row.total);
      if (row.tipo === 'retiro') retiros = num(row.total);
    }

    const montoInicial = num(caja.monto_inicial);
    const efectivoEsperado = redondear(montoInicial + porMetodo.efectivo.total + ingresos - retiros);

    return {
      monto_inicial: montoInicial,
      ventas_por_metodo: porMetodo,
      cantidad_ventas: cantidadVentas,
      total_ventas: redondear(totalVentas),
      ingresos: redondear(ingresos),
      retiros: redondear(retiros),
      efectivo_esperado: efectivoEsperado
    };
  }

  // Caja abierta + resumen + movimientos (o null si está cerrada)
  static async getEstadoActual() {
    const caja = await this.getAbierta();
    if (!caja) return null;
    const [resumen, movimientos] = await Promise.all([
      this.calcularResumen(caja),
      this.getMovimientos(caja.id)
    ]);
    return { caja, resumen, movimientos };
  }

  static async getDetalle(id) {
    const caja = await this.getById(id);
    if (!caja) return null;
    const [resumen, movimientos] = await Promise.all([
      this.calcularResumen(caja),
      this.getMovimientos(caja.id)
    ]);
    return { caja, resumen, movimientos };
  }

  static async abrir(montoInicial, observaciones = null) {
    return withTransaction(async (query) => {
      const abierta = await this.getAbierta(query);
      if (abierta) {
        throw new CajaError('Ya hay una caja abierta', 'CAJA_YA_ABIERTA', 409);
      }
      const r = await query(
        `INSERT INTO cajas (estado, monto_inicial, abierta_at, observaciones)
         VALUES ('abierta', $1, $2, $3)
         RETURNING *`,
        [redondear(montoInicial), ahoraArgentina(), observaciones || null]
      );
      return r.rows[0];
    });
  }

  static async cerrar(montoContado, observaciones = null) {
    return withTransaction(async (query) => {
      const caja = await this.getAbierta(query);
      if (!caja) {
        throw new CajaError('No hay ninguna caja abierta', 'CAJA_CERRADA', 409);
      }
      const resumen = await this.calcularResumen(caja, query);
      const contado = redondear(montoContado);
      const diferencia = redondear(contado - resumen.efectivo_esperado);

      const r = await query(
        `UPDATE cajas SET
           estado = 'cerrada',
           cerrada_at = $1,
           monto_contado = $2,
           efectivo_esperado = $3,
           diferencia = $4,
           cantidad_ventas = $5,
           total_ventas = $6,
           ventas_efectivo = $7,
           ventas_tarjeta = $8,
           ventas_transferencia = $9,
           ingresos = $10,
           retiros = $11,
           observaciones_cierre = $12
         WHERE id = $13
         RETURNING *`,
        [
          ahoraArgentina(),
          contado,
          resumen.efectivo_esperado,
          diferencia,
          resumen.cantidad_ventas,
          resumen.total_ventas,
          resumen.ventas_por_metodo.efectivo.total,
          resumen.ventas_por_metodo.tarjeta.total,
          resumen.ventas_por_metodo.transferencia.total,
          resumen.ingresos,
          resumen.retiros,
          observaciones || null,
          caja.id
        ]
      );
      return { caja: r.rows[0], resumen };
    });
  }

  // Ingreso o retiro de efectivo. Si es un retiro marcado como gasto, también se registra en gastos.
  static async agregarMovimiento({ tipo, monto, motivo, esGasto = false, categoria = 'otros' }) {
    return withTransaction(async (query) => {
      const caja = await this.getAbierta(query);
      if (!caja) {
        throw new CajaError('No hay ninguna caja abierta', 'CAJA_CERRADA', 409);
      }

      const montoR = redondear(monto);
      let gastoId = null;

      if (tipo === 'retiro' && esGasto) {
        const g = await query(
          `INSERT INTO gastos (fecha, monto, categoria, descripcion, caja_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [hoyArgentina(), montoR, categoria, motivo || null, caja.id, ahoraArgentina()]
        );
        gastoId = g.rows[0].id;
      }

      const r = await query(
        `INSERT INTO caja_movimientos (caja_id, tipo, monto, motivo, gasto_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [caja.id, tipo, montoR, motivo || null, gastoId, ahoraArgentina()]
      );
      return r.rows[0];
    });
  }

  // Borra un movimiento (solo con la caja abierta). Si generó un gasto, el gasto también se borra.
  static async eliminarMovimiento(id) {
    return withTransaction(async (query) => {
      const r = await query('SELECT * FROM caja_movimientos WHERE id = $1', [id]);
      const mov = r.rows[0];
      if (!mov) throw new CajaError('Movimiento no encontrado', 'NO_ENCONTRADO', 404);

      const caja = await this.getById(mov.caja_id, query);
      if (!caja || caja.estado !== 'abierta') {
        throw new CajaError('Solo se pueden borrar movimientos de la caja abierta', 'CAJA_CERRADA', 409);
      }

      await query('DELETE FROM caja_movimientos WHERE id = $1', [id]);
      if (mov.gasto_id) {
        await query('DELETE FROM gastos WHERE id = $1', [mov.gasto_id]);
      }
      return mov;
    });
  }

  static async getHistorial(limit = 30, offset = 0) {
    const r = await db.query(
      `SELECT * FROM cajas
       WHERE estado = 'cerrada'
       ORDER BY cerrada_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return r.rows;
  }
}

module.exports = { CajaModel, CajaError, METODOS_PAGO };
