-- ================================================================
-- SCRIPT SQL PARA SUPABASE - SISTEMA POS
-- ================================================================
-- Copia y ejecuta este script completo en Supabase SQL Editor
-- (SQL Editor -> New Query -> Pega esto -> Run)
-- ================================================================

-- Crear tabla de productos
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Crear tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    items JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para productos
DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- DATOS DE PRUEBA (OPCIONAL - Puedes comentar esto si no quieres)
-- ================================================================

INSERT INTO productos (codigo, nombre, precio, activo) VALUES
('7501000111111', 'Coca-Cola 600ml', 15.00, true),
('7501000222222', 'Sabritas Original', 18.50, true),
('7501000333333', 'Agua Ciel 1L', 12.00, true),
('7501000444444', 'Chocoroles', 25.00, true),
('7501000555555', 'Gansito', 14.50, true),
('7501000666666', 'Pepsi 600ml', 14.00, true),
('7501000777777', 'Doritos Nacho', 22.00, true),
('7501000888888', 'Halls Mentol', 8.50, true),
('7501000999999', 'Chicles Trident', 6.00, true),
('7501001000000', 'Chocolate Carlos V', 9.50, true)
ON CONFLICT (codigo) DO NOTHING;

-- ================================================================
-- VERIFICACIÓN
-- ================================================================

-- Verificar que las tablas se crearon
SELECT 'productos' as tabla, COUNT(*) as total FROM productos
UNION ALL
SELECT 'ventas' as tabla, COUNT(*) as total FROM ventas;

-- ================================================================
-- ¡LISTO! Las tablas están creadas
-- ================================================================
