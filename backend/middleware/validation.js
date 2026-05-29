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
      .toFloat(),

    body('fecha_vencimiento')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601({ strict: true, strictSeparator: true }).withMessage('La fecha de vencimiento debe tener formato YYYY-MM-DD')
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
      .toBoolean(),

    body('fecha_vencimiento')
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601({ strict: true, strictSeparator: true }).withMessage('La fecha de vencimiento debe tener formato YYYY-MM-DD')
  ]
};

const ventaValidation = {
  create: [
    body('items')
      .isArray({ min: 1 }).withMessage('La venta debe tener al menos un producto'),

    // producto_id: requerido solo si NO es item especial
    body('items.*.producto_id')
      .if((value, { req, path }) => {
        const idx = parseInt(path.match(/\d+/)?.[0]);
        const item = req.body.items?.[idx];
        return !item?.es_especial;
      })
      .notEmpty().withMessage('El ID del producto es requerido')
      .isInt({ min: 1 }).withMessage('El ID del producto debe ser un número válido')
      .toInt(),

    body('items.*.cantidad')
      .notEmpty().withMessage('La cantidad es requerida')
      .isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1')
      .toInt(),

    // precio_unitario requerido solo para items especiales
    body('items.*.precio_unitario')
      .if((value, { req, path }) => {
        const idx = parseInt(path.match(/\d+/)?.[0]);
        return req.body.items?.[idx]?.es_especial;
      })
      .notEmpty().withMessage('El precio es requerido para items especiales')
      .isFloat({ min: 0.01 }).withMessage('El precio debe ser mayor a 0')
      .toFloat(),
  ]
};

module.exports = {
  productoValidation,
  ventaValidation
};
