const db = require('../config/database');

class ProductoModel {

  static normalizeMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  static parseDateOnly(value) {
    if (!value) return null;
    const normalized = String(value).slice(0, 10);
    const date = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  static startOfToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  static getDiasParaVencer(fechaVencimiento) {
    const fecha = this.parseDateOnly(fechaVencimiento);
    if (!fecha) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.ceil((fecha.getTime() - this.startOfToday().getTime()) / msPerDay);
  }
  
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

  // Obtener múltiples productos por IDs (batch — evita N+1 al crear ventas)
  static async getByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
      `SELECT * FROM productos WHERE id IN (${placeholders})`,
      ids
    );
    return result.rows;
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
       WHERE (nombre ILIKE $1 OR codigo ILIKE $2) 
       AND activo = true 
       ORDER BY nombre`,
      [searchQuery, searchQuery]
    );
    return result.rows;
  }

  // Crear producto
  static async create(data) {
    const { nombre, codigo, precio, stock, fabricante, costo, fecha_vencimiento } = data;
    const precioNormalizado = this.normalizeMoney(precio);
    const costoNormalizado = this.normalizeMoney(costo ?? 0);
    
    const result = await db.query(
      `INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante, fecha_vencimiento, activo, precio_actualizado_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [nombre, codigo || null, precioNormalizado, costoNormalizado ?? 0, stock || 0, fabricante || null, fecha_vencimiento || null]
    );
    
    return result.rows[0];
  }

  // Actualizar producto
  static async update(id, data, precioAnterior) {
    const { nombre, codigo, precio, stock, fabricante, costo, activo, fecha_vencimiento } = data;
    const precioNormalizado = this.normalizeMoney(precio);
    const costoNormalizado = this.normalizeMoney(costo !== undefined ? costo : 0);
    
    // Si el precio cambió, actualizar precio_actualizado_at
    const precioQuery = precioAnterior !== undefined && parseFloat(precioNormalizado) !== parseFloat(precioAnterior)
      ? ', precio_actualizado_at = CURRENT_TIMESTAMP'
      : '';
    
    const result = await db.query(
      `UPDATE productos 
       SET nombre = $1, codigo = $2, precio = $3, costo = $4, stock = $5, fabricante = $6, activo = $7, fecha_vencimiento = $8, updated_at = CURRENT_TIMESTAMP${precioQuery}
       WHERE id = $9 
       RETURNING *`,
      [nombre, codigo || null, precioNormalizado, costoNormalizado ?? 0, stock !== undefined ? stock : 0, fabricante || null, activo, fecha_vencimiento || null, id]
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
  static async createBulk(productosArray, updateExisting = false) {
    // Detectar si estamos usando SQLite o PostgreSQL
    const isElectronMode = process.env.ELECTRON_MODE === 'true' || process.env.npm_package_name === 'mielissimo-pos';
    
    if (isElectronMode) {
      // SQLite con better-sqlite3
      const productosCreados = [];
      const productosActualizados = [];
      const errores = [];
      
      const transaction = db.db.transaction(() => {
        for (let i = 0; i < productosArray.length; i++) {
          const producto = productosArray[i];
          
          try {
            // Validar datos requeridos
            if (!producto.nombre || producto.precio === undefined || producto.precio === null) {
              errores.push({
                indice: i,
                producto: producto,
                error: 'Nombre y precio son requeridos'
              });
              continue;
            }
            
            // Sanitizar stock (no permitir negativos)
            if (producto.stock !== undefined && producto.stock < 0) {
              producto.stock = 0;
            }

            const precioNormalizado = this.normalizeMoney(producto.precio);
            const costoNormalizado = this.normalizeMoney(producto.costo !== undefined ? producto.costo : 0);
            
            // Verificar si el código ya existe (si se proporciona)
            let existente = null;
            if (producto.codigo) {
              const stmt = db.db.prepare('SELECT * FROM productos WHERE codigo = ?');
              existente = stmt.get(producto.codigo);
              
              if (existente) {
                if (updateExisting) {
                  // Actualizar producto existente
                  const precioQuery = existente.precio !== producto.precio 
                    ? ', precio_actualizado_at = CURRENT_TIMESTAMP' 
                    : '';
                  
                  const updateStmt = db.db.prepare(
                    `UPDATE productos 
                     SET nombre = ?, precio = ?, costo = ?, stock = ?, fabricante = ?, fecha_vencimiento = ?, updated_at = CURRENT_TIMESTAMP${precioQuery}
                     WHERE id = ?`
                  );
                  
                  updateStmt.run(
                    producto.nombre,
                    precioNormalizado,
                    costoNormalizado !== null ? costoNormalizado : existente.costo,
                    producto.stock !== undefined ? producto.stock : existente.stock,
                    producto.fabricante || existente.fabricante,
                    producto.fecha_vencimiento || existente.fecha_vencimiento || null,
                    existente.id
                  );
                  
                  // Obtener el producto actualizado
                  const selectStmt = db.db.prepare('SELECT * FROM productos WHERE id = ?');
                  const updated = selectStmt.get(existente.id);
                  productosActualizados.push(updated);
                  continue;
                } else {
                  errores.push({
                    indice: i,
                    producto: producto,
                    error: `El código ${producto.codigo} ya existe`
                  });
                  continue;
                }
              }
            }
            
            // Insertar producto nuevo
            const insertStmt = db.db.prepare(
              `INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante, fecha_vencimiento, activo, precio_actualizado_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`
            );
            
            const result = insertStmt.run(
              producto.nombre, 
              producto.codigo || null, 
              precioNormalizado, 
              costoNormalizado ?? 0, 
              producto.stock || 0, 
              producto.fabricante || null,
              producto.fecha_vencimiento || null
            );
            
            // Obtener el producto creado
            const selectStmt = db.db.prepare('SELECT * FROM productos WHERE id = ?');
            const created = selectStmt.get(result.lastInsertRowid);
            productosCreados.push(created);
            
          } catch (error) {
            errores.push({
              indice: i,
              producto: producto,
              error: error.message
            });
          }
        }
      });
      
      try {
        transaction();
        
        return {
          exitosos: productosCreados,
          actualizados: productosActualizados,
          errores: errores,
          total: productosArray.length,
          creados: productosCreados.length,
          actualizados: productosActualizados.length,
          fallidos: errores.length
        };
      } catch (error) {
        throw error;
      }
      
    } else {
      // PostgreSQL - No usar transacción global para evitar abortar todo por un error
      const productosCreados = [];
      const productosActualizados = [];
      const errores = [];
        
        for (let i = 0; i < productosArray.length; i++) {
          const producto = productosArray[i];
          
          try {
            // Validar datos requeridos
            if (!producto.nombre || producto.precio === undefined || producto.precio === null) {
              errores.push({
                indice: i,
                producto: producto,
                error: 'Nombre y precio son requeridos'
              });
              continue;
            }
            
            // Sanitizar stock (no permitir negativos)
            if (producto.stock !== undefined && producto.stock < 0) {
              producto.stock = 0;
            }

            const precioNormalizado = this.normalizeMoney(producto.precio);
            const costoNormalizado = this.normalizeMoney(producto.costo !== undefined ? producto.costo : 0);
            
            // Verificar si el código ya existe (si se proporciona)
            let existente = null;
            if (producto.codigo) {
              const existeResult = await db.pool.query(
                'SELECT * FROM productos WHERE codigo = $1',
                [producto.codigo]
              );
              
            if (existeResult.rows.length > 0) {
              existente = existeResult.rows[0];
              
              if (updateExisting) {
                // Actualizar producto existente
                const precioQuery = existente.precio !== producto.precio 
                  ? ', precio_actualizado_at = CURRENT_TIMESTAMP' 
                  : '';
                
                const result = await db.pool.query(
                  `UPDATE productos 
                   SET nombre = $1, precio = $2, costo = $3, stock = $4, fabricante = $5, fecha_vencimiento = $6, updated_at = CURRENT_TIMESTAMP${precioQuery}
                   WHERE id = $7 
                   RETURNING *`,
                  [
                    producto.nombre,
                    precioNormalizado,
                    costoNormalizado !== null ? costoNormalizado : existente.costo,
                    producto.stock !== undefined ? producto.stock : existente.stock,
                    producto.fabricante || existente.fabricante,
                    producto.fecha_vencimiento || existente.fecha_vencimiento || null,
                    existente.id
                  ]
                );
                
                productosActualizados.push(result.rows[0]);
                continue;
              } else {
                errores.push({
                  indice: i,
                  producto: producto,
                  error: `El código ${producto.codigo} ya existe`
                });
                continue;
              }
            }
          }
          
          // Insertar producto nuevo
          const result = await db.pool.query(
            `INSERT INTO productos (nombre, codigo, precio, costo, stock, fabricante, fecha_vencimiento, activo, precio_actualizado_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [producto.nombre, producto.codigo || null, precioNormalizado, costoNormalizado ?? 0, producto.stock || 0, producto.fabricante || null, producto.fecha_vencimiento || null]
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
      
      return {
        exitosos: productosCreados,
        actualizados: productosActualizados,
        errores: errores,
        total: productosArray.length,
        creados: productosCreados.length,
        actualizados: productosActualizados.length,
        fallidos: errores.length
      };
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

  static async getVencimientos(filters = {}) {
    const {
      includeInactive = false,
      estado = 'todos',
      desde = null,
      hasta = null,
      dias = null,
      q = null,
      limit = null,
      offset = 0
    } = filters;

    const productos = await this.getAll(includeInactive);
    const today = this.startOfToday();

    const enriched = productos.map((producto) => {
      const fecha = this.parseDateOnly(producto.fecha_vencimiento);
      const dias_para_vencer = fecha
        ? Math.ceil((fecha.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        ...producto,
        dias_para_vencer,
        estado_vencimiento: fecha
          ? (dias_para_vencer < 0 ? 'vencido' : dias_para_vencer === 0 ? 'vence_hoy' : 'vigente')
          : 'sin_vencimiento'
      };
    });

    let filtered = enriched;
    const desdeDate = this.parseDateOnly(desde);
    const hastaDate = this.parseDateOnly(hasta);
    const diasMax = Number.isFinite(Number(dias)) ? Number(dias) : null;
    const aplicarRangoFechas = !(estado === 'por_vencer' && diasMax !== null);
    const maxDiasVencidoVisible = -3;

    if (aplicarRangoFechas && desdeDate) {
      filtered = filtered.filter((p) => {
        const fecha = this.parseDateOnly(p.fecha_vencimiento);
        return fecha ? fecha.getTime() >= desdeDate.getTime() : false;
      });
    }

    if (aplicarRangoFechas && hastaDate) {
      filtered = filtered.filter((p) => {
        const fecha = this.parseDateOnly(p.fecha_vencimiento);
        return fecha ? fecha.getTime() <= hastaDate.getTime() : false;
      });
    }

    if (estado === 'vencido') {
      filtered = filtered.filter(
        (p) => p.dias_para_vencer !== null
          && p.dias_para_vencer < 0
          && p.dias_para_vencer >= maxDiasVencidoVisible
      );
    } else if (estado === 'todos') {
      filtered = filtered.filter(
        (p) => p.dias_para_vencer === null
          || p.dias_para_vencer >= maxDiasVencidoVisible
      );
    } else if (estado === 'vence_hoy') {
      filtered = filtered.filter((p) => p.dias_para_vencer === 0);
    } else if (estado === 'por_vencer') {
      filtered = filtered.filter((p) => p.dias_para_vencer !== null && p.dias_para_vencer >= 0);
      if (diasMax !== null) {
        filtered = filtered.filter((p) => p.dias_para_vencer <= diasMax);
      }
    } else if (estado === 'vigente') {
      filtered = filtered.filter((p) => p.dias_para_vencer !== null && p.dias_para_vencer > 0);
    } else if (estado === 'sin_vencimiento') {
      filtered = filtered.filter((p) => p.dias_para_vencer === null);
    }

    if (q && String(q).trim()) {
      const term = String(q).trim().toLowerCase();
      filtered = filtered.filter((p) => (
        p.nombre.toLowerCase().includes(term)
        || String(p.id).includes(term)
        || (p.codigo && p.codigo.toLowerCase().includes(term))
        || (p.fabricante && p.fabricante.toLowerCase().includes(term))
      ));
    }

    filtered.sort((a, b) => {
      if (a.dias_para_vencer === null && b.dias_para_vencer === null) {
        return a.nombre.localeCompare(b.nombre);
      }
      if (a.dias_para_vencer === null) return 1;
      if (b.dias_para_vencer === null) return -1;
      if (a.dias_para_vencer !== b.dias_para_vencer) {
        return a.dias_para_vencer - b.dias_para_vencer;
      }
      return a.nombre.localeCompare(b.nombre);
    });

    const total = filtered.length;
    const parsedOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;
    const parsedLimit = Number.isFinite(Number(limit)) ? Math.max(1, Number(limit)) : null;
    const items = parsedLimit ? filtered.slice(parsedOffset, parsedOffset + parsedLimit) : filtered;

    return {
      items,
      total
    };
  }

  static async getVencimientosResumen(filters = {}) {
    const { includeInactive = false } = filters;
    const productos = await this.getAll(includeInactive);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

    const maxDiasVencidoVisible = -3;

    return productos.reduce((acc, producto) => {
      const dias = this.getDiasParaVencer(producto.fecha_vencimiento);
      const fecha = this.parseDateOnly(producto.fecha_vencimiento);

      if (dias !== null && dias < 0 && dias >= maxDiasVencidoVisible) {
        acc.vencidos += 1;
      }

      if (fecha) {
        if (fecha >= thisMonthStart && fecha <= thisMonthEnd) {
          acc.esteMes += 1;
        } else if (fecha >= nextMonthStart && fecha <= nextMonthEnd) {
          acc.proximoMes += 1;
        }
      }

      return acc;
    }, { vencidos: 0, esteMes: 0, proximoMes: 0 });
  }
}

module.exports = ProductoModel;
