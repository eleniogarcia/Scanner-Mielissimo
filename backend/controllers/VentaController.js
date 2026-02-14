const VentaModel = require('../models/VentaModel');
const ProductoModel = require('../models/ProductoModel');
const { validationResult } = require('express-validator');

class VentaController {
  
  // POST /api/ventas - Crear nueva venta
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

      const { items, metodo_pago } = req.body;

      // Validar que hay items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La venta debe tener al menos un producto'
        });
      }

      // Validar y preparar items
      let total = 0;
      let itemsCount = 0;
      const ventaItems = [];

      for (const item of items) {
        // Verificar que el producto existe
        const producto = await ProductoModel.getById(item.producto_id);
        
        if (!producto) {
          return res.status(400).json({
            success: false,
            message: `Producto con ID ${item.producto_id} no encontrado`
          });
        }

        if (!producto.activo) {
          return res.status(400).json({
            success: false,
            message: `El producto "${producto.nombre}" no está activo`
          });
        }

        const subtotal = parseFloat(producto.precio) * parseInt(item.cantidad);
        
        ventaItems.push({
          producto_id: producto.id,
          producto_nombre: producto.nombre,
          producto_codigo: producto.codigo,
          cantidad: parseInt(item.cantidad),
          precio_unitario: parseFloat(producto.precio),
          subtotal: subtotal
        });

        total += subtotal;
        itemsCount += parseInt(item.cantidad);
      }

      // Crear venta
      const ventaData = {
        total: parseFloat(total.toFixed(2)),
        items_count: itemsCount,
        metodo_pago: metodo_pago || 'efectivo'
      };

      const venta = await VentaModel.create(ventaData, ventaItems);

      res.status(201).json({
        success: true,
        message: 'Venta realizada exitosamente',
        data: venta
      });

    } catch (error) {
      console.error('Error creando venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al procesar la venta',
        error: error.message
      });
    }
  }

  // GET /api/ventas - Obtener todas las ventas
  static async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const ventas = await VentaModel.getAll(limit, offset);
      
      res.json({
        success: true,
        count: ventas.length,
        data: ventas
      });
    } catch (error) {
      console.error('Error obteniendo ventas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas',
        error: error.message
      });
    }
  }

  // GET /api/ventas/:id - Obtener venta por ID
  static async getById(req, res) {
    try {
      const venta = await VentaModel.getById(req.params.id);
      
      if (!venta) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      res.json({
        success: true,
        data: venta
      });
    } catch (error) {
      console.error('Error obteniendo venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener venta',
        error: error.message
      });
    }
  }

  // GET /api/ventas/today - Obtener ventas de hoy
  static async getToday(req, res) {
    try {
      const ventas = await VentaModel.getToday();
      
      res.json({
        success: true,
        count: ventas.length,
        data: ventas
      });
    } catch (error) {
      console.error('Error obteniendo ventas de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas de hoy',
        error: error.message
      });
    }
  }

  // GET /api/ventas/stats - Obtener estadísticas
  static async getStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const stats = await VentaModel.getStats(startDate, endDate);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }

  // GET /api/ventas/top-products - Productos más vendidos
  static async getTopProducts(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const productos = await VentaModel.getTopProducts(limit);
      
      res.json({
        success: true,
        count: productos.length,
        data: productos
      });
    } catch (error) {
      console.error('Error obteniendo productos más vendidos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener productos más vendidos',
        error: error.message
      });
    }
  }

  // DELETE /api/ventas/:id - Eliminar venta
  static async delete(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar que la venta existe
      const venta = await VentaModel.getById(id);
      
      if (!venta) {
        return res.status(404).json({
          success: false,
          message: 'Venta no encontrada'
        });
      }

      // Eliminar la venta (esto también eliminará los items por CASCADE)
      await VentaModel.delete(id);

      res.json({
        success: true,
        message: 'Venta eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar venta',
        error: error.message
      });
    }
  }
}

module.exports = VentaController;
