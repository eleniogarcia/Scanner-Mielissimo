const db = require('../config/database');
const { ahoraArgentina, rangoMes, ultimosMeses } = require('../utils/fecha');
const { withTransaction } = require('../utils/transaction');

// Las compras de mercadería NO van como gasto: ya se descuentan como costo de los productos vendidos.
const CATEGORIAS_GASTO = ['alquiler', 'servicios', 'sueldos', 'impuestos', 'mantenimiento', 'insumos', 'otros'];

const num = v => parseFloat(v) || 0;
const redondear = v => Math.round(v * 100) / 100;

class GastoModel {

  static async getByMes(mes) {
    const { desde, hasta } = rangoMes(mes);
    const r = await db.query(
      `SELECT * FROM gastos
       WHERE fecha >= $1 AND fecha < $2
       ORDER BY fecha DESC, id DESC`,
      [desde, hasta]
    );
    return r.rows;
  }

  static async create({ fecha, monto, categoria, descripcion }) {
    const r = await db.query(
      `INSERT INTO gastos (fecha, monto, categoria, descripcion, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [fecha, redondear(monto), categoria, descripcion || null, ahoraArgentina()]
    );
    return r.rows[0];
  }

  // Si el gasto salió de la caja y la caja sigue abierta, también se borra el retiro de caja
  // (la plata "vuelve" a la caja). Si la caja ya se cerró, el retiro queda como movimiento común.
  static async delete(id) {
    return withTransaction(async (query) => {
      const r = await query('SELECT * FROM gastos WHERE id = $1', [id]);
      const gasto = r.rows[0];
      if (!gasto) return null;

      const movR = await query(
        `SELECT m.id, c.estado FROM caja_movimientos m
         JOIN cajas c ON c.id = m.caja_id
         WHERE m.gasto_id = $1`,
        [id]
      );
      for (const mov of movR.rows) {
        if (mov.estado === 'abierta') {
          await query('DELETE FROM caja_movimientos WHERE id = $1', [mov.id]);
        } else {
          await query('UPDATE caja_movimientos SET gasto_id = NULL WHERE id = $1', [mov.id]);
        }
      }

      await query('DELETE FROM gastos WHERE id = $1', [id]);
      return gasto;
    });
  }

  // Balance de un mes calendario: ventas − costo de lo vendido − gastos = ganancia real
  static async getBalanceMes(mes) {
    const { desde, hasta } = rangoMes(mes);
    const desdeTs = `${desde} 00:00:00`;
    const hastaTs = `${hasta} 00:00:00`;

    const [ventasR, metodosR, costosR, gastosR] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS total
         FROM ventas
         WHERE created_at >= $1 AND created_at < $2`,
        [desdeTs, hastaTs]
      ),
      db.query(
        `SELECT COALESCE(metodo_pago, 'efectivo') AS metodo_pago, COALESCE(SUM(total), 0) AS total
         FROM ventas
         WHERE created_at >= $1 AND created_at < $2
         GROUP BY COALESCE(metodo_pago, 'efectivo')`,
        [desdeTs, hastaTs]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(vi.cantidad * COALESCE(p.costo, 0)), 0) AS costo,
           COALESCE(SUM(CASE WHEN p.costo IS NULL OR p.costo = 0 THEN vi.subtotal ELSE 0 END), 0) AS ventas_sin_costo
         FROM venta_items vi
         JOIN ventas v ON v.id = vi.venta_id
         LEFT JOIN productos p ON p.id = vi.producto_id
         WHERE v.created_at >= $1 AND v.created_at < $2`,
        [desdeTs, hastaTs]
      ),
      db.query(
        `SELECT categoria, COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
         FROM gastos
         WHERE fecha >= $1 AND fecha < $2
         GROUP BY categoria`,
        [desde, hasta]
      )
    ]);

    const ventas = num(ventasR.rows[0]?.total);
    const costo = num(costosR.rows[0]?.costo);
    const gastosPorCategoria = {};
    let gastos = 0;
    for (const row of gastosR.rows) {
      gastosPorCategoria[row.categoria] = redondear(num(row.total));
      gastos += num(row.total);
    }
    const ventasPorMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
    for (const row of metodosR.rows) {
      const m = ventasPorMetodo[row.metodo_pago] !== undefined ? row.metodo_pago : 'efectivo';
      ventasPorMetodo[m] = redondear(ventasPorMetodo[m] + num(row.total));
    }

    const gananciaBruta = ventas - costo;
    const gananciaReal = gananciaBruta - gastos;

    return {
      mes,
      cantidad_ventas: parseInt(ventasR.rows[0]?.cantidad) || 0,
      ventas: redondear(ventas),
      ventas_por_metodo: ventasPorMetodo,
      costo_mercaderia: redondear(costo),
      ventas_sin_costo: redondear(num(costosR.rows[0]?.ventas_sin_costo)),
      ganancia_bruta: redondear(gananciaBruta),
      gastos: redondear(gastos),
      gastos_por_categoria: gastosPorCategoria,
      ganancia_real: redondear(gananciaReal),
      margen_real: ventas > 0 ? redondear((gananciaReal / ventas) * 100) : 0
    };
  }

  static async getBalanceUltimosMeses(n = 6) {
    const meses = ultimosMeses(n);
    return Promise.all(meses.map(m => this.getBalanceMes(m)));
  }
}

module.exports = { GastoModel, CATEGORIAS_GASTO };
