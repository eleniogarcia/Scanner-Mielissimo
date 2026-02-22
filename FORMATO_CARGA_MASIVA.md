# Formato de Carga Masiva de Productos

## Estructura JSON Actualizada

La carga masiva de productos acepta un array de objetos JSON con la siguiente estructura:

### Campos Disponibles

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | String | ✅ Sí | Nombre del producto |
| `precio` | Number | ✅ Sí | Precio del producto (ejemplo: 25.50) |
| `codigo` | String | ❌ No | Código de barras o QR del producto |
| `stock` | Number | ❌ No | Cantidad en inventario (default: 0) |
| `fabricante` | String | ❌ No | Nombre del fabricante o marca |

## Ejemplo de Formato

```json
[
  {
    "nombre": "Coca Cola 500ml",
    "codigo": "7501234567890",
    "precio": 15.00,
    "stock": 100,
    "fabricante": "Coca-Cola Company"
  },
  {
    "nombre": "Pan Integral",
    "codigo": "7501234567891",
    "precio": 32.50,
    "stock": 50,
    "fabricante": "Bimbo"
  },
  {
    "nombre": "Leche Lala 1L",
    "codigo": "7501234567892",
    "precio": 22.00,
    "stock": 75
  },
  {
    "nombre": "Producto sin código",
    "precio": 10.50,
    "stock": 20,
    "fabricante": "Fabricante Genérico"
  },
  {
    "nombre": "Producto básico",
    "precio": 5.00
  }
]
```

## Validaciones

- **Máximo 1000 productos** por carga
- El campo `nombre` no puede estar vacío
- El campo `precio` debe ser un número mayor o igual a 0
- El campo `stock` debe ser un número entero mayor o igual a 0
- El campo `codigo` debe ser único (no puede haber duplicados)
- Los campos `codigo`, `stock` y `fabricante` son opcionales

## Respuesta de la API

La API responderá con:

```json
{
  "success": true,
  "message": "Se crearon X productos exitosamente",
  "data": {
    "exitosos": [...],
    "errores": [...],
    "total": 5,
    "creados": 4,
    "fallidos": 1
  }
}
```

### Casos de Error Comunes

1. **Código duplicado**: Si un código ya existe en la base de datos
2. **Campos faltantes**: Si falta `nombre` o `precio`
3. **Formato inválido**: Si el JSON no es válido o no es un array

## Notas Importantes

- Los productos se crean con estado `activo: true` por defecto
- Si se proporciona un `codigo`, se validará que no exista en la base de datos
- Si no se proporciona `stock`, se establecerá en 0
- El campo `fabricante` es completamente opcional y puede omitirse
- Al actualizar el precio de un producto existente, se registrará automáticamente la fecha de última actualización de precio

## Actualización de Precios

Cuando se actualiza el precio de un producto:
- Se guarda automáticamente la fecha y hora en el campo `precio_actualizado_at`
- Este campo se muestra en la interfaz de gestión de productos
- Útil para rastrear cambios de precios y auditorías
