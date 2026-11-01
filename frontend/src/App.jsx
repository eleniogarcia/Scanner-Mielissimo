import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import POS from './pages/POS';
import { cajaAPI } from './services/api';

const Productos = lazy(() => import('./pages/Productos'));
const Ventas    = lazy(() => import('./pages/Ventas'));
const Vencimientos = lazy(() => import('./pages/Vencimientos'));
const Caja = lazy(() => import('./pages/Caja'));

const PageLoader = () => (
  <div style={{ padding: '3rem', textAlign: 'center', color: '#8b94a6', fontFamily: 'Inter, sans-serif' }}>
    Cargando...
  </div>
);

function App() {
  // 'vender', 'productos', 'vencimientos', 'ventas', 'caja'
  const [activeModule, setActiveModule] = useState('vender');

  // Estado de la caja compartido entre Vender, Caja y la barra de navegación.
  // undefined = cargando, null = caja cerrada, objeto = { caja, resumen, movimientos }
  const [cajaEstado, setCajaEstado] = useState(undefined);
  const [cajaError, setCajaError] = useState(false);

  const refreshCaja = useCallback(async () => {
    try {
      const response = await cajaAPI.getActual();
      setCajaEstado(response.data.data);
      setCajaError(false);
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo la caja:', error);
      setCajaError(true);
      return undefined;
    }
  }, []);

  useEffect(() => { refreshCaja(); }, [refreshCaja]);

  // Al volver a Vender o entrar a Caja, refrescar por si cambió algo
  useEffect(() => {
    if (activeModule === 'vender' || activeModule === 'caja') refreshCaja();
  }, [activeModule, refreshCaja]);

  return (
    <div className="App">
      <Navbar activeModule={activeModule} setActiveModule={setActiveModule} cajaAbierta={cajaEstado ? true : cajaEstado === null ? false : undefined} />
      
      {/* CAPA BASE: Vender siempre montado y renderizado */}
      <div className="module-base" style={{ 
        position: activeModule === 'vender' ? 'relative' : 'absolute',
        opacity: activeModule === 'vender' ? 1 : 0,
        visibility: activeModule === 'vender' ? 'visible' : 'hidden',
        pointerEvents: activeModule === 'vender' ? 'auto' : 'none',
        zIndex: activeModule === 'vender' ? 1 : 0,
        top: 0, left: 0, right: 0
      }}>
        <POS
          isActive={activeModule === 'vender'}
          cajaEstado={cajaEstado}
          cajaError={cajaError}
          refreshCaja={refreshCaja}
          irACaja={() => setActiveModule('caja')}
        />
      </div>

      {/* CAPA SUPERIOR: Otros módulos superpuestos */}
      {activeModule !== 'vender' && (
        <div className="module-overlay">
          <Suspense fallback={<PageLoader />}>
            {activeModule === 'productos' && <Productos />}
            {activeModule === 'vencimientos' && <Vencimientos />}
            {activeModule === 'ventas' && <Ventas />}
            {activeModule === 'caja' && <Caja cajaEstado={cajaEstado} refreshCaja={refreshCaja} />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;
