const express = require('express');
const router = express.Router();
const CajaController = require('../controllers/CajaController');

router.get('/actual', CajaController.getActual);
router.get('/historial', CajaController.getHistorial);
router.post('/abrir', CajaController.abrir);
router.post('/cerrar', CajaController.cerrar);
router.post('/movimientos', CajaController.agregarMovimiento);
router.delete('/movimientos/:id', CajaController.eliminarMovimiento);
router.get('/:id', CajaController.getDetalle);

module.exports = router;
