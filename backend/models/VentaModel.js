const db = require('../config/database');

class VentaModel {
  
  // Crear venta con items
  static async create(ventaData, items) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Crear venta
      const ventaResult = await client.query(
        `INSERT INTO ventas (total, items_count, metodo_pago) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [ventaData.total, ventaData.items_count, ventaData.metodo_pago]
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

  // Obtener todas las ventas con paginación
  static async getAll(limit = 50, offset = 0) {
    const result = await db.query(
      `SELECT * FROM ventas 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
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
  static async getToday() {
    const result = await db.query(
      `SELECT v.*, 
              COUNT(vi.id) as total_items 
       FROM ventas v
       LEFT JOIN venta_items vi ON v.id = vi.venta_id
       WHERE DATE(v.created_at) = CURRENT_DATE
       GROUP BY v.id
       ORDER BY v.created_at DESC`
    );
    return result.rows;
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

  // Eliminar venta
  static async delete(id) {
    // Los items se eliminarán automáticamente por CASCADE
    const result = await db.query(
      'DELETE FROM ventas WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

module.exports = VentaModel;
