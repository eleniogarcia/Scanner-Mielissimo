import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejo de errores global
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Productos
export const productosAPI = {
  getAll: (includeInactive = false) => 
    api.get(`/productos${includeInactive ? '?includeInactive=true' : ''}`),
  
  getById: (id) => 
    api.get(`/productos/${id}`),
  
  getByCodigo: (codigo) => 
    api.get(`/productos/codigo/${encodeURIComponent(codigo)}`),
  
  search: (query) => 
    api.get(`/productos/search?q=${encodeURIComponent(query)}`),

  getVencimientos: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.estado) params.append('estado', filtros.estado);
    if (filtros.desde) params.append('desde', filtros.desde);
    if (filtros.hasta) params.append('hasta', filtros.hasta);
    if (filtros.dias !== undefined && filtros.dias !== null && filtros.dias !== '') {
      params.append('dias', filtros.dias);
    }
    if (filtros.q) params.append('q', filtros.q);
    if (filtros.limit !== undefined && filtros.limit !== null) params.append('limit', filtros.limit);
    if (filtros.offset !== undefined && filtros.offset !== null) params.append('offset', filtros.offset);
    if (filtros.includeInactive) params.append('includeInactive', 'true');
    const query = params.toString();
    return api.get(`/productos/vencimientos${query ? `?${query}` : ''}`);
  },

  getVencimientosResumen: (includeInactive = false) =>
    api.get(`/productos/vencimientos/resumen${includeInactive ? '?includeInactive=true' : ''}`),
  
  create: (data) => 
    api.post('/productos', data),
  
  createBulk: (productos, updateExisting = false) =>
    api.post('/productos/bulk', { productos, updateExisting }),
  
  update: (id, data) => 
    api.put(`/productos/${id}`, data),
  
  delete: (id, hard = false) => 
    api.delete(`/productos/${id}${hard ? '?hard=true' : ''}`)
};

// Ventas
export const ventasAPI = {
  getAll: (limit = 50, offset = 0, startDate = null, endDate = null, includeItems = false) => {
    const params = new URLSearchParams({ limit, offset });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (includeItems) params.append('includeItems', 'true');
    return api.get(`/ventas?${params.toString()}`);
  },
  
  getById: (id) => 
    api.get(`/ventas/${id}`),
  
  getToday: (includeItems = false) => 
    api.get(`/ventas/today${includeItems ? '?includeItems=true' : ''}`),
  
  getWeekly: (includeItems = false) => 
    api.get(`/ventas/weekly${includeItems ? '?includeItems=true' : ''}`),
  
  getMonthly: (includeItems = false) => 
    api.get(`/ventas/monthly${includeItems ? '?includeItems=true' : ''}`),
  
  getStats: (startDate, endDate) => {
    let url = '/ventas/stats';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return api.get(queryString ? `${url}?${queryString}` : url);
  },

  getGanancias: (filtros = {}) => {
    const params = new URLSearchParams();
    if (filtros.periodo) params.append('periodo', filtros.periodo);
    if (filtros.startDate) params.append('startDate', filtros.startDate);
    if (filtros.endDate) params.append('endDate', filtros.endDate);
    const queryString = params.toString();
    return api.get(`/ventas/ganancias${queryString ? '?' + queryString : ''}`);
  },

  getGananciasHoy: () => 
    api.get('/ventas/ganancias/hoy'),
  
  getGananciasSemanales: () => 
    api.get('/ventas/ganancias/semana'),
  
  getGananciasMensuales: () => 
    api.get('/ventas/ganancias/mes'),
  
  getTopProducts: (limit = 10) => 
    api.get(`/ventas/top-products?limit=${limit}`),
  
  create: (data) => 
    api.post('/ventas', data),

  delete: (id) =>
    api.delete(`/ventas/${id}`)
};

// Caja (apertura, cierre y movimientos de efectivo)
export const cajaAPI = {
  getActual: () => api.get('/caja/actual'),
  abrir: (monto_inicial, observaciones = '') => api.post('/caja/abrir', { monto_inicial, observaciones }),
  cerrar: (monto_contado, observaciones = '') => api.post('/caja/cerrar', { monto_contado, observaciones }),
  agregarMovimiento: (data) => api.post('/caja/movimientos', data),
  eliminarMovimiento: (id) => api.delete(`/caja/movimientos/${id}`),
  getHistorial: (limit = 30, offset = 0) => api.get(`/caja/historial?limit=${limit}&offset=${offset}`),
  getDetalle: (id) => api.get(`/caja/${id}`)
};

// Gastos y balance mensual
export const gastosAPI = {
  getByMes: (mes) => api.get(`/gastos?mes=${mes}`),
  create: (data) => api.post('/gastos', data),
  update: (id, data) => api.put(`/gastos/${id}`, data),
  delete: (id) => api.delete(`/gastos/${id}`),
  getFijos: () => api.get('/gastos/fijos'),
  createFijo: (data) => api.post('/gastos/fijos', data),
  updateFijo: (id, data) => api.put(`/gastos/fijos/${id}`, data),
  deleteFijo: (id) => api.delete(`/gastos/fijos/${id}`),
  getBalance: (mes) => api.get(`/gastos/balance?mes=${mes}`),
  getBalanceMeses: (n = 6) => api.get(`/gastos/balance/meses?n=${n}`)
};

// Conexión con la web del negocio (publicar productos, stock y precios)
export const webAPI = {
  getEstado: () => api.get('/web/estado'),
  guardarConfig: (data) => api.put('/web/config', data),
  probar: (data = {}) => api.post('/web/probar', data),
  getCategorias: () => api.get('/web/categorias'),
  sincronizar: () => api.post('/web/sincronizar'),
  publicar: (productoId, categoria_id) => api.post(`/web/publicar/${productoId}`, { categoria_id })
};

export const CATEGORIAS_GASTO = [
  { value: 'alquiler', label: 'Alquiler' },
  { value: 'servicios', label: 'Servicios (luz, agua, gas, internet)' },
  { value: 'sueldos', label: 'Sueldos' },
  { value: 'impuestos', label: 'Impuestos' },
  { value: 'mantenimiento', label: 'Mantenimiento / arreglos' },
  { value: 'insumos', label: 'Insumos (bolsas, limpieza, papel)' },
  { value: 'otros', label: 'Otros' }
];

export const nombreCategoria = (value) =>
  (CATEGORIAS_GASTO.find(c => c.value === value)?.label || value || '').split(' (')[0];

export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia / QR' }
];

export const nombreMetodoPago = (value) =>
  METODOS_PAGO.find(m => m.value === (value || 'efectivo'))?.label || value;

export const formatearPesos = (valor) =>
  `$${(parseFloat(valor) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default api;
