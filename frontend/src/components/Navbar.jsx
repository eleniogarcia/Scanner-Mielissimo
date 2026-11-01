import React from 'react';
import './Navbar.css';

function Navbar({ activeModule, setActiveModule, cajaAbierta }) {

  const isActive = (module) => {
    return activeModule === module ? 'active' : '';
  };

  const navigateTo = (e, module) => {
    e.preventDefault();
    setActiveModule(module);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <div className="navbar-brand">
            <a href="#" onClick={(e) => navigateTo(e, 'vender')}>
              <svg className="logo-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
              <span className="brand-text">Mielissimo</span>
            </a>
          </div>
          
          <ul className="navbar-menu">
            <li>
              <a href="#" className={isActive('vender')} onClick={(e) => navigateTo(e, 'vender')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                Vender
              </a>
            </li>
            <li>
              <a href="#" className={isActive('productos')} onClick={(e) => navigateTo(e, 'productos')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                Productos
              </a>
            </li>
            <li>
              <a href="#" className={isActive('vencimientos')} onClick={(e) => navigateTo(e, 'vencimientos')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                Vencimientos
              </a>
            </li>
            <li>
              <a href="#" className={isActive('caja')} onClick={(e) => navigateTo(e, 'caja')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                Caja
                {cajaAbierta !== undefined && (
                  <span
                    className={`caja-dot ${cajaAbierta ? 'caja-dot-abierta' : 'caja-dot-cerrada'}`}
                    title={cajaAbierta ? 'Caja abierta' : 'Caja cerrada'}
                  />
                )}
              </a>
            </li>
            <li>
              <a href="#" className={isActive('ventas')} onClick={(e) => navigateTo(e, 'ventas')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Historial
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
