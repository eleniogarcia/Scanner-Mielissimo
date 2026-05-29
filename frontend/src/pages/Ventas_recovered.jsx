import React, { useState, useEffect, useRef } from 'react';
import { ventasAPI } from '../services/api';
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

  useEffect(() 
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