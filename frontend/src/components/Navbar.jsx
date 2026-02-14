import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

function Navbar() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <div className="navbar-brand">
            <Link to="/">
              <span className="logo">🏪</span>
              <span className="brand-text">Mielissimo</span>
            </Link>
          </div>
          
          <ul className="navbar-menu">
            <li>
              <Link to="/" className={isActive('/')}>
                <span>🛒</span> Vender
              </Link>
            </li>
            <li>
              <Link to="/productos" className={isActive('/productos')}>
                <span>📦</span> Productos
              </Link>
            </li>
            <li>
              <Link to="/ventas" className={isActive('/ventas')}>
                <span>📊</span> Historial
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
