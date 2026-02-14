const ProductoModel = require('../models/ProductoModel');
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

  // GET /api/productos/codigo/:codigo - Buscar por código o nombre (para escaneo)
  static async getByCodigo(req, res) {
    try {
      const codigo = req.params.codigo;
      
      // Primero intentar búsqueda exacta por código
      let producto = await ProductoModel.getByCodigo(codigo);
      
      // Si no encuentra por código, buscar por nombre
      if (!producto) {
        const resultados = await ProductoModel.search(codigo);
        
        // Si encuentra resultados, tomar el primero
        if (resultados.length > 0) {
          producto = resultados[0];
        }
      }
      
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

      const producto = await ProductoModel.update(id, req.body);
      
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
      const { productos } = req.body;

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

      const resultado = await ProductoModel.createBulk(productos);

      // Si todos fallaron
      if (resultado.creados === 0) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo crear ningún producto',
          data: resultado
        });
      }

      // Si algunos fallaron
      if (resultado.errores.length > 0) {
        return res.status(207).json({
          success: true,
          message: `Se crearon ${resultado.creados} de ${resultado.total} productos`,
          data: resultado
        });
      }

      // Todos exitosos
      res.status(201).json({
        success: true,
        message: `Se crearon ${resultado.creados} productos exitosamente`,
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
