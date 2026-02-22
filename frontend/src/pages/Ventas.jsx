import React, { useState, useEffect, useRef } from 'react';
import { ventasAPI } from '../services/api';
import FacturaA from '../components/FacturaA';
import './Ventas.css';

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [stats, setStats] = useState(null);
  const [ganancias, setGanancias] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas'); // todas, hoy, semana, mes, personalizado, estadisticas, facturacion
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [periodoGanancias, setPeriodoGanancias] = useState('hoy');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estados para factura
  const [mostrarModalFactura, setMostrarModalFactura] = useState(false);
  const [mostrarFactura, setMostrarFactura] = useState(false);
  const [datosEmpresa, setDatosEmpresa] = useState({
    razonSocial: '',
    domicilio: '',
    localidad: '',
    provincia: '',
    codigoArea: '',
    telefono: '',
    cuit: '',
    ingresosBrutos: '',
    inicioActividades: '',
    puntoVenta: '0001',
    numeroFactura: '00000001',
    cae: '',
    vencimientoCAE: ''
  });
  const [datosCliente, setDatosCliente] = useState({
    razonSocial: '',
    cuit: '',
    domicilio: '',
    localidad: '',
    provincia: '',
    telefono: '',
    condicionIVA: 'Responsable Inscripto',
    condicionVenta: 'Contado'
  });
  const [ventasFactura, setVentasFactura] = useState([]);
  const [totalesFactura, setTotalesFactura] = useState({ neto_gravado: 0, total: 0 });
  const [erroresFactura, setErroresFactura] = useState({});
  const facturaRef = useRef();

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
      } else if (tab === 'semana') {
        const response = await ventasAPI.getWeekly();
        setVentas(response.data.data);
      } else if (tab === 'mes') {
        const response = await ventasAPI.getMonthly();
        setVentas(response.data.data);
      } else if (tab === 'personalizado') {
        // Si hay fechas, filtrar por rango
        if (fechaInicio || fechaFin) {
          const params = new URLSearchParams();
          if (fechaInicio) params.append('startDate', fechaInicio);
          if (fechaFin) params.append('endDate', fechaFin);
          const response = await ventasAPI.getAll(100, 0);
          // Filtrar en frontend temporalmente (mejor hacerlo en backend)
          let ventasFiltradas = response.data.data;
          if (fechaInicio) {
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.created_at) >= new Date(fechaInicio));
          }
          if (fechaFin) {
            const fechaFinDate = new Date(fechaFin);
            fechaFinDate.setHours(23, 59, 59, 999);
            ventasFiltradas = ventasFiltradas.filter(v => new Date(v.created_at) <= fechaFinDate);
          }
          setVentas(ventasFiltradas);
        } else {
          const response = await ventasAPI.getAll(100, 0);
          setVentas(response.data.data);
        }
      } else if (tab === 'estadisticas') {
        const response = await ventasAPI.getStats();
        setStats(response.data.data);
      } else if (tab === 'facturacion') {
        const filtros = {};
        if (periodoGanancias && periodoGanancias !== 'personalizado') {
          filtros.periodo = periodoGanancias;
        } else if (periodoGanancias === 'personalizado') {
          if (fechaInicio) filtros.startDate = fechaInicio;
          if (fechaFin) filtros.endDate = fechaFin;
        }
        const response = await ventasAPI.getGanancias(filtros);
        setGanancias(response.data.data);
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

  const abrirModalFactura = () => {
    setErroresFactura({});
    setMostrarModalFactura(true);
  };

  const cerrarModalFactura = () => {
    setErroresFactura({});
    setMostrarModalFactura(false);
  };

  const generarFactura = async () => {
    // Validar campos obligatorios
    const errores = {};
    
    if (!datosEmpresa.razonSocial) errores.empresaRazonSocial = 'Este campo es obligatorio';
    if (!datosEmpresa.cuit) errores.empresaCuit = 'Este campo es obligatorio';
    if (!datosCliente.razonSocial) errores.clienteRazonSocial = 'Este campo es obligatorio';
    if (!datosCliente.cuit) errores.clienteCuit = 'Este campo es obligatorio';
    
    if (Object.keys(errores).length > 0) {
      setErroresFactura(errores);
      return;
    }

    setErroresFactura({});

    try {
      // Obtener ventas del período seleccionado
      let ventasPeriodo = [];
      if (periodoGanancias === 'hoy') {
        const response = await ventasAPI.getToday();
        ventasPeriodo = response.data.data || [];
      } else if (periodoGanancias === 'semana') {
        const response = await ventasAPI.getWeekly();
        ventasPeriodo = response.data.data || [];
      } else if (periodoGanancias === 'mes') {
        const response = await ventasAPI.getMonthly();
        ventasPeriodo = response.data.data || [];
      } else if (periodoGanancias === 'personalizado') {
        const response = await ventasAPI.getAll(1000, 0);
        ventasPeriodo = (response.data.data || []).filter(v => {
          const fechaVenta = new Date(v.fecha);
          const inicio = fechaInicio ? new Date(fechaInicio) : new Date(0);
          const fin = fechaFin ? new Date(fechaFin) : new Date();
          return fechaVenta >= inicio && fechaVenta <= fin;
        });
      }

      // Verificar si hay ventas
      if (!ventasPeriodo || ventasPeriodo.length === 0) {
        setMensaje({ tipo: 'error', texto: 'No hay ventas en el período seleccionado para facturar' });
        return;
      }

      // Consolidar productos vendidos
      const productosMap = new Map();
      let totalNeto = 0;

      ventasPeriodo.forEach(venta => {
        if (venta.items && Array.isArray(venta.items)) {
          venta.items.forEach(item => {
            const key = item.producto_codigo || item.codigo || `${item.producto_nombre || item.nombre}_${item.producto_id}`;
            if (productosMap.has(key)) {
              const existing = productosMap.get(key);
              existing.cantidad += item.cantidad;
            } else {
              productosMap.set(key, {
                codigo: item.producto_codigo || item.codigo || 'S/C',
                nombre: item.producto_nombre || item.nombre || 'Producto',
                cantidad: item.cantidad || 0,
                precio: item.precio_unitario || 0
              });
            }
            totalNeto += parseFloat(item.subtotal || 0);
          });
        }
      });

      const productosFactura = Array.from(productosMap.values());
      
      if (productosFactura.length === 0) {
        setMensaje({ tipo: 'error', texto: 'No se encontraron productos para facturar' });
        return;
      }

      const totalConIva = totalNeto * 1.21;

      setVentasFactura(productosFactura);
      setTotalesFactura({
        neto_gravado: totalNeto,
        total: totalConIva
      });

      setMostrarModalFactura(false);
      setMostrarFactura(true);
    } catch (error) {
      console.error('Error generando factura:', error);
      setMensaje({ tipo: 'error', texto: `Error al generar la factura: ${error.message}` });
    }
  };

  const imprimirFactura = () => {
    window.print();
  };

  const guardarComoPDF = () => {
    window.print();
  };

  const compartirFactura = async () => {
    const numeroFactura = `${String(datosEmpresa.puntoVenta || '0000').padStart(4, '0')}-${String(datosEmpresa.numeroFactura || '00000001').padStart(8, '0')}`;
    const resumen = `Factura A ${numeroFactura}\n` +
      `Emisor: ${datosEmpresa.razonSocial} (CUIT: ${datosEmpresa.cuit})\n` +
      `Cliente: ${datosCliente.razonSocial} (CUIT: ${datosCliente.cuit})\n` +
      `Total: $${parseFloat(totalesFactura.total).toFixed(2)}\n` +
      `Productos: ${ventasFactura.length} items`;

    // Intentar usar Web Share API si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Factura A ${numeroFactura}`,
          text: resumen
        });
        setMensaje({ tipo: 'success', texto: 'Factura compartida exitosamente' });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error al compartir:', error);
          copiarAlPortapapeles(resumen);
        }
      }
    } else {
      copiarAlPortapapeles(resumen);
    }
  };

  const copiarAlPortapapeles = (texto) => {
    navigator.clipboard.writeText(texto).then(() => {
      setMensaje({ tipo: 'success', texto: 'Datos de la factura copiados al portapapeles' });
    }).catch(err => {
      console.error('Error al copiar:', err);
      setMensaje({ tipo: 'error', texto: 'No se pudo copiar al portapapeles' });
    });
  };

  const cerrarVistaFactura = () => {
    setMostrarFactura(false);
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
          Todas
        </button>
        <button
          className={`tab ${tab === 'hoy' ? 'active' : ''}`}
          onClick={() => setTab('hoy')}
        >
          Hoy
        </button>
        <button
          className={`tab ${tab === 'semana' ? 'active' : ''}`}
          onClick={() => setTab('semana')}
        >
          Semana
        </button>
        <button
          className={`tab ${tab === 'mes' ? 'active' : ''}`}
          onClick={() => setTab('mes')}
        >
          Mes
        </button>
        <button
          className={`tab ${tab === 'personalizado' ? 'active' : ''}`}
          onClick={() => setTab('personalizado')}
        >
          Personalizado
        </button>
        <button
          className={`tab ${tab === 'facturacion' ? 'active' : ''}`}
          onClick={() => setTab('facturacion')}
        >
          💰 Facturación
        </button>
        <button
          className={`tab ${tab === 'estadisticas' ? 'active' : ''}`}
          onClick={() => setTab('estadisticas')}
        >
          Estadísticas
        </button>
      </div>

      {/* Filtro de fecha personalizado */}
      {tab === 'personalizado' && (
        <div className="card" style={{ marginTop: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label className="label" style={{ marginBottom: '0.25rem' }}>Fecha Inicio</label>
              <input
                type="date"
                className="input"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{ width: '180px' }}
              />
            </div>
            <div>
              <label className="label" style={{ marginBottom: '0.25rem' }}>Fecha Fin</label>
              <input
                type="date"
                className="input"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={{ width: '180px' }}
              />
            </div>
            <button 
              className="btn btn-primary" 
              onClick={cargarDatos}
              style={{ marginTop: '1.5rem' }}
            >
              Aplicar Filtro
            </button>
            <button 
              className="btn btn-outline" 
              onClick={() => {
                setFechaInicio('');
                setFechaFin('');
                cargarDatos();
              }}
              style={{ marginTop: '1.5rem' }}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Contenido según tab */}
      {(tab === 'todas' || tab === 'hoy' || tab === 'semana' || tab === 'mes' || tab === 'personalizado') && (
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

      {/* Facturación y Ganancias */}
      {tab === 'facturacion' && (
        <>
          <div className="card" style={{ marginTop: '1.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <label className="label" style={{ marginBottom: '0.5rem' }}>Período</label>
                <select 
                  className="input" 
                  value={periodoGanancias}
                  onChange={(e) => setPeriodoGanancias(e.target.value)}
                  style={{ width: '180px' }}
                >
                  <option value="hoy">Hoy</option>
                  <option value="semana">Última Semana</option>
                  <option value="mes">Último Mes</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              
              {periodoGanancias === 'personalizado' && (
                <>
                  <div>
                    <label className="label" style={{ marginBottom: '0.5rem' }}>Fecha Inicio</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      style={{ width: '180px' }}
                    />
                  </div>
                  <div>
                    <label className="label" style={{ marginBottom: '0.5rem' }}>Fecha Fin</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      style={{ width: '180px' }}
                    />
                  </div>
                </>
              )}

              <button 
                className="btn btn-primary" 
                onClick={cargarDatos}
                style={{ marginTop: '1.5rem' }}
              >
                Actualizar
              </button>
            </div>
          </div>

          {ganancias && (
            <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
              <div className="stat-card" style={{ backgroundColor: '#e8f5e9' }}>
                <div className="stat-icon">💵</div>
                <div className="stat-value" style={{ color: '#2e7d32' }}>
                  ${parseFloat(ganancias.ingresos_totales).toFixed(2)}
                </div>
                <div className="stat-label">Ingresos Totales</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#fff3e0' }}>
                <div className="stat-icon">📦</div>
                <div className="stat-value" style={{ color: '#e65100' }}>
                  ${parseFloat(ganancias.costos_totales).toFixed(2)}
                </div>
                <div className="stat-label">Costos Totales</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#e3f2fd' }}>
                <div className="stat-icon">💰</div>
                <div className="stat-value" style={{ color: '#1565c0' }}>
                  ${parseFloat(ganancias.ganancia_neta).toFixed(2)}
                </div>
                <div className="stat-label">Ganancia Neta</div>
              </div>

              <div className="stat-card" style={{ backgroundColor: '#f3e5f5' }}>
                <div className="stat-icon">📊</div>
                <div className="stat-value" style={{ color: '#6a1b9a' }}>
                  {parseFloat(ganancias.margen_porcentaje).toFixed(2)}%
                </div>
                <div className="stat-label">Margen de Ganancia</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛒</div>
                <div className="stat-value">{ganancias.total_ventas}</div>
                <div className="stat-label">Ventas Realizadas</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-value">{ganancias.productos_vendidos}</div>
                <div className="stat-label">Productos Vendidos</div>
              </div>
            </div>
          )}

          {/* Botón para generar factura */}
          {ganancias && (
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={abrirModalFactura}
                style={{ fontSize: '1.1rem', padding: '0.8rem 2rem' }}
              >
                📄 Generar Factura A
              </button>
            </div>
          )}
        </>
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

      {/* Modal para datos de factura */}
      {mostrarModalFactura && (
        <div className="modal-overlay" onClick={cerrarModalFactura}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Datos para Factura A</h2>
              <button className="modal-close" onClick={cerrarModalFactura}>×</button>
            </div>
            
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '2rem' }}>
              {/* Datos de la Empresa */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '0.5rem', fontSize: '1.2rem' }}>
                  📋 Datos de la Empresa (Emisor)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label className="label">Razón Social *</label>
                    <input
                      type="text"
                      className={`input ${erroresFactura.empresaRazonSocial ? 'input-error' : ''}`}
                      value={datosEmpresa.razonSocial}
                      onChange={(e) => {
                        setDatosEmpresa({...datosEmpresa, razonSocial: e.target.value});
                        if (erroresFactura.empresaRazonSocial) {
                          setErroresFactura({...erroresFactura, empresaRazonSocial: undefined});
                        }
                      }}
                      placeholder="Empresa S.R.L."
                    />
                    {erroresFactura.empresaRazonSocial && (
                      <span className="error-message">{erroresFactura.empresaRazonSocial}</span>
                    )}
                  </div>
                  <div>
                    <label className="label">CUIT *</label>
                    <input
                      type="text"
                      className={`input ${erroresFactura.empresaCuit ? 'input-error' : ''}`}
                      value={datosEmpresa.cuit}
                      onChange={(e) => {
                        setDatosEmpresa({...datosEmpresa, cuit: e.target.value});
                        if (erroresFactura.empresaCuit) {
                          setErroresFactura({...erroresFactura, empresaCuit: undefined});
                        }
                      }}
                      placeholder="20-12345678-3"
                    />
                    {erroresFactura.empresaCuit && (
                      <span className="error-message">{erroresFactura.empresaCuit}</span>
                    )}
                  </div>
                  <div>
                    <label className="label">Domicilio</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.domicilio}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, domicilio: e.target.value})}
                      placeholder="Av. Siempre Viva 123"
                    />
                  </div>
                  <div>
                    <label className="label">Localidad</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.localidad}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, localidad: e.target.value})}
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div>
                    <label className="label">Provincia</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.provincia}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, provincia: e.target.value})}
                      placeholder="Buenos Aires"
                    />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        className="input"
                        value={datosEmpresa.codigoArea}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, codigoArea: e.target.value})}
                        placeholder="011"
                        style={{ width: '70px' }}
                      />
                      <input
                        type="text"
                        className="input"
                        value={datosEmpresa.telefono}
                        onChange={(e) => setDatosEmpresa({...datosEmpresa, telefono: e.target.value})}
                        placeholder="1234-5678"
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Ingresos Brutos</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.ingresosBrutos}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, ingresosBrutos: e.target.value})}
                      placeholder="20-12345678-3"
                    />
                  </div>
                  <div>
                    <label className="label">Inicio de Actividades</label>
                    <input
                      type="date"
                      className="input"
                      value={datosEmpresa.inicioActividades}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, inicioActividades: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Punto de Venta</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.puntoVenta}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, puntoVenta: e.target.value})}
                      placeholder="0001"
                    />
                  </div>
                  <div>
                    <label className="label">Número de Factura</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.numeroFactura}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, numeroFactura: e.target.value})}
                      placeholder="00000001"
                    />
                  </div>
                  <div>
                    <label className="label">CAE (opcional)</label>
                    <input
                      type="text"
                      className="input"
                      value={datosEmpresa.cae}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, cae: e.target.value})}
                      placeholder="1234567890"
                    />
                  </div>
                  <div>
                    <label className="label">Vto. CAE (opcional)</label>
                    <input
                      type="date"
                      className="input"
                      value={datosEmpresa.vencimientoCAE}
                      onChange={(e) => setDatosEmpresa({...datosEmpresa, vencimientoCAE: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Cliente */}
              <div>
                <h3 style={{ marginBottom: '1.5rem', color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '0.5rem', fontSize: '1.2rem' }}>
                  👤 Datos del Cliente (Receptor)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label className="label">Razón Social *</label>
                    <input
                      type="text"
                      className={`input ${erroresFactura.clienteRazonSocial ? 'input-error' : ''}`}
                      value={datosCliente.razonSocial}
                      onChange={(e) => {
                        setDatosCliente({...datosCliente, razonSocial: e.target.value});
                        if (erroresFactura.clienteRazonSocial) {
                          setErroresFactura({...erroresFactura, clienteRazonSocial: undefined});
                        }
                      }}
                      placeholder="Cliente S.A."
                    />
                    {erroresFactura.clienteRazonSocial && (
                      <span className="error-message">{erroresFactura.clienteRazonSocial}</span>
                    )}
                  </div>
                  <div>
                    <label className="label">CUIT *</label>
                    <input
                      type="text"
                      className={`input ${erroresFactura.clienteCuit ? 'input-error' : ''}`}
                      value={datosCliente.cuit}
                      onChange={(e) => {
                        setDatosCliente({...datosCliente, cuit: e.target.value});
                        if (erroresFactura.clienteCuit) {
                          setErroresFactura({...erroresFactura, clienteCuit: undefined});
                        }
                      }}
                      placeholder="20-98765432-1"
                    />
                    {erroresFactura.clienteCuit && (
                      <span className="error-message">{erroresFactura.clienteCuit}</span>
                    )}
                  </div>
                  <div>
                    <label className="label">Domicilio</label>
                    <input
                      type="text"
                      className="input"
                      value={datosCliente.domicilio}
                      onChange={(e) => setDatosCliente({...datosCliente, domicilio: e.target.value})}
                      placeholder="Calle Cliente 456"
                    />
                  </div>
                  <div>
                    <label className="label">Localidad</label>
                    <input
                      type="text"
                      className="input"
                      value={datosCliente.localidad}
                      onChange={(e) => setDatosCliente({...datosCliente, localidad: e.target.value})}
                      placeholder="Rosario"
                    />
                  </div>
                  <div>
                    <label className="label">Provincia</label>
                    <input
                      type="text"
                      className="input"
                      value={datosCliente.provincia}
                      onChange={(e) => setDatosCliente({...datosCliente, provincia: e.target.value})}
                      placeholder="Santa Fe"
                    />
                  </div>
                  <div>
                    <label className="label">Teléfono</label>
                    <input
                      type="text"
                      className="input"
                      value={datosCliente.telefono}
                      onChange={(e) => setDatosCliente({...datosCliente, telefono: e.target.value})}
                      placeholder="0341-1234567"
                    />
                  </div>
                  <div>
                    <label className="label">Condición IVA</label>
                    <select
                      className="input"
                      value={datosCliente.condicionIVA}
                      onChange={(e) => setDatosCliente({...datosCliente, condicionIVA: e.target.value})}
                    >
                      <option value="Responsable Inscripto">Responsable Inscripto</option>
                      <option value="Monotributista">Monotributista</option>
                      <option value="Consumidor Final">Consumidor Final</option>
                      <option value="Exento">Exento</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Condición de Venta</label>
                    <select
                      className="input"
                      value={datosCliente.condicionVenta}
                      onChange={(e) => setDatosCliente({...datosCliente, condicionVenta: e.target.value})}
                    >
                      <option value="Contado">Contado</option>
                      <option value="Cuenta Corriente">Cuenta Corriente</option>
                      <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalFactura}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={generarFactura}>
                Generar Factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista de Factura para imprimir */}
      {mostrarFactura && (
        <div className="modal-overlay" onClick={cerrarVistaFactura}>
          <div className="modal-content" style={{ maxWidth: '230mm', width: '95%', maxHeight: '95vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h2>Vista Previa de Factura</h2>
              <button className="modal-close" onClick={cerrarVistaFactura}>×</button>
            </div>
            
            <div className="modal-body" style={{ padding: 0 }}>
              <FacturaA 
                ref={facturaRef}
                datosEmpresa={datosEmpresa}
                datosCliente={datosCliente}
                ventas={ventasFactura}
                totales={totalesFactura}
              />
            </div>

            <div className="modal-footer no-print">
              <button className="btn btn-secondary" onClick={cerrarVistaFactura}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={compartirFactura}>
                📤 Compartir
              </button>
              <button className="btn btn-primary" onClick={guardarComoPDF}>
                📄 Guardar PDF
              </button>
              <button className="btn btn-primary" onClick={imprimirFactura}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
