const express = require('express');
const router = express.Router();
const ProductoController = require('../controllers/ProductoController');
const { productoValidation } = require('../middleware/validation');

// Rutas de productos
router.get('/', ProductoController.getAll);
router.get('/search', ProductoController.search);
router.get('/codigo/:codigo', ProductoController.getByCodigo);
router.get('/:id', ProductoController.getById);
router.post('/', productoValidation.create, ProductoController.create);
router.post('/bulk', ProductoController.createBulk); // Carga masiva
router.put('/:id', productoValidation.update, ProductoController.update);
router.delete('/:id', ProductoController.delete);

module.exports = router;
