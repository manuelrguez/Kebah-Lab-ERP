import api from './api.js'

const deliveryService = {
  getResumen:    (params)       => api.get('/delivery/resumen', { params }).then(r => r.data),
  getPedidos:    (params)       => api.get('/delivery/pedidos', { params }).then(r => r.data),
  syncPlatforma: (plataforma)   => api.post(`/delivery/sync/${plataforma}`).then(r => r.data),
  syncAll:       ()             => api.post('/delivery/sync/all').then(r => r.data),
  getStatus:     ()             => api.get('/delivery/status').then(r => r.data),
}

export default deliveryService
