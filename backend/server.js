require('dotenv').config();
const express = require('express');
const cors = require('cors');

const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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

// Start server
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

module.exports = app;
