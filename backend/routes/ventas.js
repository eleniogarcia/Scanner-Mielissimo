const express = require('express');
const router = express.Router();
const VentaController = require('../controllers/VentaController');
const { ventaValidation } = require('../middleware/validation');

// Rutas de ventas
router.get('/', VentaController.getAll);
router.get('/today', VentaController.getToday);
router.get('/stats', VentaController.getStats);
router.get('/top-products', VentaController.getTopProducts);
router.get('/:id', VentaController.getById);
router.post('/', ventaValidation.create, VentaController.create);
router.delete('/:id', VentaController.delete);

module.exports = router;
