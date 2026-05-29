import React, { useEffect, useRef, useState } from 'react';
import { productosAPI } from '../services/api';
import './Vencimientos.css';

const HIDDEN_KEY = 'vencimientos_ocultos';

const estadoOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'vencido', label: 'Vencidos' }
];

function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthRange(offset = 0) {
  const now = new Date();
  const monthDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return { desde: formatDateInput(start), hasta: formatDateInput(end) };
}

function formatFecha(fecha) {
  if (!fecha) return '-';
  return new Date(`${String(fecha).slice(0, 10)}T00:00:00`).toLocaleDateString('es-AR');
}

function badgeClassByDias(dias) {
  if (dias === null || dias === undefined) return 'badge badge-info';
  if (dias < 0) return 'badge badge-danger';
  if (dias === 0) return 'badge badge-warning';
  if (dias <= 7) return 'badge badge-warning';
  return 'badge badge-success';
}

function textByDias(dias) {
  if (dias === null || dias === undefined) return 'Sin fecha';
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'Vence hoy';
  return `Vence en ${dias} dia(s)`;
}

// Clave única: id + fecha_vencimiento. Si la fecha cambia, la clave cambia → reaparece
function ocultarKey(producto) {
  const fecha = producto.fecha_vencimiento
    ? String(producto.fecha_vencimiento).slice(0, 10)
    : 'sin-fecha';
  return `${producto.id}_${fecha}`;
}

function leerOcultos() {
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function guardarOcultos(mapa) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(mapa));
  } catch { /* noop */ }
}

function Vencimientos() {
  const PAGE_SIZE = 10;
  const [productos, setProductos] = useState([]);
  const [resumenGlobal, setResumenGlobal] = useState({ vencidos: 0, esteMes: 0, proximoMes: 0 });
  const [totalProductos, setTotalProductos] = useState(0);
  const [paginaActual, setPaginaActual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mesActual = getMonthRange(0);
  const mesSiguiente = getMonthRange(1);
  const [presetActivo, setPresetActivo] = useState('manual');
  const [filtrosComprimidos, setFiltrosComprimidos] = useState(true);

  const [ocultosMap, setOcultosMap] = useState(() => leerOcultos());
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  const [filtros, setFiltros] = useState({
    estado: 'todos',
    dias: '',
    desde: '',
    hasta: '',
    includeInactive: false
  });

  const [busqueda, setBusqueda] = useState('');
  const listRequestRef = useRef(0);
  const resumenRequestRef = useRef(0);

  const cargarVencimientos = async (filtrosCustom = filtros, page = 1) => {
    const requestId = ++listRequestRef.current;
    try {
      setLoading(true);
      setError('');
      const response = await productosAPI.getVencimientos({
        ...filtrosCustom,
        q: busqueda,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE
      });

      if (requestId !== listRequestRef.current) return;

      setProductos(response.data.data || []);
      setTotalProductos(response.data.total || 0);
      setPaginaActual(page);
    } catch (err) {
      if (requestId !== listRequestRef.current) return;
      setError(err.response?.data?.message || 'No se pudo cargar el modulo de vencimientos');
    } finally {
      if (requestId === listRequestRef.current) setLoading(false);
    }
  };

  const cargarResumen = async (includeInactive = filtros.includeInactive) => {
    const requestId = ++resumenRequestRef.current;
    try {
      const response = await productosAPI.getVencimientosResumen(includeInactive);
      if (requestId !== resumenRequestRef.current) return;
      setResumenGlobal(response.data.data || { vencidos: 0, esteMes: 0, proximoMes: 0 });
    } catch {
      if (requestId !== resumenRequestRef.current) return;
      setResumenGlobal({ vencidos: 0, esteMes: 0, proximoMes: 0 });
    }
  };

  useEffect(() => {
    cargarVencimientos(filtros, 1);
    cargarResumen(filtros.includeInactive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPaginas = Math.max(1, Math.ceil(totalProductos / PAGE_SIZE));

  const onChangeFiltro = (key, value) => {
    setFiltros((prev) => {
      if (key === 'estado') {
        const next = { ...prev, estado: value };
        if (value === 'por_vencer') { next.desde = ''; next.hasta = ''; }
        else { next.dias = ''; }
        setPresetActivo('manual');
        return next;
      }
      if (key === 'dias') {
        const next = { ...prev, dias: value };
        if (String(value).trim()) { next.estado = 'por_vencer'; next.desde = ''; next.hasta = ''; }
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const limpiarFiltros = () => {
    const reset = { estado: 'todos', dias: '', desde: '', hasta: '', includeInactive: false };
    setFiltros(reset);
    setPresetActivo('manual');
    setBusqueda('');
    cargarVencimientos(reset, 1);
    cargarResumen(reset.includeInactive);
  };

  const aplicarFiltros = (e) => {
    e.preventDefault();
    setPresetActivo('manual');
    cargarVencimientos(filtros, 1);
    cargarResumen(filtros.includeInactive);
  };

  const aplicarPreset = (tipo) => {
    let nextFiltros = { ...filtros };
    if (tipo === 'vencidos') nextFiltros = { ...filtros, estado: 'vencido', dias: '', desde: '', hasta: '' };
    if (tipo === 'este_mes') nextFiltros = { ...filtros, estado: 'todos', dias: '', desde: mesActual.desde, hasta: mesActual.hasta };
    if (tipo === 'proximo_mes') nextFiltros = { ...filtros, estado: 'todos', dias: '', desde: mesSiguiente.desde, hasta: mesSiguiente.hasta };
    setPresetActivo(tipo);
    setFiltros(nextFiltros);
    setBusqueda('');
    cargarVencimientos(nextFiltros, 1);
    cargarResumen(nextFiltros.includeInactive);
  };

  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas || nuevaPagina === paginaActual) return;
    cargarVencimientos(filtros, nuevaPagina);
  };

  const ocultarProducto = (producto) => {
    const key = ocultarKey(producto);
    const nuevo = { ...ocultosMap, [key]: true };
    setOcultosMap(nuevo);
    guardarOcultos(nuevo);
  };

  const restaurarProducto = (producto) => {
    const key = ocultarKey(producto);
    const nuevo = { ...ocultosMap };
    delete nuevo[key];
    setOcultosMap(nuevo);
    guardarOcultos(nuevo);
  };

  const restaurarTodos = () => {
    setOcultosMap({});
    guardarOcultos({});
  };

  const productosVisibles = productos.filter(p => mostrarOcultos ? true : !ocultosMap[ocultarKey(p)]);
  const cantidadOcultos = productos.filter(p => !!ocultosMap[ocultarKey(p)]).length;

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div className="page-header">
        <div>
          <h1>Control de Vencimientos</h1>
          <p className="vencimientos-subtitle">Listado ordenado por urgencia: primero los productos mas cercanos a vencer.</p>
        </div>
      </div>

      <div className="vencimientos-presets">
        <button
          type="button"
          className={`kpi-card kpi-danger ${presetActivo === 'vencidos' ? 'kpi-active' : ''}`}
          onClick={() => aplicarPreset('vencidos')}
        >
          <span className="kpi-label">Vencidos</span>
          <strong>{resumenGlobal.vencidos}</strong>
        </button>

        <button
          type="button"
          className={`kpi-card kpi-warning ${presetActivo === 'este_mes' ? 'kpi-active' : ''}`}
          onClick={() => aplicarPreset('este_mes')}
        >
          <span className="kpi-label">Vence este mes</span>
          <strong>{resumenGlobal.esteMes}</strong>
        </button>

        <button
          type="button"
          className={`kpi-card kpi-info ${presetActivo === 'proximo_mes' ? 'kpi-active' : ''}`}
          onClick={() => aplicarPreset('proximo_mes')}
        >
          <span className="kpi-label">Vence el mes siguiente</span>
          <strong>{resumenGlobal.proximoMes}</strong>
        </button>
      </div>

      <form className="card" style={{ marginTop: '1.25rem' }} onSubmit={aplicarFiltros}>
        <div className="vencimientos-filtros-header">
          <div>
            <h3 className="vencimientos-filtros-title">Filtros avanzados</h3>
            <p className="vencimientos-filtros-subtitle">Por defecto esta comprimido para una vista mas simple.</p>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setFiltrosComprimidos((prev) => !prev)}
          >
            {filtrosComprimidos ? 'Expandir' : 'Comprimir'}
          </button>
        </div>

        {!filtrosComprimidos && (
          <>
            <div className="vencimientos-filtros-grid">
              <div className="form-group">
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={filtros.estado}
                  onChange={(e) => onChangeFiltro('estado', e.target.value)}
                >
                  {estadoOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Dias maximos (por vencer)</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={filtros.dias}
                  onChange={(e) => onChangeFiltro('dias', e.target.value)}
                  disabled={filtros.estado !== 'por_vencer'}
                />
              </div>

              <div className="form-group">
                <label className="label">Busqueda</label>
                <input
                  type="text"
                  className="input"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre, codigo, fabricante o ID"
                />
              </div>

              <div className="form-group vencimientos-checkbox-wrap">
                <label className="vencimientos-check-label">
                  <input
                    type="checkbox"
                    checked={filtros.includeInactive}
                    onChange={(e) => onChangeFiltro('includeInactive', e.target.checked)}
                  />
                  <span>Incluir inactivos</span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Actualizando...' : 'Aplicar filtros'}
              </button>
              <button type="button" className="btn btn-outline" onClick={limpiarFiltros}>
                Limpiar
              </button>
            </div>
          </>
        )}
      </form>

      {error && (
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.25rem' }}>
        <div className="vencimientos-top-row">
          <h2 style={{ fontSize: '1.125rem' }}>Productos ({totalProductos})</h2>

          {cantidadOcultos > 0 && (
            <div className="venc-ocultos-bar">
              <span className="venc-ocultos-count">
                {cantidadOcultos} oculto{cantidadOcultos !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setMostrarOcultos(v => !v)}
              >
                {mostrarOcultos ? 'Ocultar de nuevo' : 'Mostrar ocultos'}
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline venc-restaurar-btn"
                onClick={restaurarTodos}
                title="Restaurar todos los productos ocultos en esta pagina"
              >
                ↩ Restaurar todos
              </button>
            </div>
          )}
        </div>

        <div className="table-wrapper" style={{ marginTop: '0.75rem' }}>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Fabricante</th>
                <th>Stock</th>
                <th>Vencimiento</th>
                <th>Estado</th>
                <th style={{ width: '2.5rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {!loading && productosVisibles.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                    {cantidadOcultos > 0 && !mostrarOcultos
                      ? <>Todos los productos están ocultos. <button type="button" className="venc-link-btn" onClick={() => setMostrarOcultos(true)}>Mostrar ocultos</button></>
                      : 'No hay productos para los filtros seleccionados.'}
                  </td>
                </tr>
              )}

              {productosVisibles.map((producto) => {
                const estaOculto = !!ocultosMap[ocultarKey(producto)];
                return (
                  <tr key={producto.id} className={estaOculto ? 'venc-fila-oculta' : ''}>
                    <td>
                      <strong>{producto.nombre}</strong>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>ID: {producto.id}</div>
                    </td>
                    <td>{producto.codigo || '-'}</td>
                    <td>{producto.fabricante || '-'}</td>
                    <td>{producto.stock ?? 0}</td>
                    <td>{formatFecha(producto.fecha_vencimiento)}</td>
                    <td>
                      <span className={badgeClassByDias(producto.dias_para_vencer)}>
                        {textByDias(producto.dias_para_vencer)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`venc-btn-ocultar${estaOculto ? ' venc-btn-restaurar' : ''}`}
                        onClick={() => estaOculto ? restaurarProducto(producto) : ocultarProducto(producto)}
                        title={estaOculto ? 'Restaurar producto en la lista' : 'Ocultar de la lista (sin borrarlo)'}
                      >
                        {estaOculto ? '↩' : '✕'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <span className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Pagina {paginaActual} de {totalPaginas}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => cambiarPagina(paginaActual - 1)}
                disabled={paginaActual === 1 || loading}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => cambiarPagina(paginaActual + 1)}
                disabled={paginaActual === totalPaginas || loading}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Vencimientos;
