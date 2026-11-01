const db = require('../config/database');

// Helper: obtiene la hora actual en Argentina (UTC-3, sin horario de verano)
function getArgentinaTimestamp() {
  const d = new Date();
  const arg = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  return arg.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
}

// Helper: carga los items de múltiples ventas en 2 queries (evita N+1)
async function attachItems(ventas) {
  if (!ventas || ventas.length === 0) return [];
  const ids = ventas.map(v => v.id);
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const itemsResult = await db.query(
    `SELECT * FROM venta_items WHERE venta_id IN (${placeholders}) ORDER BY venta_id, id`,
    ids
  );
  const itemsByVenta = {};
  for (const item of itemsResult.rows) {
    if (!itemsByVenta[item.venta_id]) itemsByVenta[item.venta_id] = [];
    itemsByVenta[item.venta_id].push(item);
  }
  return ventas.map(v => ({ ...v, items: itemsByVenta[v.id] || [] }));
}

class VentaModel {
  
  // Crear venta con items
  static async create(ventaData, items) {
    // Detectar si estamos usando SQLite o PostgreSQL
    const isElectronMode = process.env.ELECTRON_MODE === 'true' || process.env.npm_package_name === 'mielissimo-pos';
    
    if (isElectronMode) {
      // SQLite con better-sqlite3
      const transaction = db.db.transaction(() => {
        // Crear venta (created_at con horario Argentina UTC-3)
        const insertVentaStmt = db.db.prepare(
          `INSERT INTO ventas (total, items_count, metodo_pago, caja_id, created_at) 
           VALUES (?, ?, ?, ?, ?)`
        );
        
        const ventaResult = insertVentaStmt.run(
          ventaData.total,
          ventaData.items_count,
          ventaData.metodo_pago || 'efectivo',
          ventaData.caja_id || null,
          getArgentinaTimestamp()
        );
        
        const ventaId = ventaResult.lastInsertRowid;
        
        // Obtener la venta creada
        const getVentaStmt = db.db.prepare('SELECT * FROM ventas WHERE id = ?');
        const venta = getVentaStmt.get(ventaId);

        // Insertar items de venta
        const insertItemStmt = db.db.prepare(
          `INSERT INTO venta_items 
           (venta_id, producto_id, producto_nombre, producto_codigo, cantidad, precio_unitario, subtotal) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        // Descuenta stock solo si el producto tiene stock cargado (> 0), sin bajar de 0
        const updateStockStmt = db.db.prepare(
          `UPDATE productos 
           SET stock = MAX(stock - ?, 0), updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND stock IS NOT NULL AND stock > 0`
        );
        
        const ventaItems = [];
        for (const item of items) {
          const itemResult = insertItemStmt.run(
            ventaId,
            item.producto_id,
            item.producto_nombre,
            item.producto_codigo || null,
            item.cantidad,
            item.precio_unitario,
            item.subtotal
          );
          ventaItems.push({
            id: itemResult.lastInsertRowid,
            venta_id: ventaId,
            producto_id: item.producto_id,
            producto_nombre: item.producto_nombre,
            producto_codigo: item.producto_codigo || null,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          });

          // Items especiales (es_especial) tienen producto_id null y no descuentan stock
          if (item.producto_id) {
            updateStockStmt.run(item.cantidad, item.producto_id);
          }
        }

        return {
          ...venta,
          items: ventaItems
        };
      });
      
      return transaction();
      
    } else {
      // PostgreSQL
      const client = await db.pool.connect();
      
      try {
        await client.query('BEGIN');

        // Crear venta (created_at con horario Argentina UTC-3)
        const ventaResult = await client.query(
          `INSERT INTO ventas (total, items_count, metodo_pago, caja_id, created_at) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [ventaData.total, ventaData.items_count, ventaData.metodo_pago || 'efectivo', ventaData.caja_id || null, getArgentinaTimestamp()]
        );
        
        const venta = ventaResult.rows[0];

        // Insertar items de venta
        const ventaItems = [];
        for (const item of items) {
          const itemResult = await client.query(
            `INSERT INTO venta_items 
             (venta_id, producto_id, producto_nombre, producto_codigo, cantidad, precio_unitario, subtotal) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [
              venta.id,
              item.producto_id,
              item.producto_nombre,
              item.producto_codigo || null,
              item.cantidad,
              item.precio_unitario,
              item.subtotal
            ]
          );
          
          ventaItems.push(itemResult.rows[0]);

          // Descuenta stock solo si el producto tiene stock cargado (> 0), sin bajar de 0
          // Items especiales (es_especial) tienen producto_id null y no descuentan stock
          if (item.producto_id) {
            await client.query(
              `UPDATE productos 
               SET stock = GREATEST(stock - $1, 0), updated_at = CURRENT_TIMESTAMP
               WHERE id = $2 AND stock IS NOT NULL AND stock > 0`,
              [item.cantidad, item.producto_id]
            );
          }
        }

        await client.query('COMMIT');

        return {
          ...venta,
          items: ventaItems
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }

  // Obtener todas las ventas con paginación y filtros de fecha
  static async getAll(limit = 50, offset = 0, filtros = {}, options = {}) {
    let query = `SELECT * FROM ventas WHERE 1=1`;
    const params = [];
    let paramCount = 0;

    // Filtro de rango de fechas
    if (filtros.startDate && filtros.endDate) {
      paramCount++;
      params.push(filtros.startDate);
      paramCount++;
      params.push(filtros.endDate);
      query += ` AND created_at BETWEEN $${paramCount - 1} AND $${paramCount}`;
    } else if (filtros.startDate) {
      paramCount++;
      params.push(filtros.startDate);
      query += ` AND created_at >= $${paramCount}`;
    } else if (filtros.endDate) {
      paramCount++;
      params.push(filtros.endDate);
      query += ` AND created_at <= $${paramCount}`;
    }

    // Filtros predefinidos
    if (filtros.periodo === 'hoy') {
      query += ` AND DATE(created_at) = CURRENT_DATE`;
    } else if (filtros.periodo === 'semana') {
      query += ` AND created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (filtros.periodo === 'mes') {
      query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    query += ` ORDER BY created_at DESC`;
    
    paramCount++;
    params.push(limit);
    query += ` LIMIT $${paramCount}`;
    
    paramCount++;
    params.push(offset);
    query += ` OFFSET $${paramCount}`;

    const ventasResult = await db.query(query, params);
    return options.includeItems ? attachItems(ventasResult.rows) : ventasResult.rows;
  }

  // Obtener venta por ID con items
  static async getById(id) {
    const ventaResult = await db.query(
      'SELECT * FROM ventas WHERE id = $1',
      [id]
    );
    
    if (ventaResult.rows.length === 0) {
      return null;
    }

    const itemsResult = await db.query(
      'SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id',
      [id]
    );

    return {
      ...ventaResult.rows[0],
      items: itemsResult.rows
    };
  }

  // Obtener ventas de hoy
  static async getToday(options = {}) {
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE DATE(created_at) = CURRENT_DATE
       ORDER BY created_at DESC`
    );
    return options.includeItems ? attachItems(ventasResult.rows) : ventasResult.rows;
  }

  // Obtener ventas de la semana
  static async getWeekly(options = {}) {
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY created_at DESC`
    );
    return options.includeItems ? attachItems(ventasResult.rows) : ventasResult.rows;
  }

  // Obtener ventas del mes
  static async getMonthly(options = {}) {
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY created_at DESC`
    );
    return options.includeItems ? attachItems(ventasResult.rows) : ventasResult.rows;
  }

  // Estadísticas de ventas
  static async getStats(startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(v.id) as total_ventas,
        COALESCE(SUM(v.total), 0) as ingresos_totales,
        COALESCE(AVG(v.total), 0) as ticket_promedio,
        COALESCE(SUM(v.items_count), 0) as productos_vendidos
      FROM ventas v
    `;

    const params = [];
    
    if (startDate && endDate) {
      query += ' WHERE v.created_at BETWEEN $1 AND $2';
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ' WHERE v.created_at >= $1';
      params.push(startDate);
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  // Productos más vendidos
  static async getTopProducts(limit = 10) {
    const result = await db.query(
      `SELECT 
         vi.producto_nombre,
         vi.producto_codigo,
         SUM(vi.cantidad) as total_vendido,
         COUNT(DISTINCT vi.venta_id) as veces_vendido,
         SUM(vi.subtotal) as ingresos_generados
       FROM venta_items vi
       GROUP BY vi.producto_nombre, vi.producto_codigo
       ORDER BY total_vendido DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  // Calcular ganancias por período
  static async getGanancias(filtros = {}) {
    let query = `
      SELECT 
        COUNT(DISTINCT v.id) as total_ventas,
        COALESCE(SUM(vi.subtotal), 0) as ingresos_totales,
        COALESCE(SUM(vi.cantidad * p.costo), 0) as costos_totales,
        COALESCE(SUM(vi.subtotal) - SUM(vi.cantidad * p.costo), 0) as ganancia_neta,
        COALESCE(SUM(vi.cantidad), 0) as productos_vendidos
      FROM ventas v
      INNER JOIN venta_items vi ON v.id = vi.venta_id
      LEFT JOIN productos p ON vi.producto_id = p.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    // Filtros de fecha
    if (filtros.startDate && filtros.endDate) {
      paramCount++;
      params.push(filtros.startDate);
      paramCount++;
      params.push(filtros.endDate);
      query += ` AND v.created_at BETWEEN $${paramCount - 1} AND $${paramCount}`;
    } else if (filtros.startDate) {
      paramCount++;
      params.push(filtros.startDate);
      query += ` AND v.created_at >= $${paramCount}`;
    } else if (filtros.endDate) {
      paramCount++;
      params.push(filtros.endDate);
      query += ` AND v.created_at <= $${paramCount}`;
    }

    // Filtros predefinidos
    if (filtros.periodo === 'hoy') {
      query += ` AND DATE(v.created_at) = CURRENT_DATE`;
    } else if (filtros.periodo === 'semana') {
      query += ` AND v.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (filtros.periodo === 'mes') {
      query += ` AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    }

    const result = await db.query(query, params);
    const data = result.rows[0];
    
    // Calcular margen de ganancia porcentual
    const margenPorcentaje = data.ingresos_totales > 0 
      ? ((data.ganancia_neta / data.ingresos_totales) * 100).toFixed(2)
      : 0;

    return {
      ...data,
      margen_porcentaje: parseFloat(margenPorcentaje)
    };
  }

  // Ganancias de hoy
  static async getGananciasHoy() {
    return this.getGanancias({ periodo: 'hoy' });
  }

  // Ganancias de la semana
  static async getGananciasSemanales() {
    return this.getGanancias({ periodo: 'semana' });
  }

  // Ganancias del mes
  static async getGananciasMensuales() {
    return this.getGanancias({ periodo: 'mes' });
  }

  // Eliminar venta (repone el stock de los productos vendidos, si tienen stock cargado)
  static async delete(id) {
    const isElectronMode = process.env.ELECTRON_MODE === 'true' || process.env.npm_package_name === 'mielissimo-pos';

    if (isElectronMode) {
      // SQLite con better-sqlite3
      const transaction = db.db.transaction(() => {
        const getVentaStmt = db.db.prepare('SELECT * FROM ventas WHERE id = ?');
        const venta = getVentaStmt.get(id);
        if (!venta) return null;

        const getItemsStmt = db.db.prepare(
          'SELECT * FROM venta_items WHERE venta_id = ? AND producto_id IS NOT NULL'
        );
        const items = getItemsStmt.all(id);

        // Solo repone stock a productos que tienen stock cargado (stock IS NOT NULL)
        const restoreStockStmt = db.db.prepare(
          `UPDATE productos 
           SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ? AND stock IS NOT NULL`
        );
        for (const item of items) {
          restoreStockStmt.run(item.cantidad, item.producto_id);
        }

        const deleteStmt = db.db.prepare('DELETE FROM ventas WHERE id = ?');
        deleteStmt.run(id); // los items se eliminan automáticamente por CASCADE

        return venta;
      });

      return transaction();

    } else {
      // PostgreSQL
      const client = await db.pool.connect();

      try {
        await client.query('BEGIN');

        const ventaResult = await client.query('SELECT * FROM ventas WHERE id = $1', [id]);
        const venta = ventaResult.rows[0];

        if (!venta) {
          await client.query('ROLLBACK');
          return null;
        }

        const itemsResult = await client.query(
          'SELECT * FROM venta_items WHERE venta_id = $1 AND producto_id IS NOT NULL',
          [id]
        );

        // Solo repone stock a productos que tienen stock cargado (stock IS NOT NULL)
        for (const item of itemsResult.rows) {
          await client.query(
            `UPDATE productos 
             SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND stock IS NOT NULL`,
            [item.cantidad, item.producto_id]
          );
        }

        // Los items se eliminarán automáticamente por CASCADE
        await client.query('DELETE FROM ventas WHERE id = $1', [id]);

        await client.query('COMMIT');

        return venta;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
  }
}

module.exports = VentaModel;
