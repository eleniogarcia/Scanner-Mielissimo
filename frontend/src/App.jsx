import React, { lazy, Suspense, useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import POS from './pages/POS';

const Productos = lazy(() => import('./pages/Productos'));
const Ventas    = lazy(() => import('./pages/Ventas'));
const Vencimientos = lazy(() => import('./pages/Vencimientos'));

const PageLoader = () => (
  <div style={{ padding: '3rem', textAlign: 'center', color: '#8b94a6', fontFamily: 'Inter, sans-serif' }}>
    Cargando...
  </div>
);

function App() {
  // 'vender', 'productos', 'vencimientos', 'ventas'
  const [activeModule, setActiveModule] = useState('vender');

  return (
    <div className="App">
      <Navbar activeModule={activeModule} setActiveModule={setActiveModule} />
      
      {/* CAPA BASE: Vender siempre montado y renderizado */}
      <div className="module-base" style={{ 
        position: activeModule === 'vender' ? 'relative' : 'absolute',
        opacity: activeModule === 'vender' ? 1 : 0,
        visibility: activeModule === 'vender' ? 'visible' : 'hidden',
        pointerEvents: activeModule === 'vender' ? 'auto' : 'none',
        zIndex: activeModule === 'vender' ? 1 : 0,
        top: 0, left: 0, right: 0
      }}>
        <POS isActive={activeModule === 'vender'} />
      </div>

      {/* CAPA SUPERIOR: Otros módulos superpuestos */}
      {activeModule !== 'vender' && (
        <div className="module-overlay">
          <Suspense fallback={<PageLoader />}>
            {activeModule === 'productos' && <Productos />}
            {activeModule === 'vencimientos' && <Vencimientos />}
            {activeModule === 'ventas' && <Ventas />}
          </Suspense>
        </div>
      )}
    </div>
  );
}

export default App;
