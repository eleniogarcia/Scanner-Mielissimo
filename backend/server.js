require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const cajaRoutes = require('./routes/caja');
const gastosRoutes = require('./routes/gastos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger middleware (solo errores en producción)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${req.method} ${req.path}`);
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/gastos', gastosRoutes);

// Servir frontend en modo Electron
if (process.env.ELECTRON_MODE) {
  const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
  console.log(`📁 Sirviendo frontend desde: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  // Ruta catch-all para SPA
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Start server (solo si no está en modo Electron)
if (!process.env.ELECTRON_MODE) {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     🏪 Sistema POS API Server         ║
╠════════════════════════════════════════╣
║  Puerto: ${PORT.toString().padEnd(29)}║
║  Entorno: ${(process.env.NODE_ENV || 'development').padEnd(28)}║
║  Fecha: ${new Date().toLocaleDateString().padEnd(30)}║
╚════════════════════════════════════════╝

📡 API disponible en: http://localhost:${PORT}
📋 Health check: http://localhost:${PORT}/health

Endpoints disponibles:
  • GET    /api/productos
  • POST   /api/productos
  • GET    /api/productos/:id
  • PUT    /api/productos/:id
  • DELETE /api/productos/:id
  • GET    /api/productos/codigo/:codigo
  • GET    /api/productos/search?q=query
  
  • GET    /api/ventas
  • POST   /api/ventas
  • GET    /api/ventas/:id
  • GET    /api/ventas/today
  • GET    /api/ventas/stats
  • GET    /api/ventas/top-products
  `);
  });
}

module.exports = app;
