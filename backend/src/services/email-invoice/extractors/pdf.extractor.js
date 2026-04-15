/**
 * PDF EXTRACTOR
 * ─────────────────────────────────────────────────────────────
 * Extrae datos de facturas desde PDFs usando Claude API.
 * El PDF se envía como documento base64 directamente a Claude,
 * que tiene capacidad nativa de leer PDFs.
 */

const { getClient } = require('../../config/anthropic.js')

const PROMPT_EXTRACCION = `Analiza este documento PDF y extrae los datos de factura que encuentres.
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

Notas:
- fecha y fecha_vencimiento en formato YYYY-MM-DD
- base_imponible, cuota_iva y total como números (sin símbolos de moneda)
- porcentaje_iva como número (ej: 21, no "21%")
- confianza: 0-100 indicando qué tan seguro estás de la extracción
- lineas: array de { descripcion, cantidad, precio_unitario, importe }
- Si hay múltiples tipos de IVA, usa el mayoritario en porcentaje_iva`

const extraer = async (pdfBuffer, emailMeta = {}) => {
  try {
    const claude  = getClient()
    const base64  = pdfBuffer.toString('base64')

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          { type: 'text', text: PROMPT_EXTRACCION },
        ],
      }],
    })

    const raw  = response.content[0].text.replace(/```json|```/g, '').trim()

    // Si Claude dice que no es una factura
    if (raw === 'null' || raw.toLowerCase().includes('"null"')) return null

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
    console.error('[PDF Extractor]', err.message)
    return null
  }
}

module.exports = { extraer }
