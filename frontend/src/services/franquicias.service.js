import api from './api.js'

const franquiciasService = {
  getAll:    (params) => api.get('/franquicias', { params }).then(r => r.data),
  getById:   (id)     => api.get(`/franquicias/${id}`).then(r => r.data),
  create:    (data)   => api.post('/franquicias', data).then(r => r.data),
  update:    (id, data) => api.put(`/franquicias/${id}`, data).then(r => r.data),
  remove:    (id)     => api.delete(`/franquicias/${id}`).then(r => r.data),
  getStats:  (id)     => api.get(`/franquicias/${id}/stats`).then(r => r.data),
}

export default franquiciasService
