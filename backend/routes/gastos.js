const express = require('express');
const router = express.Router();
const GastoController = require('../controllers/GastoController');

router.get('/', GastoController.getByMes);
router.get('/categorias', GastoController.getCategorias);
router.get('/balance', GastoController.getBalance);
router.get('/balance/meses', GastoController.getBalanceMeses);
router.post('/', GastoController.create);
router.delete('/:id', GastoController.delete);

module.exports = router;
