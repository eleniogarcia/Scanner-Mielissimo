# 📚 Documentación de la API

Base URL: `http://localhost:3000/api`

## 📦 Productos

### Listar Todos los Productos

```http
GET /productos
```

**Query Parameters:**
- `includeInactive` (boolean, opcional) - Incluir productos inactivos

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "nombre": "Coca Cola 500ml",
      "codigo": "7501234567890",
      "precio": "15.00",
      "stock": 100,
      "activo": true,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### Obtener Producto por ID

```http
GET /productos/:id
```

**Parámetros de ruta:**
- `id` (integer) - ID del producto

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Coca Cola 500ml",
    "codigo": "7501234567890",
    "precio": "15.00",
    "stock": 100,
    "activo": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errores:**
- `404` - Producto no encontrado

---

### Buscar Producto por Código (Escaneo)

```http
GET /productos/codigo/:codigo
```

**Parámetros de ruta:**
- `codigo` (string) - Código del producto (barras/QR)

**Uso:** Este endpoint se utiliza para buscar productos al escanear códigos.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Coca Cola 500ml",
    "codigo": "7501234567890",
    "precio": "15.00",
    "stock": 100,
    "activo": true
  }
}
```

**Errores:**
- `404` - Producto no encontrado con ese código
```json
{
  "success": false,
  "message": "Producto no encontrado con código: 7501234567890",
  "codigo": "7501234567890"
}
```

---

### Buscar Productos (Texto)

```http
GET /productos/search?q=query
```

**Query Parameters:**
- `q` (string, requerido) - Término de búsqueda

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "nombre": "Coca Cola 500ml",
      "codigo": "7501234567890",
      "precio": "15.00",
      "stock": 100,
      "activo": true
    }
  ]
}
```

---

### Crear Producto

```http
POST /productos
```

**Body (JSON):**
```json
{
  "nombre": "Coca Cola 500ml",
  "codigo": "7501234567890",
  "precio": 15.00,
  "stock": 100
}
```

**Campos:**
- `nombre` (string, requerido) - Nombre del producto (2-255 caracteres)
- `codigo` (string, opcional) - Código único del producto
- `precio` (number, requerido) - Precio mayor o igual a 0
- `stock` (integer, opcional) - Cantidad en inventario (default: 0)

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Producto creado exitosamente",
  "data": {
    "id": 1,
    "nombre": "Coca Cola 500ml",
    "codigo": "7501234567890",
    "precio": "15.00",
    "stock": 100,
    "activo": true,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errores:**
- `400` - Validación fallida o código duplicado
```json
{
  "success": false,
  "message": "Ya existe un producto con el código: 7501234567890"
}
```

---

### Actualizar Producto

```http
PUT /productos/:id
```

**Parámetros de ruta:**
- `id` (integer) - ID del producto

**Body (JSON):**
```json
{
  "nombre": "Coca Cola 600ml",
  "codigo": "7501234567891",
  "precio": 18.00,
  "stock": 150,
  "activo": true
}
```

**Campos:** Todos opcionales, solo enviar los que se desean actualizar.

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto actualizado exitosamente",
  "data": {
    "id": 1,
    "nombre": "Coca Cola 600ml",
    "codigo": "7501234567891",
    "precio": "18.00",
    "stock": 150,
    "activo": true,
    "updated_at": "2024-01-15T11:00:00.000Z"
  }
}
```

**Errores:**
- `404` - Producto no encontrado
- `400` - Código duplicado

---

### Eliminar Producto

```http
DELETE /productos/:id
```

**Parámetros de ruta:**
- `id` (integer) - ID del producto

**Query Parameters:**
- `hard` (boolean, opcional) - true para eliminación permanente, false para desactivar (default: false)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Producto desactivado exitosamente",
  "data": {
    "id": 1,
    "activo": false
  }
}
```

**Errores:**
- `404` - Producto no encontrado

---

## 🛒 Ventas

### Crear Venta

```http
POST /ventas
```

**Body (JSON):**
```json
{
  "items": [
    {
      "producto_id": 1,
      "cantidad": 2
    },
    {
      "producto_id": 3,
      "cantidad": 1
    }
  ],
  "metodo_pago": "efectivo"
}
```

**Campos:**
- `items` (array, requerido) - Lista de productos a vender
  - `producto_id` (integer, requerido) - ID del producto
  - `cantidad` (integer, requerido) - Cantidad a vender (mínimo 1)
- `metodo_pago` (string, opcional) - Método de pago: "efectivo", "tarjeta", "transferencia", "otro"

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Venta realizada exitosamente",
  "data": {
    "id": 1,
    "total": "52.00",
    "items_count": 3,
    "metodo_pago": "efectivo",
    "created_at": "2024-01-15T12:00:00.000Z",
    "items": [
      {
        "id": 1,
        "venta_id": 1,
        "producto_id": 1,
        "producto_nombre": "Coca Cola 500ml",
        "producto_codigo": "7501234567890",
        "cantidad": 2,
        "precio_unitario": "15.00",
        "subtotal": "30.00"
      }
    ]
  }
}
```

**Validaciones:**
- Verifica que todos los productos existan
- Verifica que los productos estén activos
- Verifica stock suficiente
- Actualiza el stock automáticamente

**Errores:**
- `400` - Validación fallida
```json
{
  "success": false,
  "message": "Stock insuficiente para \"Coca Cola 500ml\". Disponible: 5, Solicitado: 10"
}
```

---

### Listar Ventas

```http
GET /ventas
```

**Query Parameters:**
- `limit` (integer, opcional) - Número de resultados (default: 50)
- `offset` (integer, opcional) - Desplazamiento para paginación (default: 0)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "total": "52.00",
      "items_count": 3,
      "metodo_pago": "efectivo",
      "created_at": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

---

### Obtener Venta por ID

```http
GET /ventas/:id
```

**Parámetros de ruta:**
- `id` (integer) - ID de la venta

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "total": "52.00",
    "items_count": 3,
    "metodo_pago": "efectivo",
    "created_at": "2024-01-15T12:00:00.000Z",
    "items": [
      {
        "id": 1,
        "venta_id": 1,
        "producto_id": 1,
        "producto_nombre": "Coca Cola 500ml",
        "producto_codigo": "7501234567890",
        "cantidad": 2,
        "precio_unitario": "15.00",
        "subtotal": "30.00"
      }
    ]
  }
}
```

**Errores:**
- `404` - Venta no encontrada

---

### Ventas de Hoy

```http
GET /ventas/today
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "total": "52.00",
      "items_count": 3,
      "total_items": 3,
      "metodo_pago": "efectivo",
      "created_at": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

---

### Estadísticas de Ventas

```http
GET /ventas/stats
```

**Query Parameters:**
- `startDate` (date, opcional) - Fecha de inicio (ISO 8601)
- `endDate` (date, opcional) - Fecha de fin (ISO 8601)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "total_ventas": 150,
    "ingresos_totales": "45230.50",
    "ticket_promedio": "301.54",
    "productos_vendidos": 523
  }
}
```

---

### Productos Más Vendidos

```http
GET /ventas/top-products
```

**Query Parameters:**
- `limit` (integer, opcional) - Número de productos a retornar (default: 10)

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "producto_nombre": "Coca Cola 500ml",
      "producto_codigo": "7501234567890",
      "total_vendido": 250,
      "veces_vendido": 120,
      "ingresos_generados": "3750.00"
    }
  ]
}
```

---

## 🔒 Códigos de Estado HTTP

| Código | Significado               |
|--------|---------------------------|
| 200    | Éxito                     |
| 201    | Creado exitosamente       |
| 400    | Error de validación       |
| 404    | Recurso no encontrado     |
| 500    | Error interno del servidor|

---

## 📝 Notas Importantes

### Manejo de Códigos
- Los códigos son **case-sensitive**
- Deben ser únicos en la base de datos
- Pueden ser NULL (productos sin código)
- Se buscan solo en productos activos

### Transacciones de Venta
- Las ventas son transaccionales (todo o nada)
- El stock se actualiza automáticamente
- No se pueden modificar o eliminar ventas registradas
- Se guarda una copia de los datos del producto al momento de la venta

### Validaciones
- Todos los campos requeridos deben estar presentes
- Los precios deben ser >= 0
- El stock debe ser >= 0
- Las cantidades deben ser > 0

---

## 🧪 Ejemplos con cURL

### Crear Producto
```bash
curl -X POST http://localhost:3000/api/productos \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Producto de Prueba",
    "codigo": "TEST123",
    "precio": 25.50,
    "stock": 50
  }'
```

### Buscar por Código
```bash
curl http://localhost:3000/api/productos/codigo/TEST123
```

### Registrar Venta
```bash
curl -X POST http://localhost:3000/api/ventas \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"producto_id": 1, "cantidad": 2}
    ],
    "metodo_pago": "efectivo"
  }'
```

---

Para más información, consulta el [README principal](../README.md).
