import React, { useState, useEffect } from 'react';
import { productosAPI } from '../services/api';
import './Productos.css';

const formatFechaVencimiento = (fecha) => {
  if (!fecha) return '-';
  return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString('es-AR');
};

const parseMoney = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const normalized = String(value).replace(',', '.').trim();
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const parseNonNegativeInt = (value, fallback = 0) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
};

function Productos() {
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkJSON, setBulkJSON] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResultado, setBulkResultado] = useState(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    codigo: '',
    precio: '',
    costo: 0,
    stock: 0,
    fabricante: '',
    fecha_vencimiento: '',
    activo: true
  });
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [modalError, setModalError] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  // Modal de confirmación propio (reemplaza window.confirm para no romper el foco en Electron)
  const [confirmModal, setConfirmModal] = useState({ visible: false, mensaje: '', onConfirm: null });

  const mostrarConfirm = (mensaje, onConfirm) => {
    setConfirmModal({ visible: true, mensaje, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ visible: false, mensaje: '', onConfirm: null });
  const productosPorPagina = 10;

  useEffect(() => {
    cargarProductos();
  }, []);

  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // Filtrar productos cuando cambia la búsqueda
  useEffect(() => {
    if (!busqueda.trim()) {
      setProductosFiltrados(productos);
      setPaginaActual(1);
      return;
    }
    
    const termino = busqueda.toLowerCase();
    const filtrados = productos.filter(p => 
      p.nombre.toLowerCase().includes(termino) ||
      (p.codigo && p.codigo.toLowerCase().includes(termino)) ||
      (p.fecha_vencimiento && String(p.fecha_vencimiento).includes(termino)) ||
      p.id.toString().includes(termino)
    );
    setProductosFiltrados(filtrados);
    setPaginaActual(1);
  }, [busqueda, productos]);

  // Calcular productos a mostrar en página actual
  const indexUltimo = paginaActual * productosPorPagina;
  const indexPrimero = indexUltimo - productosPorPagina;
  const productosActuales = productosFiltrados.slice(indexPrimero, indexUltimo);
  const totalPaginas = Math.ceil(productosFiltrados.length / productosPorPagina);

  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cargarProductos = async () => {
    try {
      const response = await productosAPI.getAll(true);
      setProductos(response.data.data);
      setProductosFiltrados(response.data.data);
    } catch (error) {
      mostrarMensaje('error', 'Error al cargar productos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const precioNormalizado = parseMoney(formData.precio);
    const costoNormalizado = parseMoney(formData.costo);

    if (precioNormalizado === null || precioNormalizado < 0) {
      setModalError('El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    const payload = {
      ...formData,
      precio: precioNormalizado,
      costo: costoNormalizado === null ? 0 : costoNormalizado,
      stock: parseNonNegativeInt(formData.stock, 0)
    };
    
    try {
      if (editando) {
        await productosAPI.update(editando.id, payload);
        mostrarMensaje('success', 'Producto actualizado');
      } else {
        await productosAPI.create(payload);
        mostrarMensaje('success', 'Producto creado');
      }
      
      cerrarModal();
      cargarProductos();
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Error al guardar producto';
      if (editando) {
        setModalError(errorMsg);
      } else {
        mostrarMensaje('error', errorMsg);
      }
    }
  };

  const handleEditar = (producto) => {
    setEditando(producto);
    setFormData({
      nombre: producto.nombre,
      codigo: producto.codigo || '',
      precio: producto.precio,
      costo: producto.costo || 0,
      stock: producto.stock || 0,
      fabricante: producto.fabricante || '',
      fecha_vencimiento: producto.fecha_vencimiento ? String(producto.fecha_vencimiento).slice(0, 10) : '',
      activo: producto.activo
    });
    setShowModal(true);
  };

  const handleEliminar = (id, permanente = false) => {
    const msg = permanente 
      ? '⚠️ ¿ELIMINAR PERMANENTEMENTE este producto? Esta acción NO se puede deshacer.' 
      : '¿Desactivar este producto?';
    
    mostrarConfirm(msg, async () => {
      try {
        await productosAPI.delete(id, permanente);
        mostrarMensaje('success', permanente ? 'Producto eliminado permanentemente' : 'Producto desactivado');
        cargarProductos();
      } catch (error) {
        mostrarMensaje('error', 'Error al eliminar producto');
      }
    });
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditando(null);
    setModalError('');
    setFormData({ nombre: '', codigo: '', precio: '', costo: 0, stock: 0, fabricante: '', fecha_vencimiento: '', activo: true });
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    
    setBulkLoading(true);
    setBulkResultado(null);
    
    try {
      // Limpiar y preparar JSON - corregir múltiples arrays concatenados
      let jsonLimpio = bulkJSON.trim();
      
      // Detectar y corregir múltiples arrays concatenados (][)
      // Reemplazar ][ por ,
      jsonLimpio = jsonLimpio.replace(/\]\s*\[/g, ',');
      
      // Parsear JSON
      let productos;
      try {
        productos = JSON.parse(jsonLimpio);
      } catch (error) {
        mostrarMensaje('error', 'JSON inválido. Verifica el formato.');
        setBulkLoading(false);
        return;
      }

      // Validar que sea un array
      if (!Array.isArray(productos)) {
        mostrarMensaje('error', 'El JSON debe ser un array de productos');
        setBulkLoading(false);
        return;
      }

      if (productos.length === 0) {
        mostrarMensaje('error', 'El array está vacío');
        setBulkLoading(false);
        return;
      }

      // Enviar a la API
      const response = await productosAPI.createBulk(productos, updateExisting);
      const resultado = response.data.data;
      
      setBulkResultado(resultado);
      
      if (resultado.creados > 0 || resultado.actualizados > 0) {
        const msg = [];
        if (resultado.creados > 0) msg.push(`${resultado.creados} creados`);
        if (resultado.actualizados > 0) msg.push(`${resultado.actualizados} actualizados`);
        mostrarMensaje('success', `✓ ${msg.join(', ')}`);
        cargarProductos();
      }
      
      if (resultado.errores.length > 0) {
        mostrarMensaje('error', `✗ ${resultado.errores.length} productos fallaron`);
      }
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al procesar carga masiva';
      mostrarMensaje('error', errorMsg);
      console.error(error);
    } finally {
      setBulkLoading(false);
    }
  };

  const cerrarBulkModal = () => {
    setShowBulkModal(false);
    setBulkJSON('');
    setBulkResultado(null);
  };

  const cargarEjemplo = () => {
    const ejemplo = [
      { nombre: 'Ejemplo Producto 1', codigo: '1111111111111', precio: 25.50, costo: 15.00, stock: 100, fabricante: 'Fabricante A' },
      { nombre: 'Ejemplo Producto 2', codigo: '2222222222222', precio: 15.00, costo: 8.00, stock: 50, fecha_vencimiento: '2026-05-10' },
      { nombre: 'Ejemplo Producto 3', precio: 30.75, costo: 20.00, stock: 25, fabricante: 'Fabricante B', fecha_vencimiento: '2026-12-31' }
    ];
    setBulkJSON(JSON.stringify(ejemplo, null, 2));
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Cargando productos...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <h1>Gestión de Productos</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="Buscar por nombre, código o ID..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ width: '300px' }}
          />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nuevo Producto
          </button>
          <button className="btn btn-secondary" onClick={() => setShowBulkModal(true)}>
            Carga Masiva
          </button>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`}>
          {mensaje.texto}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        {busqueda && (
          <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Mostrando {productosFiltrados.length} de {productos.length} productos
          </div>
        )}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Código</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Fabricante</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                    {busqueda ? 'No se encontraron productos' : 'No hay productos registrados'}
                  </td>
                </tr>
              ) : (
                productosActuales.map(producto => (
                  <tr key={producto.id}>
                    <td>{producto.id}</td>
                    <td>
                      <strong>{producto.nombre}</strong>
                      {producto.precio_actualizado_at && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Precio actualizado: {new Date(producto.precio_actualizado_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      )}
                    </td>
                    <td>
                      {producto.codigo ? (
                        <code style={{ fontSize: '0.8125rem' }}>{producto.codigo}</code>
                      ) : (
                        <span className="text-secondary">Sin código</span>
                      )}
                    </td>
                    <td><strong>${parseFloat(producto.precio).toFixed(2)}</strong></td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px',
                        backgroundColor: producto.stock > 10 ? '#d4edda' : producto.stock > 0 ? '#fff3cd' : '#f8d7da',
                        color: producto.stock > 10 ? '#155724' : producto.stock > 0 ? '#856404' : '#721c24',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {producto.stock || 0}
                      </span>
                    </td>
                    <td>
                      {producto.fabricante ? (
                        <span style={{ fontSize: '0.875rem' }}>{producto.fabricante}</span>
                      ) : (
                        <span className="text-secondary">-</span>
                      )}
                    </td>
                    <td>
                      {producto.fecha_vencimiento ? (
                        <span className="badge badge-info">{formatFechaVencimiento(producto.fecha_vencimiento)}</span>
                      ) : (
                        <span className="text-secondary">Sin fecha</span>
                      )}
                    </td>
                    <td>
                      {producto.activo ? (
                        <span className="badge badge-success">Activo</span>
                      ) : (
                        <span className="badge badge-danger">Inactivo</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEditar(producto)}
                        >
                          Editar
                        </button>
                        {producto.activo ? (
                          <>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleEliminar(producto.id, false)}
                            >
                              Desactivar
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleEliminar(producto.id, true)}
                              style={{ backgroundColor: '#8B0000' }}
                              title="Eliminar permanentemente"
                            >
                              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleEliminar(producto.id, true)}
                            style={{ backgroundColor: '#8B0000' }}
                            title="Eliminar permanentemente"
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0 1rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Mostrando {indexPrimero + 1} - {Math.min(indexUltimo, productosFiltrados.length)} de {productosFiltrados.length} productos
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1}
                style={{ opacity: paginaActual === 1 ? 0.5 : 1 }}
              >
                ← Anterior
              </button>
              {[...Array(totalPaginas)].map((_, i) => {
                const pagina = i + 1;
                // Mostrar solo páginas cercanas a la actual
                if (
                  pagina === 1 ||
                  pagina === totalPaginas ||
                  (pagina >= paginaActual - 1 && pagina <= paginaActual + 1)
                ) {
                  return (
                    <button
                      key={pagina}
                      className={`btn btn-sm ${paginaActual === pagina ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => cambiarPagina(pagina)}
                    >
                      {pagina}
                    </button>
                  );
                } else if (pagina === paginaActual - 2 || pagina === paginaActual + 2) {
                  return <span key={pagina} style={{ padding: '0 0.25rem' }}>...</span>;
                }
                return null;
              })}
              <button
                className="btn btn-sm btn-outline"
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas}
                style={{ opacity: paginaActual === totalPaginas ? 0.5 : 1 }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button className="modal-close" onClick={cerrarModal}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {modalError && (
                <div style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
                  ⚠️ {modalError}
                </div>
              )}
              <div className="form-group">
                <label className="label">Nombre *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="label">Código (Código de barras / QR)</label>
                <input
                  type="text"
                  className="input"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Opcional"
                />
                <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                  Dejar vacío si el producto no tiene código
                </p>
              </div>

              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Precio de Venta *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Costo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.costo}
                    onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                    Para calcular ganancias
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Stock</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="label">Fabricante</label>
                <input
                  type="text"
                  className="input"
                  value={formData.fabricante}
                  onChange={(e) => setFormData({ ...formData, fabricante: e.target.value })}
                  placeholder="Opcional"
                />
              </div>

              <div className="form-group">
                <label className="label">Fecha de Vencimiento</label>
                <input
                  type="date"
                  className="input"
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                />
                <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                  Opcional. Si no aplica, dejar vacio.
                </p>
              </div>

              {editando && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    />
                    <span>Producto activo</span>
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editando ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" className="btn btn-outline" onClick={cerrarModal}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Carga Masiva */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={cerrarBulkModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Carga Masiva de Productos</h2>
              <button className="modal-close" onClick={cerrarBulkModal}>✕</button>
            </div>
            
            <form onSubmit={handleBulkSubmit}>
              <div className="form-group">
                <label className="label">Array JSON de Productos</label>
                <textarea
                  className="input"
                  rows="15"
                  value={bulkJSON}
                  onChange={(e) => setBulkJSON(e.target.value)}
                  placeholder='[\n  { "nombre": "Producto 1", "codigo": "123", "precio": 25.50 },\n  { "nombre": "Producto 2", "precio": 15.00 }\n]'
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
                  required
                />
                <p className="text-xs text-secondary" style={{ marginTop: '0.5rem' }}>
                  <strong>Formato:</strong> Array JSON con objetos que contengan: <code>nombre</code> (requerido), 
                  <code>codigo</code> (opcional), <code>precio</code> (requerido), <code>costo</code> (opcional),
                  <code>stock</code> (opcional), <code>fabricante</code> (opcional),
                  <code>fecha_vencimiento</code> (opcional en formato YYYY-MM-DD)
                </p>
                <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>
                  Máximo 1000 productos por carga
                </p>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                  />
                  <span>Actualizar productos existentes (mismo código)</span>
                </label>
                <p className="text-xs text-secondary" style={{ marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                  Si está marcado, los productos con códigos existentes se actualizarán en lugar de generar error
                </p>
              </div>

              {bulkResultado && (
                <div className="bulk-resultado">
                  <div className="alert alert-info">
                    <strong>Resultado de la carga:</strong>
                    <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                      <li>Productos creados: <strong>{bulkResultado.creados}</strong></li>
                      {bulkResultado.actualizados > 0 && (
                        <li>Productos actualizados: <strong>{bulkResultado.actualizados}</strong></li>
                      )}
                      <li>Productos fallidos: <strong>{bulkResultado.fallidos}</strong></li>
                      <li>Total procesados: <strong>{bulkResultado.total}</strong></li>
                    </ul>
                  </div>

                  {bulkResultado.errores.length > 0 && (
                    <div className="alert alert-error" style={{ marginTop: '1rem' }}>
                      <strong>Errores encontrados:</strong>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: '0.5rem' }}>
                        {bulkResultado.errores.slice(0, 10).map((error, idx) => (
                          <div key={idx} style={{ fontSize: '0.8125rem', padding: '0.25rem 0' }}>
                            <strong>Línea {error.indice + 1}:</strong> {error.error}
                            {error.producto && (
                              <div style={{ marginLeft: '1rem', color: 'var(--text-secondary)' }}>
                                {JSON.stringify(error.producto)}
                              </div>
                            )}
                          </div>
                        ))}
                        {bulkResultado.errores.length > 10 && (
                          <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                            ... y {bulkResultado.errores.length - 10} errores más
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={bulkLoading || !bulkJSON.trim()}
                >
                  {bulkLoading ? '⏳ Procesando...' : '🚀 Cargar Productos'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={cargarEjemplo}
                  disabled={bulkLoading}
                >
                  📝 Ejemplo
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={cerrarBulkModal}
                  disabled={bulkLoading}
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de confirmación (reemplaza window.confirm para no romper foco en Electron) */}
      {confirmModal.visible && (
        <div className="modal-overlay" onClick={cerrarConfirm}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirmar acción</h2>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{confirmModal.mensaje}</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={cerrarConfirm}>Cancelar</button>
              <button
                className="btn btn-danger"
                onClick={() => { cerrarConfirm(); confirmModal.onConfirm?.(); }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Productos;