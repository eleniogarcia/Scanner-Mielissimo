import React, { useState, useEffect } from 'react';
import { ventasAPI } from '../services/api';
import './Ventas.css';

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas'); // todas, hoy, estadisticas
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    cargarDatos();
  }, [tab]);

  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (tab === 'todas') {
        const response = await ventasAPI.getAll(100, 0);
        setVentas(response.data.data);
      } else if (tab === 'hoy') {
        const response = await ventasAPI.getToday();
        setVentas(response.data.data);
      } else if (tab === 'estadisticas') {
        const response = await ventasAPI.getStats();
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (ventaId) => {
    try {
      const response = await ventasAPI.getById(ventaId);
      setVentaSeleccionada(response.data.data);
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    }
  };

  const eliminarVenta = async (ventaId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await ventasAPI.delete(ventaId);
      setMensaje({ tipo: 'success', texto: 'Venta eliminada exitosamente' });
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar venta:', error);
      setMensaje({ tipo: 'error', texto: 'Error al eliminar la venta' });
    }
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <h1 className="page-title">📊 Historial de Ventas</h1>

      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${tab === 'todas' ? 'active' : ''}`}
          onClick={() => setTab('todas')}
        >
          Todas las Ventas
        </button>
        <button
          className={`tab ${tab === 'hoy' ? 'active' : ''}`}
          onClick={() => setTab('hoy')}
        >
          Ventas de Hoy
        </button>
        <button
          className={`tab ${tab === 'estadisticas' ? 'active' : ''}`}
          onClick={() => setTab('estadisticas')}
        >
          Estadísticas
        </button>
      </div>

      {/* Contenido según tab */}
      {(tab === 'todas' || tab === 'hoy') && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Método Pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                      No hay ventas registradas
                    </td>
                  </tr>
                ) : (
                  ventas.map(venta => (
                    <tr key={venta.id}>
                      <td><strong>#{venta.id}</strong></td>
                      <td>{formatearFecha(venta.created_at)}</td>
                      <td>{venta.items_count}</td>
                      <td><strong className="text-success">${parseFloat(venta.total).toFixed(2)}</strong></td>
                      <td>
                        <span className="badge badge-info">
                          {venta.metodo_pago || 'Efectivo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => verDetalle(venta.id)}
                          >
                            Ver Detalle
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => eliminarVenta(venta.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'estadisticas' && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${parseFloat(stats.ingresos_totales).toFixed(2)}</div>
            <div className="stat-label">Ingresos Totales</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🛒</div>
            <div className="stat-value">{stats.total_ventas}</div>
            <div className="stat-label">Ventas Realizadas</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📦</div>
            <div className="stat-value">{stats.productos_vendidos}</div>
            <div className="stat-label">Productos Vendidos</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-value">${parseFloat(stats.ticket_promedio).toFixed(2)}</div>
            <div className="stat-label">Ticket Promedio</div>
          </div>
        </div>
      )}

      {/* Modal de detalle */}
      {ventaSeleccionada && (
        <div className="modal-overlay" onClick={() => setVentaSeleccionada(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalle de Venta #{ventaSeleccionada.id}</h2>
              <button className="modal-close" onClick={() => setVentaSeleccionada(null)}>✕</button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div className="venta-info">
                <div className="info-row">
                  <span>Fecha:</span>
                  <span>{formatearFecha(ventaSeleccionada.created_at)}</span>
                </div>
                <div className="info-row">
                  <span>Método de Pago:</span>
                  <span className="badge badge-info">{ventaSeleccionada.metodo_pago}</span>
                </div>
                <div className="info-row">
                  <span>Total Items:</span>
                  <span>{ventaSeleccionada.items_count}</span>
                </div>
              </div>

              <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Productos</h3>
              
              <div className="items-list">
                {ventaSeleccionada.items.map((item) => (
                  <div key={item.id} className="item-detalle">
                    <div>
                      <div className="item-nombre">{item.producto_nombre}</div>
                      {item.producto_codigo && (
                        <div className="item-codigo">{item.producto_codigo}</div>
                      )}
                    </div>
                    <div className="item-cantidad">
                      {item.cantidad} x ${parseFloat(item.precio_unitario).toFixed(2)}
                    </div>
                    <div className="item-subtotal">
                      ${parseFloat(item.subtotal).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="venta-total">
                <span>Total:</span>
                <span>${parseFloat(ventaSeleccionada.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
