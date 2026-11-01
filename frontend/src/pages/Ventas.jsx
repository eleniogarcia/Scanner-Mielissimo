import React, { useState, useEffect, useRef } from 'react';
import { ventasAPI, nombreMetodoPago } from '../services/api';
import BalanceMensual from './BalanceMensual';
import './Ventas.css';

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [stats, setStats] = useState(null);
  const [ganancias, setGanancias] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('historial'); // historial, resumen
  const [periodo, setPeriodo] = useState('hoy'); // hoy, semana, mes, todas, personalizado
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [periodoGanancias, setPeriodoGanancias] = useState('hoy');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  // Modal de confirmación propio (reemplaza window.confirm para no romper el foco en Electron)
  const [confirmModal, setConfirmModal] = useState({ visible: false, mensaje: '', onConfirm: null });

  const mostrarConfirm = (mensaje, onConfirm) => {
    setConfirmModal({ visible: true, mensaje, onConfirm });
  };
  const cerrarConfirm = () => setConfirmModal({ visible: false, mensaje: '', onConfirm: null });

  // Ranking
  const [rankingData, setRankingData] = useState([]);
  const [periodoRanking, setPeriodoRanking] = useState('hoy');
  const [loadingRanking, setLoadingRanking] = useState(false);
  
  // Estados para impresión de pedidos
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [ventasImpresion, setVentasImpresion] = useState([]);
  const [cargandoImpresion, setCargandoImpresion] = useState(false);
  const impresionRef = useRef();
  const isPrintingRef = useRef(false);

  useEffect(() => {
    if (tab === 'ranking') cargarRanking();
  }, [tab, periodoRanking]);

  useEffect(() => {
    if (tab === 'historial') cargarDatos();
  }, [tab, periodo]);

  useEffect(() => {
    if (tab === 'resumen') cargarDatos();
  }, [tab, periodoGanancias]);

  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (tab === 'historial') {
        if (periodo === 'hoy') {
          const response = await ventasAPI.getToday();
          setVentas(response.data.data);
        } else if (periodo === 'semana') {
          const response = await ventasAPI.getWeekly();
          setVentas(response.data.data);
        } else if (periodo === 'mes') {
          const response = await ventasAPI.getMonthly();
          setVentas(response.data.data);
        } else if (periodo === 'todas') {
          const response = await ventasAPI.getAll(100, 0);
          setVentas(response.data.data);
        } else if (periodo === 'personalizado') {
          const response = await ventasAPI.getAll(500, 0, fechaInicio || null, fechaFin || null);
          setVentas(response.data.data);
        }
      } else if (tab === 'resumen') {
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

  const eliminarVenta = (ventaId) => {
    mostrarConfirm('¿Estás seguro de eliminar esta venta? Esta acción no se puede deshacer.', async () => {
      try {
        await ventasAPI.delete(ventaId);
        setMensaje({ tipo: 'success', texto: 'Venta eliminada exitosamente' });
        cargarDatos();
      } catch (error) {
        console.error('Error al eliminar venta:', error);
        setMensaje({ tipo: 'error', texto: 'Error al eliminar la venta' });
      }
    });
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

  const cargarRanking = async () => {
    setLoadingRanking(true);
    try {
      let ventasLista = [];
      if (periodoRanking === 'hoy') {
        const r = await ventasAPI.getToday(true); ventasLista = r.data.data || [];
      } else if (periodoRanking === 'semana') {
        const r = await ventasAPI.getWeekly(true); ventasLista = r.data.data || [];
      } else if (periodoRanking === 'mes') {
        const r = await ventasAPI.getMonthly(true); ventasLista = r.data.data || [];
      } else {
        const r = await ventasAPI.getAll(300, 0, null, null, true); ventasLista = r.data.data || [];
      }
      // Usar solo ventas que ya traen items (evitar N+1 llamadas que traban la app)
      const conDetalle = ventasLista.filter(v => Array.isArray(v.items) && v.items.length > 0);
      // Agregar por producto
      const mapa = {};
      for (const v of conDetalle) {
        if (!v.items) continue;
        for (const it of v.items) {
          const k = it.producto_nombre;
          if (!mapa[k]) mapa[k] = { nombre: k, cantidad: 0, ingresos: 0, pedidos: 0 };
          mapa[k].cantidad += Number(it.cantidad);
          mapa[k].ingresos += Number(it.subtotal);
          mapa[k].pedidos += 1;
        }
      }
      const lista = Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10);
      setRankingData(lista);
    } catch (e) {
      console.error('Error ranking:', e);
    } finally {
      setLoadingRanking(false);
    }
  };

  const clasificarTurnos = (lista) => {
    const mañana = [];
    const noche = [];
    const otras = [];
    for (const v of lista) {
      const d = new Date(v.created_at);
      const mins = d.getHours() * 60 + d.getMinutes();
      if (mins >= 8 * 60 && mins <= 13 * 60 + 30) {
        mañana.push(v);
      } else if (mins >= 17 * 60 && mins <= 21 * 60) {
        noche.push(v);
      } else {
        otras.push(v);
      }
    }
    return { mañana, noche, otras };
  };

  const imprimirTotalTicket = (lista, per, fInicio, fFin) => {
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;

    const { mañana, noche, otras } = clasificarTurnos(lista);
    const totalMañana = mañana.reduce((acc, v) => acc + parseFloat(v.total || 0), 0).toFixed(2);
    const totalNoche  = noche.reduce((acc, v) => acc + parseFloat(v.total || 0), 0).toFixed(2);
    const totalDia    = lista.reduce((acc, v) => acc + parseFloat(v.total || 0), 0).toFixed(2);

    const periodoLabel = per === 'hoy' ? 'Hoy'
      : per === 'semana' ? 'Última Semana'
      : per === 'mes' ? 'Último Mes'
      : per === 'todas' ? 'Todas'
      : `${fInicio || '—'} → ${fFin || '—'}`;
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const filaOtras = otras.length > 0
      ? `<div class="turno-row otras">
           <div class="turno-label">Fuera de turno (${otras.length} ped.)</div>
           <div class="turno-total">$${otras.reduce((a,v)=>a+parseFloat(v.total||0),0).toFixed(2)}</div>
         </div>`
      : '';

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Resumen Mielissimo</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    font-weight: bold;
    width: 80mm;
    padding: 4mm 3mm;
    color: #000;
  }
  .centro { text-align: center; }
  .titulo { font-size: 24px; font-weight: 900; letter-spacing: 3px; margin: 5px 0 2px; color: #000; }
  .subtitulo { font-size: 12px; font-weight: bold; margin-bottom: 3px; color: #000; }
  .linea { border-top: 2px dashed #000; margin: 6px 0; }
  .linea-solida { border-top: 2px solid #000; margin: 6px 0; }
  .meta { font-size: 12px; font-weight: bold; margin: 3px 0; color: #000; }
  .seccion-titulo {
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #000;
    margin: 4px 0 2px;
  }
  .turno-bloque {
    margin: 4px 0;
    padding: 5px 0;
    border-top: 1px dashed #000;
  }
  .turno-encabezado {
    font-size: 13px;
    font-weight: 900;
    color: #000;
    margin-bottom: 2px;
  }
  .turno-horario {
    font-size: 11px;
    font-weight: bold;
    color: #000;
    margin-bottom: 3px;
  }
  .turno-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
    font-weight: bold;
    color: #000;
    margin: 2px 0;
  }
  .turno-total {
    font-size: 16px;
    font-weight: 900;
    color: #000;
  }
  .turno-pedidos {
    font-size: 11px;
    font-weight: bold;
    color: #000;
  }
  .total-dia-bloque {
    margin-top: 5px;
    padding-top: 5px;
    border-top: 2px solid #000;
  }
  .total-dia-label {
    font-size: 13px;
    font-weight: 900;
    color: #000;
  }
  .total-dia-monto {
    font-size: 22px;
    font-weight: 900;
    color: #000;
  }
  .gracias { font-size: 13px; font-weight: 900; margin-top: 8px; color: #000; }
  @media print {
    html, body { width: 80mm; }
    @page { margin: 0; size: 80mm auto; }
  }
</style>
</head><body>
  <div class="centro">
    <div class="titulo">MIELISSIMO</div>
    <div class="subtitulo">Pedernera 462</div>
  </div>
  <div class="linea"></div>
  <div class="meta">Período: ${periodoLabel}</div>
  <div class="meta">Fecha: ${fecha} &nbsp; ${hora}</div>
  <div class="meta">Total pedidos: ${lista.length}</div>
  <div class="linea"></div>

  <div class="turno-bloque">
    <div class="turno-encabezado">Turno Mañana</div>
    <div class="turno-horario">08:00 hs — 13:30 hs &nbsp;·&nbsp; ${mañana.length} pedido(s)</div>
    <div class="turno-row">
      <span class="turno-pedidos">Total turno mañana:</span>
      <span class="turno-total">$${totalMañana}</span>
    </div>
  </div>

  <div class="turno-bloque">
    <div class="turno-encabezado">Turno Tarde</div>
    <div class="turno-horario">17:00 hs — 21:00 hs &nbsp;·&nbsp; ${noche.length} pedido(s)</div>
    <div class="turno-row">
      <span class="turno-pedidos">Total turno tarde:</span>
      <span class="turno-total">$${totalNoche}</span>
    </div>
  </div>

  ${filaOtras}

  <div class="total-dia-bloque">
    <div class="turno-row">
      <span class="total-dia-label">TOTAL DEL DÍA:</span>
      <span class="total-dia-monto">$${totalDia}</span>
    </div>
  </div>

  <div class="linea"></div>
  <div class="centro gracias">¡Gracias!</div>
</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:none;';
    document.body.appendChild(iframe);
    iframe.contentDocument.open();
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    iframe.contentWindow.focus();
    setTimeout(() => {
      iframe.contentWindow.print();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch(e) {}
        isPrintingRef.current = false;
      }, 2000);
    }, 300);
  };

  const imprimirDetallePedidos = async () => {
    setCargandoImpresion(true);
    try {
      let ventasLista = [];
      if (periodo === 'hoy') {
        const r = await ventasAPI.getToday();
        ventasLista = r.data.data || [];
      } else if (periodo === 'semana') {
        const r = await ventasAPI.getWeekly();
        ventasLista = r.data.data || [];
      } else if (periodo === 'mes') {
        const r = await ventasAPI.getMonthly();
        ventasLista = r.data.data || [];
      } else if (periodo === 'todas') {
        const r = await ventasAPI.getAll(1000, 0);
        ventasLista = r.data.data || [];
      } else if (periodo === 'personalizado') {
        const r = await ventasAPI.getAll(1000, 0, fechaInicio || null, fechaFin || null);
        ventasLista = r.data.data || [];
      }

      // Asegurar que cada venta tenga sus items detallados
      const ventasConDetalle = [];
      for (const venta of ventasLista) {
        if (Array.isArray(venta.items) && venta.items.length > 0) {
          ventasConDetalle.push(venta);
        } else {
          try {
            const r = await ventasAPI.getById(venta.id);
            ventasConDetalle.push(r.data.data);
          } catch {
            ventasConDetalle.push(venta);
          }
        }
      }

      setVentasImpresion(ventasConDetalle);
      setMostrarImpresion(true);
    } catch (error) {
      console.error('Error cargando pedidos:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cargar los pedidos del período' });
    } finally {
      setCargandoImpresion(false);
    }
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
      <h1 className="page-title">Historial de Ventas</h1>

      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>Historial</button>
        <button className={`tab ${tab === 'ranking' ? 'active' : ''}`} onClick={() => setTab('ranking')}>🏆 Ranking</button>
        <button className={`tab ${tab === 'resumen' ? 'active' : ''}`} onClick={() => setTab('resumen')}>Resumen</button>
        <button className={`tab ${tab === 'balance' ? 'active' : ''}`} onClick={() => setTab('balance')}>Gastos y balance del mes</button>
      </div>

      {/* Ranking */}
      {tab === 'ranking' && (
        <>
          {/* Selector de período */}
          <div className="card" style={{ marginTop: '1.5rem', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.25rem' }}>Período:</span>
              {[{val:'hoy',label:'Hoy'},{val:'semana',label:'Semana'},{val:'mes',label:'Mes'},{val:'todas',label:'Todas'}].map(({val,label}) => (
                <button key={val} className={`btn btn-sm ${periodoRanking === val ? 'btn-primary' : 'btn-outline'}`} onClick={() => setPeriodoRanking(val)}>{label}</button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={cargarRanking} style={{ marginLeft: 'auto' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{marginRight:'4px'}}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Actualizar
              </button>
            </div>
          </div>

          {loadingRanking ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Calculando ranking…</div>
          ) : rankingData.length === 0 ? (
            <div className="card" style={{ marginTop: '1rem', textAlign: 'center', padding: '3rem', color: '#6b7280' }}>No hay ventas en este período.</div>
          ) : (
            <div className="card ranking-card" style={{ marginTop: '1rem', overflow: 'hidden' }}>
              {/* Header degradado */}
              <div className="ranking-header">
                <div className="ranking-header-icon">🏆</div>
                <div>
                  <div className="ranking-header-title">Top Productos Más Vendidos</div>
                  <div className="ranking-header-sub">
                    {periodoRanking === 'hoy' ? 'Hoy' : periodoRanking === 'semana' ? 'Última Semana' : periodoRanking === 'mes' ? 'Último Mes' : 'Histórico'}
                    {' · '}{rankingData.length} productos
                  </div>
                </div>
              </div>

              {/* Podio top 3 */}
              {rankingData.length >= 3 && (
                <div className="ranking-podio">
                  {/* 2do lugar */}
                  <div className="podio-item podio-2">
                    <div className="podio-medal">🥈</div>
                    <div className="podio-bar podio-bar-2"></div>
                    <div className="podio-pos">2</div>
                    <div className="podio-nombre">{rankingData[1].nombre.length > 22 ? rankingData[1].nombre.substring(0,22)+'…' : rankingData[1].nombre}</div>
                    <div className="podio-cant">{rankingData[1].cantidad} uds</div>
                  </div>
                  {/* 1er lugar */}
                  <div className="podio-item podio-1">
                    <div className="podio-medal">🥇</div>
                    <div className="podio-bar podio-bar-1"></div>
                    <div className="podio-pos">1</div>
                    <div className="podio-nombre">{rankingData[0].nombre.length > 22 ? rankingData[0].nombre.substring(0,22)+'…' : rankingData[0].nombre}</div>
                    <div className="podio-cant">{rankingData[0].cantidad} uds</div>
                  </div>
                  {/* 3er lugar */}
                  <div className="podio-item podio-3">
                    <div className="podio-medal">🥉</div>
                    <div className="podio-bar podio-bar-3"></div>
                    <div className="podio-pos">3</div>
                    <div className="podio-nombre">{rankingData[2].nombre.length > 22 ? rankingData[2].nombre.substring(0,22)+'…' : rankingData[2].nombre}</div>
                    <div className="podio-cant">{rankingData[2].cantidad} uds</div>
                  </div>
                </div>
              )}

              {/* Tabla completa */}
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <table className="ranking-tabla">
                  <thead>
                    <tr>
                      <th style={{ width: '3rem' }}>#</th>
                      <th>Producto</th>
                      <th style={{ textAlign: 'center' }}>Unidades</th>
                      <th style={{ textAlign: 'center' }}>Pedidos</th>
                      <th style={{ textAlign: 'right' }}>Total $</th>
                      <th style={{ width: '140px' }}>Popularidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.map((p, i) => {
                      const maxCant = rankingData[0].cantidad;
                      const pct = Math.round((p.cantidad / maxCant) * 100);
                      const medalEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
                      const rowClass = i === 0 ? 'ranking-row-1' : i === 1 ? 'ranking-row-2' : i === 2 ? 'ranking-row-3' : '';
                      return (
                        <tr key={p.nombre} className={`ranking-row ${rowClass}`}>
                          <td>
                            <span className={`ranking-pos ranking-pos-${i < 3 ? i+1 : 'rest'}`}>
                              {medalEmoji || (i + 1)}
                            </span>
                          </td>
                          <td className="ranking-nombre">{p.nombre}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="ranking-badge-cant">{p.cantidad}</span>
                          </td>
                          <td style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.85rem' }}>{p.pedidos}</td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#16a34a' }}>${p.ingresos.toFixed(2)}</td>
                          <td>
                            <div className="ranking-bar-wrap">
                              <div className="ranking-bar-fill" style={{ width: `${pct}%`, background: i === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : i === 1 ? 'linear-gradient(90deg,#94a3b8,#cbd5e1)' : i === 2 ? 'linear-gradient(90deg,#b45309,#d97706)' : 'linear-gradient(90deg,#6366f1,#818cf8)' }}></div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Historial unificado con selector de período */}
      {tab === 'historial' && (
        <>
          <div className="card" style={{ marginTop: '1.5rem', padding: '0.85rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.25rem' }}>Período:</span>
              {[{val:'hoy',label:'Hoy'},{val:'semana',label:'Semana'},{val:'mes',label:'Mes'},{val:'todas',label:'Todas'},{val:'personalizado',label:'Personalizado'}].map(({val,label}) => (
                <button
                  key={val}
                  className={`btn btn-sm ${periodo === val ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPeriodo(val)}
                >
                  {label}
                </button>
              ))}
              {periodo === 'personalizado' && (
                <>
                  <input
                    type="date"
                    className="input"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    style={{ width: '160px', marginLeft: '0.5rem' }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>→</span>
                  <input
                    type="date"
                    className="input"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    style={{ width: '160px' }}
                  />
                  <button className="btn btn-sm btn-primary" onClick={cargarDatos}>Aplicar</button>
                  <button className="btn btn-sm btn-outline" onClick={() => { setFechaInicio(''); setFechaFin(''); }}>Limpiar</button>
                </>
              )}
              {/* Botón Imprimir Detalle de Pedidos */}
              <button
                className="btn btn-sm btn-primary"
                onClick={imprimirDetallePedidos}
                disabled={cargandoImpresion || ventas.length === 0}
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {cargandoImpresion ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Cargando…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                    Imprimir Detalle
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Items</th>
                  <th>Pago</th>
                  <th>Total</th>
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
                      <td>{nombreMetodoPago(venta.metodo_pago)}</td>
                      <td><strong className="text-success">${parseFloat(venta.total).toFixed(2)}</strong></td>
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
        </>
      )}

      {/* Facturación y Ganancias */}
      {tab === 'resumen' && (
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
            <>

              {/* Grilla uniforme de 7 tarjetas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                {[
                  { label: 'Ingresos Totales',   value: `$${parseFloat(ganancias.ingresos_totales).toFixed(2)}`,   bg: '#e8f5e9', color: '#2e7d32', icon: <svg width="20" height="20" fill="none" stroke="#2e7d32" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                  { label: 'Costos Totales',      value: `$${parseFloat(ganancias.costos_totales).toFixed(2)}`,    bg: '#fff3e0', color: '#e65100', icon: <svg width="20" height="20" fill="none" stroke="#e65100" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
                  { label: 'Ganancia Neta',       value: `$${parseFloat(ganancias.ganancia_neta).toFixed(2)}`,     bg: '#e3f2fd', color: '#1565c0', icon: <svg width="20" height="20" fill="none" stroke="#1565c0" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
                  { label: 'Margen de Ganancia',  value: `${parseFloat(ganancias.margen_porcentaje).toFixed(1)}%`, bg: '#f3e5f5', color: '#6a1b9a', icon: <svg width="20" height="20" fill="none" stroke="#6a1b9a" strokeWidth="2" viewBox="0 0 24 24"><rect x="18" y="3" width="4" height="18"/><rect x="10" y="8" width="4" height="13"/><rect x="2" y="13" width="4" height="8"/></svg> },
                  { label: 'Ventas Realizadas',   value: ganancias.total_ventas,                                   bg: '#ede9fe', color: '#4f46e5', icon: <svg width="20" height="20" fill="none" stroke="#4f46e5" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> },
                  { label: 'Productos Vendidos',  value: ganancias.productos_vendidos,                             bg: '#e0f2f1', color: '#0f766e', icon: <svg width="20" height="20" fill="none" stroke="#0f766e" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
                  { label: 'Ticket Promedio',     value: `$${ganancias.total_ventas > 0 ? (parseFloat(ganancias.ingresos_totales) / ganancias.total_ventas).toFixed(2) : '0.00'}`, bg: '#fef9c3', color: '#854d0e', icon: <svg width="20" height="20" fill="none" stroke="#854d0e" strokeWidth="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
                ].map(({ label, value, bg, color, icon }) => (
                  <div key={label} style={{ background: bg, borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '110px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                    <div style={{ marginBottom: '0.4rem' }}>{icon}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color, lineHeight: 1.2 }}>{value}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.3rem', fontWeight: '500' }}>{label}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Gastos y balance mensual */}
      {tab === 'balance' && <BalanceMensual />}

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
                  <span>Total Items:</span>
                  <span>{ventaSeleccionada.items_count}</span>
                </div>
                <div className="info-row">
                  <span>Forma de pago:</span>
                  <span>{nombreMetodoPago(ventaSeleccionada.metodo_pago)}</span>
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

      {/* Modal de impresión de detalle de pedidos */}
      {mostrarImpresion && (
        <div className="modal-overlay" onClick={() => setMostrarImpresion(false)}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', maxHeight: '95vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header no-print">
              <h2>Detalle de Pedidos</h2>
              <button className="modal-close" onClick={() => setMostrarImpresion(false)}>×</button>
            </div>

            <div ref={impresionRef} className="detalle-pedidos-print" style={{ padding: '1.5rem' }}>
              {/* Encabezado visible en pantalla (no se imprime) */}
              <div className="no-print" style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #374151', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>Detalle de Pedidos</h2>
                <p style={{ color: '#6b7280', margin: '0.3rem 0 0', fontSize: '0.9rem' }}>
                  Período: {periodo === 'hoy' ? 'Hoy' : periodo === 'semana' ? 'Última Semana' : periodo === 'mes' ? 'Último Mes' : periodo === 'todas' ? 'Todas' : `${fechaInicio || '—'} → ${fechaFin || '—'}`}
                  {' · '}{ventasImpresion.length} pedido(s)
                  {' · '}Generado: {new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {ventasImpresion.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0' }}>No hay pedidos registrados en este período.</p>
              ) : (
                <>
                  {/* Resumen por Producto — solo pantalla */}
                  <div className="no-print">
                    {(() => {
                      const resumen = {};
                      for (const v of ventasImpresion) {
                        if (v.items) {
                          for (const item of v.items) {
                            const k = item.producto_nombre;
                            if (!resumen[k]) resumen[k] = { cantidad: 0, total: 0 };
                            resumen[k].cantidad += Number(item.cantidad);
                            resumen[k].total += Number(item.subtotal);
                          }
                        }
                      }
                      const filas = Object.entries(resumen).sort((a, b) => b[1].cantidad - a[1].cantidad);
                      if (!filas.length) return <p style={{ textAlign: 'center', color: '#6b7280', padding: '1rem 0' }}>Sin detalle de productos disponible.</p>;
                      return (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ background: '#f3f4f6' }}>
                              <th style={{ padding: '0.5rem 1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontWeight: '700', color: '#374151' }}>Producto</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontWeight: '700', color: '#374151' }}>Cant. Total</th>
                              <th style={{ padding: '0.5rem 1rem', textAlign: 'right', borderBottom: '2px solid #e5e7eb', fontWeight: '700', color: '#374151' }}>Total $</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filas.map(([nombre, d]) => (
                              <tr key={nombre} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{ padding: '0.5rem 1rem' }}>{nombre}</td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: '600' }}>{d.cantidad}</td>
                                <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>${d.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                    {/* Totales por turno en pantalla */}
                    {(() => {
                      const { mañana, noche, otras } = clasificarTurnos(ventasImpresion);
                      const totalMañana = mañana.reduce((a, v) => a + parseFloat(v.total || 0), 0);
                      const totalNoche  = noche.reduce((a, v) => a + parseFloat(v.total || 0), 0);
                      const totalDia    = ventasImpresion.reduce((a, v) => a + parseFloat(v.total || 0), 0);
                      const totalOtras  = otras.reduce((a, v) => a + parseFloat(v.total || 0), 0);
                      return (
                        <div style={{ marginTop: '1.25rem', borderTop: '2px solid #374151', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef9c3', borderRadius: '8px', padding: '0.6rem 1rem' }}>
                            <div>
                              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#78350f' }}>Turno Mañana</span>
                              <span style={{ fontSize: '0.78rem', color: '#92400e', marginLeft: '0.5rem' }}>08:00 – 13:30 · {mañana.length} ped.</span>
                            </div>
                            <strong style={{ fontSize: '1.05rem', color: '#78350f' }}>${totalMañana.toFixed(2)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ede9fe', borderRadius: '8px', padding: '0.6rem 1rem' }}>
                            <div>
                              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#3730a3' }}>Turno Tarde</span>
                              <span style={{ fontSize: '0.78rem', color: '#4338ca', marginLeft: '0.5rem' }}>17:00 – 21:00 · {noche.length} ped.</span>
                            </div>
                            <strong style={{ fontSize: '1.05rem', color: '#3730a3' }}>${totalNoche.toFixed(2)}</strong>
                          </div>
                          {otras.length > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f3f4f6', borderRadius: '8px', padding: '0.6rem 1rem' }}>
                              <div>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#374151' }}>Fuera de turno</span>
                                <span style={{ fontSize: '0.78rem', color: '#6b7280', marginLeft: '0.5rem' }}>{otras.length} ped.</span>
                              </div>
                              <strong style={{ fontSize: '1.05rem', color: '#374151' }}>${totalOtras.toFixed(2)}</strong>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', borderRadius: '8px', padding: '0.75rem 1rem', marginTop: '0.25rem' }}>
                            <span style={{ fontWeight: '900', fontSize: '1rem', color: '#fff', letterSpacing: '0.5px' }}>TOTAL DEL DÍA</span>
                            <strong style={{ fontSize: '1.25rem', color: '#fff' }}>${totalDia.toFixed(2)}</strong>
                          </div>
                        </div>
                      );
                    })()}
                  </div>


                </>
              )}
            </div>

            <div className="modal-footer no-print" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setMostrarImpresion(false)}>
                Cerrar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => imprimirTotalTicket(ventasImpresion, periodo, fechaInicio, fechaFin)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Imprimir
              </button>
            </div>
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

export default Ventas;