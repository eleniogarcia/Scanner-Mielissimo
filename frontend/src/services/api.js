import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
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
  
  create: (data) => 
    api.post('/productos', data),
  
  createBulk: (productos) =>
    api.post('/productos/bulk', { productos }),
  
  update: (id, data) => 
    api.put(`/productos/${id}`, data),
  
  delete: (id, hard = false) => 
    api.delete(`/productos/${id}${hard ? '?hard=true' : ''}`)
};

// Ventas
export const ventasAPI = {
  getAll: (limit = 50, offset = 0) => 
    api.get(`/ventas?limit=${limit}&offset=${offset}`),
  
  getById: (id) => 
    api.get(`/ventas/${id}`),
  
  getToday: () => 
    api.get('/ventas/today'),
  
  getStats: (startDate, endDate) => {
    let url = '/ventas/stats';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString();
    return api.get(queryString ? `${url}?${queryString}` : url);
  },
  
  getTopProducts: (limit = 10) => 
    api.get(`/ventas/top-products?limit=${limit}`),
  
  create: (data) => 
    api.post('/ventas', data),

  delete: (id) =>
    api.delete(`/ventas/${id}`)
};

export default api;
