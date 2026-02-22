# Guía de Facturación Electrónica - Factura A Argentina

## 📋 Cómo Generar una Factura A

### Paso 1: Acceder a la Sección de Facturación
1. Ve a la página de **Ventas** en el sistema
2. Haz clic en la pestaña **💰 Facturación**

### Paso 2: Seleccionar el Período
Elige el período de ventas que deseas facturar:
- **Hoy**: Ventas del día actual
- **Última Semana**: Ventas de los últimos 7 días
- **Último Mes**: Ventas de los últimos 30 días
- **Personalizado**: Selecciona un rango de fechas específico

### Paso 3: Ver las Estadísticas
El sistema mostrará automáticamente:
- 💵 **Ingresos Totales**: Total vendido en el período
- 📦 **Costos Totales**: Costos de los productos vendidos
- 💰 **Ganancia Neta**: Ingresos - Costos
- 📊 **Margen de Ganancia**: Porcentaje de ganancia
- 🛒 **Ventas Realizadas**: Número de transacciones
- 📦 **Productos Vendidos**: Cantidad total de productos

### Paso 4: Generar la Factura
1. Haz clic en el botón **📄 Generar Factura A**
2. Se abrirá un formulario solicitando datos obligatorios:

#### Datos de la Empresa (Emisor) - Obligatorios
- ✅ **Razón Social**: Nombre legal de tu empresa
- ✅ **CUIT**: CUIT de tu empresa (formato: 20-12345678-3)
- Domicilio
- Localidad
- Provincia
- Teléfono (código de área + número)
- Ingresos Brutos
- Inicio de Actividades
- Punto de Venta (ej: 0001)
- Número de Factura (ej: 00000001)
- CAE (Código de Autorización Electrónica) - opcional
- Vencimiento de CAE - opcional

#### Datos del Cliente (Receptor) - Obligatorios
- ✅ **Razón Social**: Nombre legal del cliente
- ✅ **CUIT**: CUIT del cliente (formato: 20-98765432-1)
- Domicilio
- Localidad
- Provincia
- Teléfono
- **Condición IVA**: 
  - Responsable Inscripto
  - Monotributista
  - Consumidor Final
  - Exento
- **Condición de Venta**:
  - Contado
  - Cuenta Corriente
  - Tarjeta de Crédito

### Paso 5: Vista Previa e Impresión
1. Una vez completado el formulario, haz clic en **Generar Factura**
2. Se mostrará una vista previa de la factura con formato oficial AFIP
3. La factura incluye:
   - Encabezado con letra "A" y código 01
   - Número de factura formato XXXX-XXXXXXXX
   - Datos fiscales de tu empresa
   - Datos del cliente
   - Detalle de productos vendidos con:
     - Código
     - Descripción
     - Cantidad
     - Precio unitario
     - Alícuota IVA (21%)
     - Importe
   - Totales calculados:
     - Importe Neto Gravado
     - IVA 21%
     - Total
   - Pie con CAE y código QR (simulado)

### Paso 6: Imprimir o Compartir
- Haz clic en **🖨️ Imprimir** para imprimir la factura
- La factura se imprimirá en formato A4 con el diseño oficial
- Puedes usar "Guardar como PDF" desde el diálogo de impresión para compartir digitalmente

## ⚠️ Importante

### Requisitos Previos
- **Agregar Costo a los Productos**: Para calcular correctamente las ganancias, asegúrate de ingresar el **costo** de cada producto en la sección de Productos
- Sin el costo, las ganancias no se calcularán correctamente

### Sobre el CAE (Código de Autorización Electrónica)
- El CAE es un código que debe obtenerse de AFIP para validar la factura
- Este sistema genera el **formato visual** de la factura
- Para facturación electrónica oficial, deberás integrar con los servicios web de AFIP
- El CAE es opcional para fines de demostración o uso interno

### Validez Legal
- Esta factura es un **formato visual** válido para uso interno
- Para facturación electrónica oficial ante AFIP, necesitarás:
  - Integración con Web Services de AFIP
  - Certificado digital
  - Clave fiscal nivel 3 o superior
  - Homologación del sistema

## 💡 Consejos

1. **Guarda una copia**: Los datos de la empresa se pueden guardar en plantillas para no tener que completarlos cada vez
2. **Numeración secuencial**: Mantén un registro del último número de factura utilizado
3. **Punto de venta**: Si tienes varios puntos de venta, asigna un número a cada uno (0001, 0002, etc.)
4. **Consolidación de productos**: La factura agrupa automáticamente productos iguales vendidos en diferentes transacciones del período

## 🔧 Solución de Problemas

### No aparecen las ganancias
- Verifica que los productos tengan el campo **costo** completado
- Asegúrate de haber seleccionado un período con ventas realizadas

### La factura no se imprime correctamente
- Verifica que el tamaño de papel esté configurado como A4
- Usa Chrome o Edge para mejores resultados de impresión
- Verifica que los márgenes estén en "Predeterminado" o "Ninguno"

### Error al generar factura
- Completa todos los campos obligatorios marcados con (*)
- Verifica el formato del CUIT: XX-XXXXXXXX-X
- Asegúrate de que haya ventas en el período seleccionado
