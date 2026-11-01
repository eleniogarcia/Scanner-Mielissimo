const express = require('express');
const router = express.Router();
const webSync = require('../services/webSync');
const ProductoModel = require('../models/ProductoModel');

const errorWeb = (res, error, porDefecto) => {
  const status = error instanceof webSync.WebError ? 502 : 500;
  if (status === 500) console.error(porDefecto, error);
  res.status(status).json({ success: false, message: error.message || porDefecto });
};

// GET /api/web/estado — configuración (sin la clave), publicados y pendientes
router.get('/estado', async (req, res) => {
  try {
    res.json({ success: true, data: await webSync.getEstado() });
  } catch (error) {
    errorWeb(res, error, 'Error al obtener el estado de la web');
  }
});

// PUT /api/web/config { url, clave }
router.put('/config', async (req, res) => {
  try {
    const { url, clave } = req.body || {};
    if (url !== undefined && url !== '' && !/^https?:\/\/[^\s]+$/i.test(String(url).trim())) {
      return res.status(400).json({ success: false, message: 'La dirección tiene que empezar con https://' });
    }
    await webSync.setConfig({ url, clave });
    res.json({ success: true, data: await webSync.getEstado() });
  } catch (error) {
    errorWeb(res, error, 'Error al guardar la configuración');
  }
});

// POST /api/web/probar { url?, clave? } — prueba con los datos mandados o con los guardados
router.post('/probar', async (req, res) => {
  try {
    await webSync.probarConexion(req.body || {});
    res.json({ success: true, message: 'Conexión con la web OK' });
  } catch (error) {
    errorWeb(res, error, 'No se pudo conectar con la web');
  }
});

// GET /api/web/categorias — categorías de la web para elegir al publicar
router.get('/categorias', async (req, res) => {
  try {
    res.json({ success: true, data: await webSync.getCategorias() });
  } catch (error) {
    errorWeb(res, error, 'No se pudieron traer las categorías de la web');
  }
});

// POST /api/web/sincronizar — mandar ya los pendientes
router.post('/sincronizar', async (req, res) => {
  try {
    await webSync.procesarCola();
    res.json({ success: true, data: await webSync.getEstado() });
  } catch (error) {
    errorWeb(res, error, 'Error al sincronizar');
  }
});

// POST /api/web/publicar/:productoId { categoria_id } — publicar un producto que ya existe
router.post('/publicar/:productoId', async (req, res) => {
  try {
    const producto = await ProductoModel.getById(parseInt(req.params.productoId));
    if (!producto) return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    if (producto.web_producto_id) {
      return res.status(409).json({ success: false, message: 'Este producto ya está publicado en la web' });
    }
    await webSync.encolarCrear(producto.id, req.body?.categoria_id ? parseInt(req.body.categoria_id) : null);
    res.json({ success: true, message: 'Se está publicando en la web' });
  } catch (error) {
    errorWeb(res, error, 'Error al publicar en la web');
  }
});

module.exports = router;
