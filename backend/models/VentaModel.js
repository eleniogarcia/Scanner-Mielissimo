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

  // Obtener todas las ventas con paginación y filtros de fecha
  static async getAll(limit = 50, offset = 0, filtros = {}) {
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
    
    // Obtener items para cada venta
    const ventas = await Promise.all(
      ventasResult.rows.map(async (venta) => {
        const itemsResult = await db.query(
          'SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id',
          [venta.id]
        );
        return {
          ...venta,
          items: itemsResult.rows
        };
      })
    );
    
    return ventas;
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
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE DATE(created_at) = CURRENT_DATE
       ORDER BY created_at DESC`
    );
    
    // Obtener items para cada venta
    const ventas = await Promise.all(
      ventasResult.rows.map(async (venta) => {
        const itemsResult = await db.query(
          'SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id',
          [venta.id]
        );
        return {
          ...venta,
          items: itemsResult.rows
        };
      })
    );
    
    return ventas;
  }

  // Obtener ventas de la semana
  static async getWeekly() {
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY created_at DESC`
    );
    
    // Obtener items para cada venta
    const ventas = await Promise.all(
      ventasResult.rows.map(async (venta) => {
        const itemsResult = await db.query(
          'SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id',
          [venta.id]
        );
        return {
          ...venta,
          items: itemsResult.rows
        };
      })
    );
    
    return ventas;
  }

  // Obtener ventas del mes
  static async getMonthly() {
    const ventasResult = await db.query(
      `SELECT * FROM ventas 
       WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY created_at DESC`
    );
    
    // Obtener items para cada venta
    const ventas = await Promise.all(
      ventasResult.rows.map(async (venta) => {
        const itemsResult = await db.query(
          'SELECT * FROM venta_items WHERE venta_id = $1 ORDER BY id',
          [venta.id]
        );
        return {
          ...venta,
          items: itemsResult.rows
        };
      })
    );
    
    return ventas;
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
