const { body } = require('express-validator');

const productoValidation = {
  create: [
    body('nombre')
      .trim()
      .notEmpty().withMessage('El nombre es requerido')
      .isLength({ min: 2, max: 255 }).withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    
    body('codigo')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 255 }).withMessage('El código no puede exceder 255 caracteres'),
    
    body('precio')
      .notEmpty().withMessage('El precio es requerido')
      .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo')
      .toFloat()
  ],

  update: [
    body('nombre')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isLength({ min: 2, max: 255 }).withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    
    body('codigo')
      .optional({ nullable: true, checkFalsy: true })
      .trim()
      .isLength({ max: 255 }).withMessage('El código no puede exceder 255 caracteres'),
    
    body('precio')
      .optional()
      .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo')
      .toFloat(),
    
    body('activo')
      .optional()
      .isBoolean().withMessage('Activo debe ser verdadero o falso')
      .toBoolean()
  ]
};

const ventaValidation = {
  create: [
    body('items')
      .isArray({ min: 1 }).withMessage('La venta debe tener al menos un producto'),
    
    body('items.*.producto_id')
      .notEmpty().withMessage('El ID del producto es requerido')
      .isInt({ min: 1 }).withMessage('El ID del producto debe ser un número válido')
      .toInt(),
    
    body('items.*.cantidad')
      .notEmpty().withMessage('La cantidad es requerida')
      .isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1')
      .toInt(),
    
    body('metodo_pago')
      .optional()
      .trim()
      .isIn(['efectivo', 'tarjeta', 'transferencia', 'otro'])
      .withMessage('Método de pago inválido')
  ]
};

module.exports = {
  productoValidation,
  ventaValidation
};
