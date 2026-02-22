const db = require('../config/database');

class ProductoModel {
  
  // Obtener todos los productos
  static async getAll(includeInactive = false) {
    const query = includeInactive 
      ? 'SELECT * FROM productos ORDER BY id DESC'
      : 'SELECT * FROM productos WHERE activo = true ORDER BY id DESC';
    
    const result = await db.query(query);
    return result.rows;
  }

  // Obtener producto por ID
  static async getById(id) {
    const result = await db.query(
      'SELECT * FROM productos WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  // Buscar producto por código (para escaneo)
  static async getByCodigo(codigo) {
    const result = await db.query(
      'SELECT * FROM productos WHERE codigo = $1 AND activo = true',
      [codigo]
    );
    return result.rows[0];
  }

  // Buscar productos (búsqueda general)
  static async search(query) {
    const searchQuery = `%${query}%`;
    const result = await db.query(
      `SELECT * FROM productos 
       WHERE (nombre ILIKE $1 OR codigo ILIKE $1) 
       AND activo = true 
       ORDER BY nombre`,
      [searchQuery]
    );
    return result.rows;
  }

  // Crear producto
  static async create(data) {
    const { nombre, codigo, precio, stock, fabricante, costo } = data;
    
    const result = await db.query(
      `INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante, activo, precio_actualizado_at) 
       VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [nombre, codigo || null, precio, costo || 0, stock || 0, fabricante || null]
    );
    
    return result.rows[0];
  }

  // Actualizar producto
  static async update(id, data, precioAnterior) {
    const { nombre, codigo, precio, stock, fabricante, costo, activo } = data;
    
    // Si el precio cambió, actualizar precio_actualizado_at
    const precioQuery = precioAnterior !== undefined && parseFloat(precio) !== parseFloat(precioAnterior)
      ? ', precio_actualizado_at = CURRENT_TIMESTAMP'
      : '';
    
    const result = await db.query(
      `UPDATE productos 
       SET nombre = $1, codigo = $2, precio = $3, costo = $4, stock = $5, fabricante = $6, activo = $7, updated_at = CURRENT_TIMESTAMP${precioQuery}
       WHERE id = $8 
       RETURNING *`,
      [nombre, codigo || null, precio, costo !== undefined ? costo : 0, stock !== undefined ? stock : 0, fabricante || null, activo, id]
    );
    
    return result.rows[0];
  }

  // Eliminar producto (soft delete)
  static async delete(id) {
    const result = await db.query(
      'UPDATE productos SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Eliminar producto (hard delete)
  static async hardDelete(id) {
    const result = await db.query(
      'DELETE FROM productos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  // Crear múltiples productos (carga masiva)
  static async createBulk(productosArray) {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const productosCreados = [];
      const errores = [];
      
      for (let i = 0; i < productosArray.length; i++) {
        const producto = productosArray[i];
        
        try {
          // Validar datos requeridos
          if (!producto.nombre || !producto.precio) {
            errores.push({
              indice: i,
              producto: producto,
              error: 'Nombre y precio son requeridos'
            });
            continue;
          }
          
          // Verificar si el código ya existe (si se proporciona)
          if (producto.codigo) {
            const existeResult = await client.query(
              'SELECT id FROM productos WHERE codigo = $1',
              [producto.codigo]
            );
            
            if (existeResult.rows.length > 0) {
              errores.push({
                indice: i,
                producto: producto,
                error: `El código ${producto.codigo} ya existe`
              });
              continue;
            }
          }
          
          // Insertar producto
          const result = await client.query(
            `INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante, activo, precio_actualizado_at) 
             VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [producto.nombre, producto.codigo || null, producto.precio, producto.costo || 0, producto.stock || 0, producto.fabricante || null]
          );
          
          productosCreados.push(result.rows[0]);
        } catch (error) {
          errores.push({
            indice: i,
            producto: producto,
            error: error.message
          });
        }
      }
      
      await client.query('COMMIT');
      
      return {
        exitosos: productosCreados,
        errores: errores,
        total: productosArray.length,
        creados: productosCreados.length,
        fallidos: errores.length
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Verificar si un código ya existe
  static async codigoExists(codigo, excludeId = null) {
    const query = excludeId
      ? 'SELECT id FROM productos WHERE codigo = $1 AND id != $2'
      : 'SELECT id FROM productos WHERE codigo = $1';
    
    const params = excludeId ? [codigo, excludeId] : [codigo];
    const result = await db.query(query, params);
    
    return result.rows.length > 0;
  }
}

module.exports = ProductoModel;
