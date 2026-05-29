import React, { useState, useEffect, useRef } from 'react';

import { productosAPI, ventasAPI } from '../services/api';
import './POS.css';

function POS({ isActive }) {
  
  // ── Tabs (pedidos simultáneos) ─────────────────────────────────
  const tabCounterRef = useRef(null);

  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('pos_tabs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        localStorage.removeItem('pos_tabs');
      }
    }
    return [{ id: 1, nombre: 'Pedido 1', carrito: [] }];
  });

  const [activeTabId, setActiveTabId] = useState(() => {
    const saved = localStorage.getItem('pos_active_tab');
    return saved ? parseInt(saved, 10) : 1;
  });

  if (tabCounterRef.current === null) {
    tabCounterRef.current = Math.max(...tabs.map(t => t.id), 1);
  }

  // Carrito activo derivado del tab seleccionado
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const carrito = activeTab ? activeTab.carrito : [];

  // Setter que actualiza el carrito del tab activo
  const setCarrito = (fnOrValue) => {
    const tabId = activeTab ? activeTab.id : activeTabId;
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const newCarrito = typeof fnOrValue === 'function' ? fnOrValue(t.carrito) : fnOrValue;
      return { ...t, carrito: newCarrito };
    }));
  };

  // ── Resto del estado ───────────────────────────────────────────
  const [codigo, setCodigo] = useState('');
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [buscando, setBuscando] = useState(false);
  const [procesandoVentaMap, setProcesandoVentaMap] = useState({});
  const [ventaExitosaMap, setVentaExitosaMap] = useState({});
  const [itemsAnimandoMap, setItemsAnimandoMap] = useState({});
  const procesandoVenta = !!procesandoVentaMap[activeTabId];
  const ventaExitosa = ventaExitosaMap[activeTabId] || null;
  const itemsAnimando = !!itemsAnimandoMap[activeTabId];
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [seleccionIndex, setSeleccionIndex] = useState(-1);
  const [escaneosPendientes, setEscaneosPendientes] = useState(0);
  const [modalVarios, setModalVarios] = useState({ visible: false, precio: '', descripcion: '' });
  const [editandoNombreTab, setEditandoNombreTab] = useState(null);
  const [nombreTabEdit, setNombreTabEdit] = useState('');
  const [imprimirTicket, setImprimirTicket] = useState(() => {
    const saved = localStorage.getItem('pos_imprimir_ticket');
    return saved !== null ? saved === 'true' : true;
  });

  const inputRef = useRef(null);
  const inputPrecioVariosRef = useRef(null);
  const inputNombreTabRef = useRef(null);
  const posContainerRef = useRef(null);
  const timeoutRef = useRef(null);
  const buscandoTimeoutRef = useRef(null);
  const scanBufferRef = useRef({ valor: '', inicioEscritura: null });
  const globalScanRef = useRef({ valor: '', inicio: null, ultimo: null });
  const procesarCodigoEscaneadoRef = useRef(() => {});
  const ultimoScanProcesadoRef = useRef({ codigo: '', ts: 0 });
  const colaEscaneoRef = useRef([]);
  const procesandoColaEscaneoRef = useRef(false);
  const variosCounterRef = useRef(0);
  const isPrintingRef = useRef(false);
  const procesandoVentaTimersRef = useRef({});
  const ventaExitosaTimersRef = useRef({});
  const audioCtxRef = useRef(null);
  const pendingSearchesRef = useRef(0);
  const sugerenciasRequestIdRef = useRef(0);

  const esCampoDeEscritura = (element) => {
    if (!element) return false;
    const tag = element.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
  };

  const limpiarEstadoInteractivo = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (buscandoTimeoutRef.current) {
      clearTimeout(buscandoTimeoutRef.current);
      buscandoTimeoutRef.current = null;
    }
    pendingSearchesRef.current = 0;
    sugerenciasRequestIdRef.current += 1;
    scanBufferRef.current = { valor: '', inicioEscritura: null };
    globalScanRef.current = { valor: '', inicio: null, ultimo: null };
    ultimoScanProcesadoRef.current = { codigo: '', ts: 0 };
    colaEscaneoRef.current = [];
    procesandoColaEscaneoRef.current = false;

    Object.values(ventaExitosaTimersRef.current).forEach(timer => clearTimeout(timer));
    ventaExitosaTimersRef.current = {};
    Object.values(procesandoVentaTimersRef.current).forEach(timer => clearTimeout(timer));
    procesandoVentaTimersRef.current = {};

    setBuscando(false);
    setProcesandoVentaMap({});
    setVentaExitosaMap({});
    setItemsAnimandoMap({});
    setModalConfirmar(false);
    setModalVarios({ visible: false, precio: '', descripcion: '' });
    setEditandoNombreTab(null);
    setCodigo('');
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionIndex(-1);
    setEscaneosPendientes(0);
    setMensaje({ tipo: '', texto: '' });
  };

  const limpiarRefsTemporales = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (buscandoTimeoutRef.current) {
      clearTimeout(buscandoTimeoutRef.current);
      buscandoTimeoutRef.current = null;
    }
    Object.values(ventaExitosaTimersRef.current).forEach(timer => clearTimeout(timer));
    ventaExitosaTimersRef.current = {};
    Object.values(procesandoVentaTimersRef.current).forEach(timer => clearTimeout(timer));
    procesandoVentaTimersRef.current = {};
    pendingSearchesRef.current = 0;
    sugerenciasRequestIdRef.current += 1;
    scanBufferRef.current = { valor: '', inicioEscritura: null };
    globalScanRef.current = { valor: '', inicio: null, ultimo: null };
    colaEscaneoRef.current = [];
    procesandoColaEscaneoRef.current = false;
  };

  const focusScanInput = ({ force = false } = {}) => {
    const input = inputRef.current;
    if (!input || input.disabled) return;
    if (!force && (modalConfirmar || modalVarios.visible || editandoNombreTab !== null)) return;

    const active = document.activeElement;
    // Si el usuario está escribiendo en otro input/textarea (o contenteditable), no robar foco.
    if (!force && active && active !== document.body && active !== document.documentElement) {
      const estaDentroDelPOS = posContainerRef.current?.contains(active);
      const isTypingTarget = esCampoDeEscritura(active);
      if (isTypingTarget && active !== input && estaDentroDelPOS) return;
      if (active.closest?.('.modal-overlay') || active.closest?.('.tab-nombre-input')) return;
    }

    try {
      // Forzar ciclo blur -> focus para asegurar foco real en Electron
      input.blur();
      input.focus({ preventScroll: true });
    } catch {
      try {
        input.blur();
        input.focus();
      } catch { /* noop */ }
    }
  };

  // Reproducir sonido de éxito o error usando Web Audio API
  const reproducirSonido = (tipo) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (tipo === 'success') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // silenciar si el browser bloquea audio
    }
  };
  // Ref para detectar resultados de búsqueda obsoletos al cambiar de tab
  const activeTabIdRef = useRef(activeTabId);

  // ── Persistencia en localStorage ──────────────────────────────
  useEffect(() => {
    localStorage.setItem('pos_tabs', JSON.stringify(tabs));
  }, [tabs]);

  useEffect(() => {
    localStorage.setItem('pos_active_tab', String(activeTab ? activeTab.id : activeTabId));
    activeTabIdRef.current = activeTabId;
  }, [activeTab, activeTabId]);

  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  useEffect(() => {
    localStorage.setItem('pos_imprimir_ticket', imprimirTicket.toString());
  }, [imprimirTicket]);

  // Función auxiliar para forzar el foco en el input con reintentos (bypass de todas las guardas)
  const forzarFocoConReintentos = () => {
    // Asegurarnos de que la ventana tiene el foco a nivel OS primero
    window.focus();
    // Reintentar múltiples veces con delays crecientes para lidiar con Electron
    const delays = [50, 150, 350, 600, 1000];
    const timers = [];
    delays.forEach(delay => {
      const t = setTimeout(() => {
        const input = inputRef.current;
        if (!input || input.disabled) return;
        // Bypass total: quitar foco del elemento activo y forzar al input del scanner
        try {
          if (document.activeElement) {
            document.activeElement.blur();
          }
          input.focus({ preventScroll: true });
        } catch {
          try { input.focus(); } catch { /* noop */ }
        }
      }, delay);
      timers.push(t);
    });
    return timers;
  };

  // Al volver a la ruta POS (/), limpiar estado y refocalizar.
  // POS nunca se desmonta — solo se oculta con CSS — pero igual necesitamos reintentos agresivos para Electron.
  useEffect(() => {
    if (!isActive) {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      return;
    }
    limpiarEstadoInteractivo();
    const timers = forzarFocoConReintentos();
    return () => {
      timers.forEach(t => clearTimeout(t));
      limpiarRefsTemporales();
    };
  }, [isActive]);

  // Recuperar foco cuando la ventana vuelve a estar activa (muy común en Electron)
  useEffect(() => {
    if (!isActive) return; // No interferir cuando POS está oculto
    const onWindowFocus = () => {
      const delays = [30, 120, 300, 600];
      delays.forEach(delay => setTimeout(() => focusScanInput(), delay));
    };
    const onVisibility = () => {
      if (!document.hidden) {
        const delays = [30, 120, 300];
        delays.forEach(delay => setTimeout(() => focusScanInput(), delay));
      }
    };
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [modalConfirmar, modalVarios.visible, editandoNombreTab, procesandoVenta, isActive]);

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
    if (!isActive) return; // No interferir cuando POS está oculto
    const handleGlobalClick = (e) => {
      const target = e.target;
      if (!posContainerRef.current?.contains(target)) return;
      if (!target.closest?.('button') &&
          !esCampoDeEscritura(target) &&
          !target.closest?.('.modal-overlay') &&
          !target.closest?.('.sugerencias-dropdown') &&
          !target.closest?.('.tab-nombre-input')) {
        focusScanInput();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    focusScanInput();
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [modalConfirmar, modalVarios.visible, editandoNombreTab, procesandoVenta, isActive]);

  // Captura global del escáner aunque el foco no esté en el buscador
  useEffect(() => {
    if (!isActive) return; // No capturar teclas cuando POS está oculto

    const resetGlobalScan = () => {
      globalScanRef.current = { valor: '', inicio: null, ultimo: null };
    };

    const handleGlobalScanner = (e) => {
      if (procesandoVenta) return;
      if (modalConfirmar || modalVarios.visible || editandoNombreTab !== null) {
        resetGlobalScan();
        return;
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (document.activeElement === inputRef.current) return;
      if (esCampoDeEscritura(document.activeElement) || document.activeElement?.closest?.('.modal-overlay')) {
        resetGlobalScan();
        return;
      }

      const ahora = Date.now();
      const scanActual = globalScanRef.current;
      const tiempoSinTeclas = scanActual.ultimo ? ahora - scanActual.ultimo : 0;

      if (e.key === 'Enter') {
        const codigoLeido = (scanActual.valor || '').trim();
        const duracion = scanActual.inicio ? ahora - scanActual.inicio : 9999;
        const totalTeclas = codigoLeido.length;
        const promedioPorTecla = totalTeclas > 0 ? duracion / totalTeclas : 9999;
        const pareceEscaneo = totalTeclas >= 3 && duracion < 700 && promedioPorTecla < 70;

        resetGlobalScan();

        if (!pareceEscaneo) return;

        e.preventDefault();
        if (codigoLeido) {
          procesarCodigoEscaneadoRef.current(codigoLeido);
        }
        return;
      }

      if (e.key.length !== 1) return;

      if (tiempoSinTeclas > 120) {
        globalScanRef.current = { valor: e.key, inicio: ahora, ultimo: ahora };
        return;
      }

      globalScanRef.current = {
        valor: `${scanActual.valor || ''}${e.key}`,
        inicio: scanActual.inicio || ahora,
        ultimo: ahora
      };
    };

    document.addEventListener('keydown', handleGlobalScanner);
    return () => document.removeEventListener('keydown', handleGlobalScanner);
  }, [procesandoVenta, modalConfirmar, modalVarios.visible, editandoNombreTab, isActive]);

  // ── Gestión de tabs ────────────────────────────────────────────
  const agregarTab = () => {
    tabCounterRef.current += 1;
    const nuevoTab = { id: tabCounterRef.current, nombre: `Pedido ${tabCounterRef.current}`, carrito: [] };
    setTabs(prev => [...prev, nuevoTab]);
    setActiveTabId(tabCounterRef.current);
  };

  const cerrarTab = (e, tabId) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    // Limpiar timers y estado colgado del tab cerrado
    if (ventaExitosaTimersRef.current[tabId]) {
      clearTimeout(ventaExitosaTimersRef.current[tabId]);
      delete ventaExitosaTimersRef.current[tabId];
    }
    if (procesandoVentaTimersRef.current[tabId]) {
      clearTimeout(procesandoVentaTimersRef.current[tabId]);
      delete procesandoVentaTimersRef.current[tabId];
    }
    setProcesandoVentaMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
    setVentaExitosaMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
    setItemsAnimandoMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
    setTabs(prev => prev.filter(t => t.id !== tabId));
    if (activeTabId === tabId) {
      const idx = tabs.findIndex(t => t.id === tabId);
      const fallback = tabs[idx - 1] || tabs[idx + 1];
      if (fallback) setActiveTabId(fallback.id);
    }
  };

  const cambiarTab = (tabId) => {
    if (tabId !== activeTabId) setActiveTabId(tabId);
  };

  const iniciarEditarNombreTab = (e, tabId, nombreActual) => {
    e.stopPropagation();
    setEditandoNombreTab(tabId);
    setNombreTabEdit(nombreActual);
    setTimeout(() => inputNombreTabRef.current?.select(), 30);
  };

  const confirmarNombreTab = () => {
    if (!nombreTabEdit.trim()) { setEditandoNombreTab(null); return; }
    setTabs(prev => prev.map(t =>
      t.id === editandoNombreTab ? { ...t, nombre: nombreTabEdit.trim() } : t
    ));
    setEditandoNombreTab(null);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  // ── Cálculos ───────────────────────────────────────────────────
  const calcularTotal = () => carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const calcularCantidadTotal = () => carrito.reduce((sum, item) => sum + item.cantidad, 0);
  const totalDeTab = (tab) => tab.carrito.reduce((s, i) => s + i.subtotal, 0);
  const itemsDeTab = (tab) => tab.carrito.reduce((s, i) => s + i.cantidad, 0);

  // Buscar producto directo (para escaneo - sin sugerencias)
  const iniciarBusqueda = () => {
    pendingSearchesRef.current += 1;
    setBuscando(true);
    if (buscandoTimeoutRef.current) {
      clearTimeout(buscandoTimeoutRef.current);
    }
    buscandoTimeoutRef.current = setTimeout(() => {
      pendingSearchesRef.current = 0;
      setBuscando(false);
      buscandoTimeoutRef.current = null;
    }, 8000);
  };

  const finalizarBusqueda = () => {
    pendingSearchesRef.current = Math.max(0, pendingSearchesRef.current - 1);
    if (pendingSearchesRef.current === 0) {
      if (buscandoTimeoutRef.current) {
        clearTimeout(buscandoTimeoutRef.current);
        buscandoTimeoutRef.current = null;
      }
      setBuscando(false);
    }
  };

  const buscarProductoDirecto = async (codigoProducto) => {
    if (!codigoProducto.trim()) return;
    const tabIdWhenStarted = activeTabIdRef.current;

    iniciarBusqueda();
    setSugerencias([]);
    setMostrarSugerencias(false);
    
    try {
      const response = await productosAPI.getByCodigo(codigoProducto);
      if (activeTabIdRef.current !== tabIdWhenStarted) return; // tab cambió, ignorar
      const producto = response.data.data;
      agregarAlCarrito(producto);
      reproducirSonido('success');
      mostrarMensaje('success', `✓ ${producto.nombre} agregado`);
      setCodigo('');
      scanBufferRef.current = { valor: '', inicioEscritura: null };
    } catch (error) {
      // NO retornamos aunque el tab haya cambiado — el error SIEMPRE debe mostrarse
      reproducirSonido('error');
      if (error.response?.status === 404) {
        mostrarMensaje('error', `✗ Código no encontrado: ${codigoProducto}`);
      } else {
        mostrarMensaje('error', 'Error al buscar producto');
      }
      console.error('Error:', error);
      setCodigo('');
      scanBufferRef.current = { valor: '', inicioEscritura: null };
    } finally {
      finalizarBusqueda();
    }
  };

  const ejecutarColaEscaneo = async () => {
    if (procesandoColaEscaneoRef.current) return;
    procesandoColaEscaneoRef.current = true;

    try {
      while (colaEscaneoRef.current.length > 0) {
        setEscaneosPendientes(colaEscaneoRef.current.length);
        const codigo = colaEscaneoRef.current.shift();
        if (!codigo) continue;
        await buscarProductoDirecto(codigo);
      }
    } finally {
      procesandoColaEscaneoRef.current = false;
      setEscaneosPendientes(0);
    }
  };

  // Evita doble alta accidental del mismo código en una ventana muy corta
  const procesarCodigoEscaneado = (codigoCrudo) => {
    const codigoNormalizado = (codigoCrudo || '').trim();
    if (!codigoNormalizado) return;

    const ahora = Date.now();
    const ultimo = ultimoScanProcesadoRef.current;
    const esDuplicadoInmediato =
      ultimo.codigo === codigoNormalizado &&
      (ahora - ultimo.ts) < 250;

    if (esDuplicadoInmediato) return;

    ultimoScanProcesadoRef.current = { codigo: codigoNormalizado, ts: ahora };
    colaEscaneoRef.current.push(codigoNormalizado);
    setEscaneosPendientes(colaEscaneoRef.current.length);
    ejecutarColaEscaneo();
  };

  procesarCodigoEscaneadoRef.current = procesarCodigoEscaneado;

  // Agregar producto al carrito
  const agregarAlCarrito = (producto) => {
    setCarrito(prevCarrito => {
      const existe = prevCarrito.find(item => item.id === producto.id);
      
      if (existe) {
        // Si ya existe, mover al principio y aumentar cantidad
        return [
          {
            ...existe,
            cantidad: existe.cantidad + 1,
            subtotal: (existe.cantidad + 1) * existe.precio
          },
          ...prevCarrito.filter(item => item.id !== producto.id)
        ];
      } else {
        // Si es nuevo, agregar al principio
        return [{
          id: producto.id,
          nombre: producto.nombre,
          codigo: producto.codigo,
          precio: parseFloat(producto.precio),
          cantidad: 1,
          subtotal: parseFloat(producto.precio)
        }, ...prevCarrito];
      }
    });
  };

  // Abrir modal de producto especial Varios
  const abrirModalVarios = () => {
    setModalVarios({ visible: true, precio: '', descripcion: '' });
    setTimeout(() => inputPrecioVariosRef.current?.focus(), 60);
  };

  // Confirmar y agregar Varios al carrito
  const confirmarVarios = () => {
    const precio = parseFloat(modalVarios.precio);
    if (!modalVarios.precio || isNaN(precio) || precio <= 0) return;

    const nombre = modalVarios.descripcion?.trim()
      ? `Varios – ${modalVarios.descripcion.trim()}`
      : 'Varios';

    variosCounterRef.current += 1;
    const nuevoItem = {
      id: `varios_${Date.now()}_${variosCounterRef.current}`,
      nombre,
      codigo: null,
      precio,
      cantidad: 1,
      subtotal: precio,
      esEspecial: true
    };

    setCarrito(prev => [nuevoItem, ...prev]);
    mostrarMensaje('success', `✓ ${nombre} agregado ($${precio.toFixed(2)})`);
    setModalVarios({ visible: false, precio: '', descripcion: '' });
    inputRef.current?.focus();
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

  const limpiarCarrito = () => {
    setCarrito([]);
    setCodigo('');
    setMensaje({ tipo: '', texto: '' });
    setSugerencias([]);
    setMostrarSugerencias(false);
  };

  // Procesar venta — abre modal de confirmación
  const procesarVenta = () => {
    if (carrito.length === 0) {
      mostrarMensaje('error', 'El carrito está vacío');
      return;
    }
    setModalConfirmar(true);
  };

  // Imprimir ticket en impresora térmica
  const imprimirTicketTermico = (venta, items) => {
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const hora  = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const itemsHTML = items.map(item => {
      const nombre = item.nombre; // nombre completo, sin cortar
      const subtotal = `$${parseFloat(item.subtotal).toFixed(2)}`;
      const cant = `${item.cantidad}x`;
      return `<tr>
        <td class="td-nombre">${nombre}</td>
        <td class="td-cant">${cant}</td>
        <td class="td-precio">${subtotal}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Ticket Mielissimo</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 16px;
    font-weight: 900;
    width: 80mm;
    padding: 4mm 3mm;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .centro { text-align: center; }
  .titulo { font-size: 28px; font-weight: 900; letter-spacing: 3px; margin: 6px 0 3px; }
  .subtitulo { font-size: 15px; font-weight: bold; margin-bottom: 3px; }
  .linea { border-top: 2px dashed #000; margin: 6px 0; }
  .linea-doble { border-top: 3px solid #000; margin: 6px 0; }
  .meta { font-size: 15px; font-weight: bold; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 14px; font-weight: 900; padding: 3px 0; border-bottom: 1px solid #000; }
  .td-nombre { width: 55%; padding: 4px 0; word-break: break-word; font-weight: 900; font-size: 15px; }
  .td-cant   { width: 12%; text-align: center; font-weight: 900; font-size: 15px; }
  .td-precio { width: 33%; text-align: right; font-weight: 900; font-size: 15px; }
  .total-row { font-size: 22px; font-weight: 900; }
  .total-row td { padding: 5px 0; }
  .gracias   { font-size: 16px; font-weight: 900; margin-top: 10px; }
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
  <div class="linea-doble"></div>
  <div class="meta">Fecha: ${fecha}  ${hora}</div>
  <div class="meta">Ticket #${venta.id}</div>
  <div class="linea"></div>
  <table>
    <thead><tr>
      <th style="text-align:left">Producto</th>
      <th style="text-align:center">Cant</th>
      <th style="text-align:right">Subtotal</th>
    </tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>
  <div class="linea"></div>
  <table>
    <tr class="total-row">
      <td colspan="2">TOTAL</td>
      <td class="td-precio">$${parseFloat(venta.total).toFixed(2)}</td>
    </tr>
  </table>
  <div class="linea-doble"></div>
  <div class="centro gracias">¡Gracias por su compra!</div>
</body></html>`;

    // Evitar prints duplicados si hay uno en curso
    if (isPrintingRef.current) return;
    isPrintingRef.current = true;

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
        try { document.body.removeChild(iframe); } catch (e) {}
        isPrintingRef.current = false;
        setTimeout(() => focusScanInput(), 60);
      }, 2000);
    }, 300);
  };

  // Confirmar y ejecutar la venta
  const confirmarVenta = async () => {
    const tabId = activeTab.id; // capturar ahora para no depender del tab activo al completar
    const carritoSnapshot = [...carrito]; // snapshot local, no compartido entre tabs
    setModalConfirmar(false);
    setItemsAnimandoMap(prev => ({ ...prev, [tabId]: true }));
    setProcesandoVentaMap(prev => ({ ...prev, [tabId]: true }));
    if (procesandoVentaTimersRef.current[tabId]) {
      clearTimeout(procesandoVentaTimersRef.current[tabId]);
    }
    procesandoVentaTimersRef.current[tabId] = setTimeout(() => {
      setProcesandoVentaMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
      setItemsAnimandoMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
      setModalConfirmar(false);
      mostrarMensaje('error', 'La venta tardó demasiado y se destrabó la pantalla. Revisá el historial antes de repetirla.');
      delete procesandoVentaTimersRef.current[tabId];
      setTimeout(() => focusScanInput({ force: true }), 80);
    }, 30000);
    try {
      const ventaData = {
        items: carritoSnapshot.map(item => {
          if (item.esEspecial) {
            return {
              es_especial: true,
              producto_nombre: item.nombre,
              precio_unitario: item.precio,
              cantidad: item.cantidad
            };
          }
          return {
            producto_id: item.id,
            cantidad: item.cantidad
          };
        })
      };
      const response = await ventasAPI.create(ventaData);
      await new Promise(r => setTimeout(r, 480));
      const ventaGuardada = response.data.data;
      setVentaExitosaMap(prev => ({ ...prev, [tabId]: ventaGuardada }));
      // Limpiar solo el tab donde se procesó la venta
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, carrito: [] } : t));
      setCodigo('');
      setMensaje({ tipo: '', texto: '' });
      setSugerencias([]);
      setMostrarSugerencias(false);
      setItemsAnimandoMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
      // Devolver foco al input para que el scanner siga funcionando
      setTimeout(() => inputRef.current?.focus(), 60);
      if (imprimirTicket) {
        imprimirTicketTermico(ventaGuardada, carritoSnapshot);
      }
      if (ventaExitosaTimersRef.current[tabId]) clearTimeout(ventaExitosaTimersRef.current[tabId]);
      ventaExitosaTimersRef.current[tabId] = setTimeout(() => {
        setVentaExitosaMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
        delete ventaExitosaTimersRef.current[tabId];
      }, 2800);
    } catch (error) {
      setItemsAnimandoMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
      const errorMsg = error.response?.data?.message || 'Error al procesar la venta';
      mostrarMensaje('error', `✗ ${errorMsg}`);
      console.error('Error:', error);
    } finally {
      if (procesandoVentaTimersRef.current[tabId]) {
        clearTimeout(procesandoVentaTimersRef.current[tabId]);
        delete procesandoVentaTimersRef.current[tabId];
      }
      setProcesandoVentaMap(prev => { const m = { ...prev }; delete m[tabId]; return m; });
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
    const tabIdWhenStarted = activeTabIdRef.current;
    const requestId = ++sugerenciasRequestIdRef.current;
    iniciarBusqueda();
    try {
      const response = await productosAPI.search(termino);
      if (requestId !== sugerenciasRequestIdRef.current) return;
      // Descartar resultado si el usuario cambió de tab mientras buscaba
      if (activeTabIdRef.current !== tabIdWhenStarted) return;
      setSugerencias(response.data.data || []);
      setMostrarSugerencias(response.data.data.length > 0);
      setSeleccionIndex(-1);
    } catch (error) {
      if (requestId !== sugerenciasRequestIdRef.current) return;
      if (activeTabIdRef.current !== tabIdWhenStarted) return;
      setSugerencias([]);
      setMostrarSugerencias(false);
    } finally {
      finalizarBusqueda();
    }
  };

  // Búsqueda automática al escribir — siempre busca, la detección de escaneo es solo en Enter
  const handleCodigoChange = (e) => {
    const valor = e.target.value;
    setCodigo(valor);

    // Guardar cuándo se empezó a escribir (para detectar escaneo en Enter)
    if (!scanBufferRef.current.inicioEscritura || !valor) {
      scanBufferRef.current = { valor, inicioEscritura: Date.now() };
    } else {
      scanBufferRef.current = { ...scanBufferRef.current, valor };
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!valor.trim()) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      scanBufferRef.current = { valor: '', inicioEscritura: null };
      return;
    }

    // Debounce 180ms — siempre busca sugerencias mientras escribe
    if (valor.length >= 2) {
      timeoutRef.current = setTimeout(() => {
        buscarSugerencias(valor);
      }, 180);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };
  
  // Seleccionar producto de las sugerencias
  const seleccionarProducto = (producto) => {
    agregarAlCarrito(producto);
    reproducirSonido('success');
    mostrarMensaje('success', `✓ ${producto.nombre} agregado`);
    setCodigo('');
    scanBufferRef.current = { valor: '', inicioEscritura: null };
    setSugerencias([]);
    setMostrarSugerencias(false);
    setSeleccionIndex(-1);
    inputRef.current?.focus();
  };

  // Manejar teclas en el input
  const handleKeyPress = (e) => {
    // Navegación en sugerencias con flechas (siempre primero)
    if (mostrarSugerencias && sugerencias.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSeleccionIndex(prev => prev < sugerencias.length - 1 ? prev + 1 : 0);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSeleccionIndex(prev => prev > 0 ? prev - 1 : sugerencias.length - 1);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setSugerencias([]);
        setMostrarSugerencias(false);
        setSeleccionIndex(-1);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Usar siempre el valor del ref (actualizado síncronamente) como fuente de verdad
      // El estado de React "codigo" puede estar desactualizado cuando el escáner es muy rápido
      const valorInputActual = (e.currentTarget?.value || '').trim();
      const codigoActual = (scanBufferRef.current.valor || valorInputActual || codigo).trim();

      // Detectar escaneo: el escáner llena el campo completo en < 200ms antes de Enter
      const tiempoTotal = scanBufferRef.current.inicioEscritura
        ? Date.now() - scanBufferRef.current.inicioEscritura
        : 9999;
      const esEscaneo = codigoActual.length >= 3 && tiempoTotal < 200;

      setSugerencias([]);
      setMostrarSugerencias(false);
      setSeleccionIndex(-1);
      scanBufferRef.current = { valor: '', inicioEscritura: null };

      if (esEscaneo) {
        if (codigoActual) procesarCodigoEscaneado(codigoActual);
        else mostrarMensaje('error', '✗ No se detectó código');
        return;
      }

      // Si hay sugerencia seleccionada con flechas, usarla
      if (seleccionIndex >= 0 && sugerencias.length > 0) {
        seleccionarProducto(sugerencias[seleccionIndex]);
        return;
      }

      // Si hay sugerencias visibles y solo hay una (o ninguna selección), usar la primera
      if (sugerencias.length === 1) {
        seleccionarProducto(sugerencias[0]);
        return;
      }

      // Sin selección ni sugerencias únicas: buscar por código/nombre directo
      if (codigoActual) procesarCodigoEscaneado(codigoActual);
      else if (codigo.trim()) procesarCodigoEscaneado(codigo.trim());
    }
  };

  return (
    <div className="pos-container" ref={posContainerRef}>
      <div className="pos-layout">

        {/* Panel izquierdo */}
        <div className="pos-left">

          {/* ── Barra de tabs ── */}
          <div className="tabs-bar">
            <div className="tabs-list">
              {tabs.map(tab => {
                const isActive = tab.id === activeTabId;
                const count = itemsDeTab(tab);
                const subtotal = totalDeTab(tab);
                return (
                  <div
                    key={tab.id}
                    className={`tab-item${isActive ? ' tab-active' : ''}`}
                    onClick={() => cambiarTab(tab.id)}
                  >
                    {editandoNombreTab === tab.id ? (
                      <input
                        ref={inputNombreTabRef}
                        className="tab-nombre-input"
                        value={nombreTabEdit}
                        onChange={e => setNombreTabEdit(e.target.value)}
                        onBlur={confirmarNombreTab}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmarNombreTab();
                          if (e.key === 'Escape') setEditandoNombreTab(null);
                          e.stopPropagation();
                        }}
                        onClick={e => e.stopPropagation()}
                        maxLength={24}
                      />
                    ) : (
                      <span
                        className="tab-nombre"
                        onDoubleClick={e => iniciarEditarNombreTab(e, tab.id, tab.nombre)}
                        title="Doble clic para renombrar"
                      >
                        {tab.nombre}
                      </span>
                    )}
                    {count > 0 && (
                      <span className="tab-badge">
                        {count} · ${subtotal.toFixed(0)}
                      </span>
                    )}
                    {tabs.length > 1 && (
                      <button
                        className="tab-close"
                        onClick={e => cerrarTab(e, tab.id)}
                        title="Cerrar pedido"
                      >✕</button>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="tab-add-btn" onClick={agregarTab} title="Nuevo pedido">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuevo
            </button>
          </div>

          {/* ── Card principal ── */}
          <div className="card">
            <div className="scan-section">
              <h2 className="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                Escanear Producto
                <span className="scan-tab-indicator">→ {activeTab?.nombre}</span>
                {escaneosPendientes > 0 && (
                  <span className="scan-queue-indicator" title="Escaneos pendientes por procesar">
                    Pendientes: {escaneosPendientes}
                  </span>
                )}
              </h2>

              <div className="scan-input-group">
                <input
                  ref={inputRef}
                  type="text"
                  className="input scan-input"
                  placeholder="Escanee o escriba el código del producto..."
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

              <button
                className="btn-varios"
                onClick={abrirModalVarios}
                disabled={procesandoVenta}
                title="Agregar producto con precio personalizado"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar Varios
              </button>
            </div>

            {/* Carrito del tab activo */}
            <div className="carrito-section">
              <div className="carrito-header">
                <h3 className="section-title">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  Carrito <span className="carrito-count">{calcularCantidadTotal()}</span>
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
                  <div className="carrito-vacio-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                  </div>
                  <p>El carrito está vacío</p>
                  <p className="text-sm text-secondary">Escanee o busque un producto para comenzar</p>
                </div>
              ) : (
                <div className="carrito-items">
                  {carrito.map((item, index) => (
                    <div
                      key={item.id}
                      className={`carrito-item fade-in${itemsAnimando ? ' item-flying' : ''}`}
                      style={itemsAnimando ? { animationDelay: `${index * 60}ms` } : {}}
                    >
                      <div className="item-info">
                        <div className="item-nombre">{item.nombre}</div>
                        {item.codigo && <div className="item-codigo">{item.codigo}</div>}
                        <div className="item-precio">${item.precio.toFixed(2)} c/u</div>
                      </div>

                      <div className="item-controls">
                        <div className="cantidad-controls">
                          <button
                            className="btn-cantidad"
                            onClick={() => modificarCantidad(item.id, item.cantidad - 1)}
                            disabled={procesandoVenta}
                          >−</button>
                          <input
                            type="number"
                            className="input-cantidad"
                            value={item.cantidad}
                            onChange={e => modificarCantidad(item.id, parseInt(e.target.value) || 0)}
                            min="1"
                            disabled={procesandoVenta}
                          />
                          <button
                            className="btn-cantidad"
                            onClick={() => modificarCantidad(item.id, item.cantidad + 1)}
                            disabled={procesandoVenta}
                          >+</button>
                        </div>
                        <div className="item-subtotal">${item.subtotal.toFixed(2)}</div>
                        <button
                          className="btn-eliminar"
                          onClick={() => eliminarDelCarrito(item.id)}
                          disabled={procesandoVenta}
                          title="Eliminar"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho — Checkout */}
        <div className="pos-right">
          <div className="card checkout-card">
            <h2 className="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></svg>
              Resumen — {activeTab?.nombre}
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
              {tabs.length > 1 && (
                <div className="info-row">
                  <span>Pedidos abiertos:</span>
                  <span>{tabs.length}</span>
                </div>
              )}
            </div>

            {/* Toggle imprimir ticket */}
            <label className="ticket-toggle">
              <div className="ticket-toggle-inner">
                <input
                  type="checkbox"
                  className="ticket-toggle-input"
                  checked={imprimirTicket}
                  onChange={e => setImprimirTicket(e.target.checked)}
                />
                <span className="ticket-toggle-track">
                  <span className="ticket-toggle-thumb"/>
                </span>
              </div>
              <div className="ticket-toggle-label">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>Imprimir ticket</span>
              </div>
            </label>

            <div className="total-section">
              <div className="total-label">Total a pagar</div>
              <div className="total-amount">${calcularTotal().toFixed(2)}</div>
            </div>

            {ventaExitosa ? (
              <div className="venta-exitosa-panel">
                <div className="venta-check-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="venta-exitosa-titulo">¡Venta registrada!</div>
                <div className="venta-exitosa-id">#{ventaExitosa.id}</div>
                <div className="venta-exitosa-monto">${parseFloat(ventaExitosa.total).toFixed(2)}</div>
                <div className="venta-exitosa-sub">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  Guardado en historial
                </div>
              </div>
            ) : (
              <button
                className="btn btn-success btn-lg checkout-btn"
                onClick={procesarVenta}
                disabled={carrito.length === 0 || procesandoVenta}
              >
                {procesandoVenta ? (
                  <><span className="checkout-btn-spinner"></span>Procesando...</>
                ) : 'Procesar Venta'}
              </button>
            )}

            {!ventaExitosa && carrito.length > 0 && (
              <div className="checkout-tips">
                <p className="text-sm text-secondary">
                  Escribe para buscar o usa las flechas ↑↓ para navegar
                </p>
              </div>
            )}

            {/* Resumen de otros pedidos */}
            {tabs.length > 1 && (
              <div className="otros-pedidos">
                <div className="otros-pedidos-titulo">Otros pedidos</div>
                {tabs.filter(t => t.id !== activeTabId).map(tab => (
                  <div
                    key={tab.id}
                    className="otro-pedido-row"
                    onClick={() => cambiarTab(tab.id)}
                  >
                    <span className="otro-pedido-nombre">{tab.nombre}</span>
                    <span className="otro-pedido-info">
                      {itemsDeTab(tab) > 0
                        ? <>${totalDeTab(tab).toFixed(2)}</>
                        : <span className="otro-pedido-vacio">vacío</span>
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal producto especial Varios ── */}
      {modalVarios.visible && (
        <div className="modal-overlay" onClick={() => { setModalVarios({ visible: false, precio: '', descripcion: '' }); inputRef.current?.focus(); }}>
          <div className="modal-varios" onClick={e => e.stopPropagation()}>
            <div className="modal-varios-header">
              <div className="modal-varios-icono">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <div>
                <h3 className="modal-varios-titulo">Producto Especial</h3>
                <p className="modal-varios-sub">Ingresá el precio y una descripción opcional</p>
              </div>
            </div>

            <div className="modal-varios-body">
              <label className="modal-varios-label">Precio <span className="required">*</span></label>
              <div className="modal-varios-precio-wrap">
                <span className="modal-varios-signo">$</span>
                <input
                  ref={inputPrecioVariosRef}
                  type="number"
                  className="input modal-varios-input"
                  placeholder="0.00"
                  value={modalVarios.precio}
                  min="0.01"
                  step="0.01"
                  onChange={e => setModalVarios(v => ({ ...v, precio: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') confirmarVarios();
                    if (e.key === 'Escape') { setModalVarios({ visible: false, precio: '', descripcion: '' }); inputRef.current?.focus(); }
                  }}
                />
              </div>

              <label className="modal-varios-label" style={{ marginTop: '1rem' }}>Descripción <span className="opcional">(opcional)</span></label>
              <input
                type="text"
                className="input"
                placeholder="Ej: Propolis, Crema, Jalea real..."
                value={modalVarios.descripcion}
                maxLength={60}
                onChange={e => setModalVarios(v => ({ ...v, descripcion: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === 'Enter') confirmarVarios();
                  if (e.key === 'Escape') { setModalVarios({ visible: false, precio: '', descripcion: '' }); inputRef.current?.focus(); }
                }}
              />
            </div>

            <div className="modal-varios-actions">
              <button className="vcm-btn-cancelar" onClick={() => { setModalVarios({ visible: false, precio: '', descripcion: '' }); inputRef.current?.focus(); }}>Cancelar</button>
              <button
                className="vcm-btn-confirmar"
                onClick={confirmarVarios}
                disabled={!modalVarios.precio || parseFloat(modalVarios.precio) <= 0}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Agregar al carrito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmación de venta ── */}
      {modalConfirmar && (
        <div className="modal-overlay venta-confirm-overlay" onClick={() => setModalConfirmar(false)}>
          <div className="venta-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="vcm-header">
              <div className="vcm-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              </div>
              <div>
                <h3 className="vcm-titulo">Confirmar Venta</h3>
                <p className="vcm-sub">{carrito.length} {carrito.length === 1 ? 'producto' : 'productos'} · {calcularCantidadTotal()} unidades · {activeTab?.nombre}</p>
              </div>
            </div>

            <div className="vcm-items">
              {carrito.slice(0, 4).map(item => (
                <div key={item.id} className="vcm-item">
                  <span className="vcm-item-nombre">{item.nombre}</span>
                  <span className="vcm-item-derecha">
                    <span className="vcm-item-cant">{item.cantidad}×</span>
                    <span className="vcm-item-precio">${item.subtotal.toFixed(2)}</span>
                  </span>
                </div>
              ))}
              {carrito.length > 4 && (
                <div className="vcm-mas">+{carrito.length - 4} productos más...</div>
              )}
            </div>

            <div className="vcm-total">
              <span className="vcm-total-label">Total</span>
              <span className="vcm-total-valor">${calcularTotal().toFixed(2)}</span>
            </div>

            <div className="vcm-actions">
              <button className="vcm-btn-cancelar" onClick={() => setModalConfirmar(false)}>Cancelar</button>
              <button className="vcm-btn-confirmar" onClick={confirmarVenta}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Confirmar venta
              </button>
            </div>

            {imprimirTicket && (
              <div className="vcm-print-alert">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Se imprimirá el ticket al confirmar
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default POS;
