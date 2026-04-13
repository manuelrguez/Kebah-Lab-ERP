const { getClient } = require('../config/anthropic.js')
const fs = require('fs')

const claudeService = {
  /**
   * Generic chat completion
   */
  chat: async (messages, systemPrompt = '') => {
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    return response.content[0].text
  },

  /**
   * OCR extraction from image/PDF base64
   */
  ocr: async (base64Data, mediaType, prompt) => {
    const client = getClient()
    const isImage = mediaType.startsWith('image/')
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          isImage
            ? { type: 'image',    source: { type: 'base64', media_type: mediaType, data: base64Data } }
            : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Data } },
          { type: 'text', text: prompt }
        ]
      }]
    })
    return response.content[0].text
  },

  /**
   * Analyze a CV PDF
   */
  analizarCV: async (filePath, puesto) => {
    const base64 = fs.readFileSync(filePath).toString('base64')
    const client = getClient()
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          {
            type: 'text',
            text: `Analiza este CV para el puesto "${puesto}" en un kebab. 
Responde SOLO con JSON: { nombre, email, telefono, puntuacion_adecuacion, puntuacion_experiencia, 
puntuacion_idiomas, puntuacion_total, experiencia_años, idiomas, certificaciones, 
fortalezas, areas_mejora, recomendacion, resumen_ia }`
          }
        ]
      }]
    })
    const raw = response.content[0].text.replace(/\`\`\`json|\`\`\`/g, '').trim()
    return JSON.parse(raw)
  },
}

module.exports = claudeService
