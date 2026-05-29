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

      const { items } = req.body;

      // Validar que hay items
      if (!items || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'La venta debe tener al menos un producto'
        });
      }

      // Validar y preparar items — batch fetch solo de items normales (no especiales)
      const idsNormales = items
        .filter(i => !i.es_especial)
        .map(i => parseInt(i.producto_id));
      const productosArr = idsNormales.length > 0
        ? await ProductoModel.getByIds(idsNormales)
        : [];
      const productosMap = new Map(productosArr.map(p => [p.id, p]));

      let total = 0;
      let itemsCount = 0;
      const ventaItems = [];

      for (const item of items) {

        // ── Item especial (Varios): precio y nombre vienen del cliente ──
        if (item.es_especial) {
          const precioUnitario = parseFloat(item.precio_unitario);
          const cantidad = parseInt(item.cantidad);
          if (!item.producto_nombre || isNaN(precioUnitario) || precioUnitario <= 0 || cantidad < 1) {
            return res.status(400).json({
              success: false,
              message: 'Item especial inválido: se requiere producto_nombre, precio_unitario > 0 y cantidad >= 1'
            });
          }
          const subtotal = parseFloat((precioUnitario * cantidad).toFixed(2));
          ventaItems.push({
            producto_id: null,
            producto_nombre: item.producto_nombre,
            producto_codigo: null,
            cantidad,
            precio_unitario: precioUnitario,
            subtotal
          });
          total += subtotal;
          itemsCount += cantidad;
          continue;
        }

        // ── Item normal: validar contra la base de datos ──
        const producto = productosMap.get(parseInt(item.producto_id));

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
        items_count: itemsCount
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

  // GET /api/ventas - Obtener todas las ventas con filtros
  static async getAll(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const includeItems = req.query.includeItems === 'true';
      
      // Filtros de fecha
      const filtros = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        periodo: req.query.periodo // 'hoy', 'semana', 'mes'
      };
      
      const ventas = await VentaModel.getAll(limit, offset, filtros, { includeItems });
      
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
      const ventas = await VentaModel.getToday({ includeItems: req.query.includeItems === 'true' });
      
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

  // GET /api/ventas/weekly - Obtener ventas de la semana
  static async getWeekly(req, res) {
    try {
      const ventas = await VentaModel.getWeekly({ includeItems: req.query.includeItems === 'true' });
      
      res.json({
        success: true,
        count: ventas.length,
        data: ventas
      });
    } catch (error) {
      console.error('Error obteniendo ventas de la semana:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas de la semana',
        error: error.message
      });
    }
  }

  // GET /api/ventas/monthly - Obtener ventas del mes
  static async getMonthly(req, res) {
    try {
      const ventas = await VentaModel.getMonthly({ includeItems: req.query.includeItems === 'true' });
      
      res.json({
        success: true,
        count: ventas.length,
        data: ventas
      });
    } catch (error) {
      console.error('Error obteniendo ventas del mes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ventas del mes',
        error: error.message
      });
    }
  }

  // GET /api/ventas/ganancias - Obtener ganancias con filtros
  static async getGanancias(req, res) {
    try {
      const filtros = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        periodo: req.query.periodo // 'hoy', 'semana', 'mes'
      };
      
      const ganancias = await VentaModel.getGanancias(filtros);
      
      res.json({
        success: true,
        data: ganancias
      });
    } catch (error) {
      console.error('Error obteniendo ganancias:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ganancias',
        error: error.message
      });
    }
  }

  // GET /api/ventas/ganancias/hoy - Ganancias de hoy
  static async getGananciasHoy(req, res) {
    try {
      const ganancias = await VentaModel.getGananciasHoy();
      
      res.json({
        success: true,
        data: ganancias
      });
    } catch (error) {
      console.error('Error obteniendo ganancias de hoy:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ganancias de hoy',
        error: error.message
      });
    }
  }

  // GET /api/ventas/ganancias/semana - Ganancias de la semana
  static async getGananciasSemanales(req, res) {
    try {
      const ganancias = await VentaModel.getGananciasSemanales();
      
      res.json({
        success: true,
        data: ganancias
      });
    } catch (error) {
      console.error('Error obteniendo ganancias semanales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ganancias semanales',
        error: error.message
      });
    }
  }

  // GET /api/ventas/ganancias/mes - Ganancias del mes
  static async getGananciasMensuales(req, res) {
    try {
      const ganancias = await VentaModel.getGananciasMensuales();
      
      res.json({
        success: true,
        data: ganancias
      });
    } catch (error) {
      console.error('Error obteniendo ganancias mensuales:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener ganancias mensuales',
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
