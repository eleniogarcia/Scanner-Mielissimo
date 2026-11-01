const express = require('express');
const router = express.Router();
const GastoController = require('../controllers/GastoController');

router.get('/', GastoController.getByMes);
router.get('/categorias', GastoController.getCategorias);
router.get('/balance', GastoController.getBalance);
router.get('/balance/meses', GastoController.getBalanceMeses);
router.get('/fijos', GastoController.getFijos);
router.post('/fijos', GastoController.createFijo);
router.put('/fijos/:id', GastoController.updateFijo);
router.delete('/fijos/:id', GastoController.deleteFijo);
router.post('/', GastoController.create);
router.put('/:id', GastoController.update);
router.delete('/:id', GastoController.delete);

module.exports = router;
