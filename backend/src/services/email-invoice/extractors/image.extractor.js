/**
 * IMAGE EXTRACTOR
 * ─────────────────────────────────────────────────────────────
 * Extrae datos de facturas desde imágenes (JPG, PNG, etc.)
 * usando Claude Vision.
 */

const { getClient } = require('../../config/anthropic.js')

const PROMPT_EXTRACCION = `Analiza esta imagen y extrae los datos de factura que encuentres.
Si no es una factura o no contiene datos de factura, devuelve null.

Devuelve SOLO un JSON con exactamente esta estructura (null si no es factura):
{
  "numero_factura": null,
  "fecha": null,
  "fecha_vencimiento": null,
  "proveedor_nombre": null,
  "proveedor_cif": null,
  "receptor_nombre": null,
  "receptor_cif": null,
  "concepto": null,
  "lineas": [],
  "base_imponible": null,
  "porcentaje_iva": null,
  "cuota_iva": null,
  "total": null,
  "moneda": "EUR",
  "confianza": 0
}

Fechas en YYYY-MM-DD. Importes como números sin símbolo de moneda.
Confianza 0-100 según calidad de la imagen y claridad de los datos.`

const MIME_VALIDOS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const extraer = async (imageBuffer, mimeType, emailMeta = {}) => {
  try {
    const claude    = getClient()
    const base64    = imageBuffer.toString('base64')
    const mediaType = MIME_VALIDOS.includes(mimeType) ? mimeType : 'image/jpeg'

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: PROMPT_EXTRACCION },
        ],
      }],
    })

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    if (raw === 'null') return null

    const data = JSON.parse(raw)
    if (!data) return null

    return {
      ...data,
      email_id:     emailMeta.id     || null,
      email_asunto: emailMeta.asunto || null,
      email_de:     emailMeta.de     || null,
      email_fecha:  emailMeta.fecha  || null,
    }
  } catch (err) {
    console.error('[Image Extractor]', err.message)
    return null
  }
}

module.exports = { extraer }
