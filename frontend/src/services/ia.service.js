import api from './api.js'

const iaService = {
  chat:         (messages, context) => api.post('/ia/chat', { messages, context }).then(r => r.data),
  ocr:          (formData)          => api.post('/ia/ocr', formData, {
                                         headers: { 'Content-Type': 'multipart/form-data' }
                                       }).then(r => r.data),
  analizarCV:   (formData)          => api.post('/ia/analizar-cv', formData, {
                                         headers: { 'Content-Type': 'multipart/form-data' }
                                       }).then(r => r.data),
  generarInforme: (params)          => api.post('/ia/informe', params).then(r => r.data),
}

export default iaService
