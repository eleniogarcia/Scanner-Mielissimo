const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/VentaController');
const { ventaValidation } = require('../middleware/validation');

// Rutas de ventas
router.get('/', VentaController.getAll);
router.get('/today', VentaController.getToday);
router.get('/weekly', VentaController.getWeekly);
router.get('/monthly', VentaController.getMonthly);
router.get('/ganancias', VentaController.getGanancias);
router.get('/ganancias/hoy', VentaController.getGananciasHoy);
router.get('/ganancias/semana', VentaController.getGananciasSemanales);
router.get('/ganancias/mes', VentaController.getGananciasMensuales);
router.get('/stats', VentaController.getStats);
router.get('/top-products', VentaController.getTopProducts);
router.get('/:id', VentaController.getById);
router.post('/', ventaValidation.create, VentaController.create);
router.delete('/:id', VentaController.delete);

module.exports = router;
