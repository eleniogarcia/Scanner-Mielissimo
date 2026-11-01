const ProductoModel = require('../models/ProductoModel');
const webSync = require('../services/webSync');
const { validationResult } = require('express-validator');

class ProductoController {
  
  // GET /api/productos - Obtener todos los productos
  static async getAll(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const productos = await ProductoModel.getAll(includeInactive);
      
      res.json({
        success: true,
        count: productos.length,
        data: productos
      });
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos',
        error: error.message
      });
    }
  }

  // GET /api/productos/:id - Obtener producto por ID
  static async getById(req, res) {
    try {
      const producto = await ProductoModel.getById(req.params.id);
      
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        data: producto
      });
    } catch (error) {
      console.error('Error obteniendo producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener producto',
        error: error.message
      });
    }
  }

  // GET /api/productos/codigo/:codigo - Buscar por código exacto (para escaneo)
  static async getByCodigo(req, res) {
    try {
      const codigo = req.params.codigo;

      // Match EXACTO únicamente. El escaneo nunca debe caer a una búsqueda
      // difusa por nombre: eso puede matchear un producto sin relación con
      // el código leído (por ejemplo códigos internos cortos como "1" o "2"
      // que quedan contenidos como substring dentro de cualquier código de
      // barras largo), agregándolo solo al carrito sin que nadie lo pida.
      // La búsqueda por nombre para el autocompletado ya existe aparte en
      // GET /api/productos/search.
      const producto = await ProductoModel.getByCodigo(codigo);
      
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: `Producto no encontrado: ${codigo}`,
          codigo: codigo
        });
      }

      res.json({
        success: true,
        data: producto
      });
    } catch (error) {
      console.error('Error buscando producto por código:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar producto',
        error: error.message
      });
    }
  }

  // GET /api/productos/search?q=query - Buscar productos
  static async search(req, res) {
    try {
      const query = req.query.q;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Parámetro de búsqueda requerido'
        });
      }

      const productos = await ProductoModel.search(query);
      
      res.json({
        success: true,
        count: productos.length,
        data: productos
      });
    } catch (error) {
      console.error('Error buscando productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al buscar productos',
        error: error.message
      });
    }
  }

  // GET /api/productos/vencimientos - Listado de productos por fecha de vencimiento
  static async getVencimientos(req, res) {
    try {
      const filtros = {
        includeInactive: req.query.includeInactive === 'true',
        estado: req.query.estado || 'todos',
        desde: req.query.desde || null,
        hasta: req.query.hasta || null,
        dias: req.query.dias || null,
        q: req.query.q || null,
        limit: req.query.limit || null,
        offset: req.query.offset || 0
      };

      const result = await ProductoModel.getVencimientos(filtros);

      res.json({
        success: true,
        count: result.items.length,
        total: result.total,
        filters: filtros,
        data: result.items
      });
    } catch (error) {
      console.error('Error obteniendo vencimientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener vencimientos',
        error: error.message
      });
    }
  }

  // GET /api/productos/vencimientos/resumen - Contadores globales de vencimientos
  static async getVencimientosResumen(req, res) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const resumen = await ProductoModel.getVencimientosResumen({ includeInactive });

      res.json({
        success: true,
        data: resumen
      });
    } catch (error) {
      console.error('Error obteniendo resumen de vencimientos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener resumen de vencimientos',
        error: error.message
      });
    }
  }

  // POST /api/productos - Crear producto
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const { codigo } = req.body;

      // Verificar código duplicado si se proporciona
      if (codigo) {
        const exists = await ProductoModel.codigoExists(codigo);
        if (exists) {
          return res.status(400).json({
            success: false,
            message: `Ya existe un producto con el código: ${codigo}`
          });
        }
      }

      const producto = await ProductoModel.create(req.body);

      // Publicar en la web si lo pidieron (se manda en segundo plano)
      if (req.body.publicar_web === true || req.body.publicar_web === 'true') {
        const categoriaWeb = req.body.web_categoria_id ? parseInt(req.body.web_categoria_id) : null;
        webSync.encolarCrear(producto.id, categoriaWeb).catch(e => console.error('[web] Error encolando publicación:', e));
      }
      
      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: producto
      });
    } catch (error) {
      console.error('Error creando producto:', error);
      
      // Manejar error de código duplicado (constraint)
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'El código del producto ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al crear producto',
        error: error.message
      });
    }
  }

  // PUT /api/productos/:id - Actualizar producto
  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Errores de validación',
          errors: errors.array()
        });
      }

      const { id } = req.params;
      const { codigo } = req.body;

      // Verificar que el producto existe
      const existing = await ProductoModel.getById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar código duplicado si se cambió
      if (codigo && codigo !== existing.codigo) {
        const exists = await ProductoModel.codigoExists(codigo, id);
        if (exists) {
          return res.status(400).json({
            success: false,
            message: `Ya existe otro producto con el código: ${codigo}`
          });
        }
      }

      // Pasar el precio anterior para detectar cambios
      const producto = await ProductoModel.update(id, req.body, existing.precio);

      // Avisar a la web si cambió precio, nombre o se quedó sin stock / volvió a tener
      webSync.compararYEncolar([existing]);
      
      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: producto
      });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'El código del producto ya existe'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error al actualizar producto',
        error: error.message
      });
    }
  }

  // DELETE /api/productos/:id - Eliminar producto (soft delete)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const hard = req.query.hard === 'true';

      const producto = hard 
        ? await ProductoModel.hardDelete(id)
        : await ProductoModel.delete(id);
      
      if (!producto) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      res.json({
        success: true,
        message: `Producto ${hard ? 'eliminado permanentemente' : 'desactivado'} exitosamente`,
        data: producto
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar producto',
        error: error.message
      });
    }
  }

  // POST /api/productos/bulk - Carga masiva de productos
  static async createBulk(req, res) {
    try {
      const { productos, updateExisting = false } = req.body;

      // Validar que se envió un array
      if (!Array.isArray(productos) || productos.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere un array de productos'
        });
      }

      // Validar límite razonable
      if (productos.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'El límite máximo es 1000 productos por carga'
        });
      }

      const publicadosAntes = updateExisting ? await webSync.getPublicados() : [];
      const resultado = await ProductoModel.createBulk(productos, updateExisting);
      if (publicadosAntes.length > 0) webSync.compararYEncolar(publicadosAntes);

      // Si todos fallaron
      if (resultado.creados === 0 && resultado.actualizados === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo crear ni actualizar ningún producto',
          data: resultado
        });
      }

      // Si algunos fallaron
      if (resultado.errores.length > 0) {
        return res.status(207).json({
          success: true,
          message: `Se procesaron ${resultado.creados + resultado.actualizados} de ${resultado.total} productos`,
          data: resultado
        });
      }

      // Todos exitosos
      res.status(201).json({
        success: true,
        message: `Se procesaron ${resultado.creados + resultado.actualizados} productos exitosamente`,
        data: resultado
      });

    } catch (error) {
      console.error('Error en carga masiva:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la carga masiva',
        error: error.message
      });
    }
  }
}

module.exports = ProductoController;
