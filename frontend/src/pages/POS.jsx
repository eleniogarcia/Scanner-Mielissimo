import React, { useState, useEffect, useRef } from 'react';
import { productosAPI, ventasAPI } from '../services/api';
import './POS.css';

function POS() {
  const [carrito, setCarrito] = useState([]);
  const [codigo, setCodigo] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [buscando, setBuscando] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionIndex, setSeleccionIndex] = useState(-1);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const scanBufferRef = useRef({ valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null, esEscaneo: false });
  const scanTimeoutRef = useRef(null);

  // Cargar carrito desde localStorage al iniciar
  useEffect(() => {
    const carritoGuardado = localStorage.getItem('pos_carrito');
    if (carritoGuardado) {
      try {
        const carritoData = JSON.parse(carritoGuardado);
        setCarrito(carritoData);
      } catch (error) {
        console.error('Error al cargar carrito:', error);
        localStorage.removeItem('pos_carrito');
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (carrito.length > 0) {
      localStorage.setItem('pos_carrito', JSON.stringify(carrito));
    } else {
      localStorage.removeItem('pos_carrito');
    }
  }, [carrito]);

  // Focus automático en el input al cargar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.parentElement.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Limpiar mensaje después de 3 segundos
  useEffect(() => {
    if (mensaje.texto) {
      const timer = setTimeout(() => {
        setMensaje({ tipo: '', texto: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  // Mantener focus en el input para que el escáner siempre funcione
  useEffect(() => {
    const handleGlobalClick = (e) => {
      // Si hacen click fuera de modales o botones, enfocar el input
      if (e.target.tagName !== 'BUTTON' && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          !e.target.closest('.modal-overlay') &&
          !e.target.closest('.sugerencias-dropdown')) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('click', handleGlobalClick);
    
    // Focus inicial
    inputRef.current?.focus();
    
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Calcular totales
  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calcularCantidadTotal = () => {
    return carrito.reduce((sum, item) => sum + item.cantidad, 0);
  };

  // Buscar producto directo (para escaneo - sin sugerencias)
  const buscarProductoDirecto = async (codigoProducto) => {
    if (!codigoProducto.trim()) {
      return;
    }

    setBuscando(true);
    setSugerencias([]);
    setMostrarSugerencias(false);
    
    try {
      const response = await productosAPI.getByCodigo(codigoProducto);
      const producto = response.data.data;
      
      agregarAlCarrito(producto);
      mostrarMensaje('success', `✓ ${producto.nombre} agregado`);
      setCodigo('');
      scanBufferRef.current = { valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null, esEscaneo: false };
    } catch (error) {
      if (error.response?.status === 404) {
        mostrarMensaje('error', `✗ Producto no encontrado: ${codigoProducto}`);
      } else {
        mostrarMensaje('error', 'Error al buscar producto');
      }
      console.error('Error:', error);
      setCodigo('');
      scanBufferRef.current = { valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null, esEscaneo: false };
    } finally {
      setBuscando(false);
    }
  };

  // Buscar producto por código (fallback para búsqueda directa)
  const buscarProducto = async (codigoProducto) => {
    if (!codigoProducto.trim()) {
      mostrarMensaje('error', 'Ingrese un código');
      return;
    }

    setBuscando(true);
    setMostrarSugerencias(false);
    try {
      const response = await productosAPI.getByCodigo(codigoProducto);
      const producto = response.data.data;
      
      agregarAlCarrito(producto);
      mostrarMensaje('success', `✓ ${producto.nombre} agregado`);
      setCodigo('');
      setSugerencias([]);
      scanBufferRef.current = { valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null, esEscaneo: false };
    } catch (error) {
      if (error.response?.status === 404) {
        mostrarMensaje('error', `✗ Producto no encontrado: ${codigoProducto}`);
      } else {
        mostrarMensaje('error', 'Error al buscar producto');
      }
      console.error('Error:', error);
    } finally {
      setBuscando(false);
    }
  };

  // Agregar producto al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito(prevCarrito => {
      const existe = prevCarrito.find(item => item.id === producto.id);
      
      if (existe) {
        return prevCarrito.map(item =>
          item.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precio
              }
            : item
        );
      } else {
        return [...prevCarrito, {
          id: producto.id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          precio: parseFloat(producto.precio),
          cantidad: 1,
          subtotal: parseFloat(producto.precio)
        }];
      }
    });
  };

  // Modificar cantidad
  const modificarCantidad = (productoId, nuevaCantidad) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(productoId);
      return;
    }

    setCarrito(prevCarrito =>
      prevCarrito.map(item => {
        if (item.id === productoId) {
          return {
            ...item,
            cantidad: nuevaCantidad,
            subtotal: nuevaCantidad * item.precio
          };
        }
        return item;
      })
    );
  };

  // Eliminar del carrito
  const eliminarDelCarrito = (productoId) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== productoId));
  };

  // Limpiar carrito
  const limpiarCarrito = () => {
    setCarrito([]);
    setCodigo('');
    setMensaje({ tipo: '', texto: '' });
    setSugerencias([]);
    setMostrarSugerencias(false);
    localStorage.removeItem('pos_carrito');
  };

  // Procesar venta
  const procesarVenta = async () => {
    if (carrito.length === 0) {
      mostrarMensaje('error', 'El carrito está vacío');
      return;
    }

    if (!window.confirm('¿Confirmar venta?')) {
      return;
    }

    setProcesandoVenta(true);
    try {
      const ventaData = {
        items: carrito.map(item => ({
          producto_id: item.id,
          cantidad: item.cantidad
        })),
        metodo_pago: 'efectivo'
      };

      const response = await ventasAPI.create(ventaData);
      
      mostrarMensaje('success', `✓ Venta registrada #${response.data.data.id} - Total: $${response.data.data.total}`);
      limpiarCarrito();
      
      // Opcional: Imprimir ticket
      console.log('Venta registrada:', response.data.data);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Error al procesar la venta';
      mostrarMensaje('error', `✗ ${errorMsg}`);
      console.error('Error:', error);
    } finally {
      setProcesandoVenta(false);
    }
  };

  // Mostrar mensaje
  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
  };

  // Buscar sugerencias mientras escribe
  const buscarSugerencias = async (termino) => {
    if (!termino.trim() || termino.length < 2) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }

    setBuscando(true);
    try {
      const response = await productosAPI.search(termino);
      setSugerencias(response.data.data || []);
      setMostrarSugerencias(response.data.data.length > 0);
      setSeleccionIndex(-1);
    } catch (error) {
      setSugerencias([]);
      setMostrarSugerencias(false);
    } finally {
      setBuscando(false);
    }
  };

  // Búsqueda automática al escribir (solo para input manual)
  const handleCodigoChange = (e) => {
    const valor = e.target.value;
    setCodigo(valor);
    
    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
    
    // Si el valor es vacío, limpiar sugerencias
    if (!valor.trim()) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      scanBufferRef.current = { valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null };
      return;
    }
    
    // Detectar si es escaneo o escritura manual
    const ahora = Date.now();
    
    // Si es el primer carácter, marcar inicio
    if (!scanBufferRef.current.inicioEscritura || scanBufferRef.current.valor === '') {
      scanBufferRef.current = { 
        valor: valor, 
        ultimaActualizacion: ahora, 
        inicioEscritura: ahora,
        esEscaneo: true 
      };
    } else {
      const tiempoDesdeInicio = ahora - scanBufferRef.current.inicioEscritura;
      const tiempoEntreCaracteres = ahora - scanBufferRef.current.ultimaActualizacion;
      
      // Si cada carácter llega rápido (< 50ms), probablemente es escáner
      // Si tarda más de 100ms entre caracteres, es escritura manual
      const esEscaneo = tiempoEntreCaracteres < 100 && tiempoDesdeInicio < 500;
      
      scanBufferRef.current = { 
        valor: valor, 
        ultimaActualizacion: ahora,
        inicioEscritura: scanBufferRef.current.inicioEscritura,
        esEscaneo: esEscaneo
      };
    }
    
    // Solo mostrar sugerencias para escritura manual lenta
    // Esperar 400ms para asegurarse de que no es un escaneo
    timeoutRef.current = setTimeout(() => {
      // Si no es escaneo y el usuario está escribiendo lentamente, mostrar sugerencias
      if (!scanBufferRef.current.esEscaneo && valor.length >= 2) {
        buscarSugerencias(valor);
      }
    }, 400);
  };
  
  // Seleccionar producto de las sugerencias
  const seleccionarProducto = (producto) => {
    agregarAlCarrito(producto);
    mostrarMensaje('success', `✓ ${producto.nombre} agregado`);
    setCodigo('');
    scanBufferRef.current = { valor: '', ultimaActualizacion: Date.now(), inicioEscritura: null, esEscaneo: false };
    setSugerencias([]);
    setMostrarSugerencias(false);
    inputRef.current?.focus();
  };

  // Manejar teclas en el input
  const handleKeyPress = (e) => {
    // Si presiona Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Cancelar cualquier búsqueda de sugerencias pendiente
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Ocultar sugerencias inmediatamente
      setSugerencias([]);
      setMostrarSugerencias(false);
      setSeleccionIndex(-1);
      
      // Si hay sugerencias visibles y navegó con flechas
      if (seleccionIndex >= 0 && sugerencias.length > 0) {
        seleccionarProducto(sugerencias[seleccionIndex]);
        return;
      }
      
      // Si hay código, buscar directamente (escaneo o búsqueda manual)
      if (codigo.trim()) {
        buscarProductoDirecto(codigo);
      }
      return;
    }

    // Navegación en sugerencias con flechas
    if (mostrarSugerencias && sugerencias.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSeleccionIndex(prev => 
            prev < sugerencias.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSeleccionIndex(prev => prev > 0 ? prev - 1 : sugerencias.length - 1);
          break;
        case 'Escape':
          e.preventDefault();
          setSugerencias([]);
          setMostrarSugerencias(false);
          setSeleccionIndex(-1);
          break;
        default:
          break;
      }
    }
  };

  return (
    <div className="pos-container">
      <div className="pos-layout">
        {/* Panel izquierdo - Escaneo y búsqueda */}
        <div className="pos-left">
          <div className="card">
            <div className="scan-section">
              <h2 className="section-title">
                <span>🔍</span> Escanear Producto
              </h2>
              
              <div className="scan-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  className="input scan-input"
                  placeholder="✨ Escanee o escriba el código del producto..."
                  value={codigo}
                  onChange={handleCodigoChange}
                  onKeyDown={handleKeyPress}
                  disabled={procesandoVenta}
                  autoFocus
                />
                {buscando && (
                  <div className="searching-indicator">
                    <div className="spinner"></div>
                    <span>Buscando...</span>
                  </div>
                )}
                
                {/* Dropdown de sugerencias */}
                {mostrarSugerencias && sugerencias.length > 0 && (
                  <div className="sugerencias-dropdown">
                    {sugerencias.map((producto, index) => (
                      <div
                        key={producto.id}
                        className={`sugerencia-item ${index === seleccionIndex ? 'selected' : ''}`}
                        onClick={() => seleccionarProducto(producto)}
                        onMouseEnter={() => setSeleccionIndex(index)}
                      >
                        <div className="sugerencia-info">
                          <div className="sugerencia-nombre">{producto.nombre}</div>
                          {producto.codigo && (
                            <div className="sugerencia-codigo">{producto.codigo}</div>
                          )}
                        </div>
                        <div className="sugerencia-derecha">
                          <div className="sugerencia-precio">${parseFloat(producto.precio).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`}>
                  {mensaje.texto}
                </div>
              )}
            </div>

            {/* Carrito */}
            <div className="carrito-section">
              <div className="carrito-header">
                <h3 className="section-title">
                  <span>🛒</span> Carrito ({calcularCantidadTotal()} items)
                </h3>
                {carrito.length > 0 && (
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={limpiarCarrito}
                    disabled={procesandoVenta}
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="carrito-vacio">
                  <p>El carrito está vacío</p>
                  <p className="text-sm text-secondary">Escanee un producto para comenzar</p>
                </div>
              ) : (
                <div className="carrito-items">
                  {carrito.map((item) => (
                    <div key={item.id} className="carrito-item fade-in">
                      <div className="item-info">
                        <div className="item-nombre">{item.nombre}</div>
                        {item.codigo && (
                          <div className="item-codigo">{item.codigo}</div>
                        )}
                        <div className="item-precio">${item.precio.toFixed(2)} c/u</div>
                      </div>
                      
                      <div className="item-controls">
                        <div className="cantidad-controls">
                          <button
                            className="btn-cantidad"
                            onClick={() => modificarCantidad(item.id, item.cantidad - 1)}
                            disabled={procesandoVenta}
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="input-cantidad"
                            value={item.cantidad}
                            onChange={(e) => modificarCantidad(item.id, parseInt(e.target.value) || 0)}
                            min="1"
                            disabled={procesandoVenta}
                          />
                          <button
                            className="btn-cantidad"
                            onClick={() => modificarCantidad(item.id, item.cantidad + 1)}
                            disabled={procesandoVenta}
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="item-subtotal">
                          ${item.subtotal.toFixed(2)}
                        </div>
                        
                        <button
                          className="btn-eliminar"
                          onClick={() => eliminarDelCarrito(item.id)}
                          disabled={procesandoVenta}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho - Total y checkout */}
        <div className="pos-right">
          <div className="card checkout-card">
            <h2 className="section-title">
              <span>💳</span> Resumen de Compra
            </h2>
            
            <div className="checkout-info">
              <div className="info-row">
                <span>Productos:</span>
                <span>{calcularCantidadTotal()}</span>
              </div>
              <div className="info-row">
                <span>Items en carrito:</span>
                <span>{carrito.length}</span>
              </div>
            </div>

            <div className="total-section">
              <div className="total-label">Total a pagar</div>
              <div className="total-amount">
                ${calcularTotal().toFixed(2)}
              </div>
            </div>

            <button
              className="btn btn-success btn-lg checkout-btn"
              onClick={procesarVenta}
              disabled={carrito.length === 0 || procesandoVenta}
            >
              {procesandoVenta ? 'Procesando...' : 'Procesar Venta'}
            </button>

            {carrito.length > 0 && (
              <div className="checkout-tips">
                <p className="text-sm text-secondary">
                  💡 Escribe para buscar productos y selecciona con las flechas ↑↓ o con el mouse
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default POS;
