/**
 * HTML EXTRACTOR
 * ─────────────────────────────────────────────────────────────
 * Extrae datos de facturas desde el cuerpo HTML de un email.
 * Útil para facturas enviadas directamente en el cuerpo del mensaje
 * (Amazon, proveedores online, etc.)
 *
 * Limpia el HTML antes de enviarlo a Claude para reducir tokens.
 */

const { getClient } = require('../../../config/anthropic.js')

const PROMPT_EXTRACCION = `El siguiente texto es el contenido de un email.
Analízalo y extrae datos de factura si los contiene.
Si no es una factura o no hay datos suficientes, devuelve null.

Devuelve SOLO un JSON con exactamente esta estructura (null si no aplica):
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

Fechas en YYYY-MM-DD. Importes como números. Confianza 0-100.`

/**
 * Limpia HTML eliminando tags, scripts, estilos y espacios extra.
 * Reduce drásticamente el número de tokens enviados a Claude.
 */
const limpiarHTML = (html) => {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&euro;/g, '€')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .substring(0, 8000) // limitar a 8000 chars para no exceder tokens
}

const extraer = async (htmlContent, emailMeta = {}) => {
  try {
    const texto = limpiarHTML(htmlContent)

    // Si el texto limpio es muy corto, probablemente no tiene datos útiles
    if (texto.length < 50) return null

    const claude = getClient()

    const response = await claude.messages.create({
      model:      'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `${PROMPT_EXTRACCION}\n\nCONTENIDO DEL EMAIL:\n${texto}`,
      }],
    })

    const raw = response.content[0].text.replace(/```json|```/g, '').trim()
    if (raw === 'null') return null

    const data = JSON.parse(raw)
    if (!data || data.confianza < 30) return null // descartar extracciones poco fiables

    return {
      ...data,
      email_id:     emailMeta.id     || null,
      email_asunto: emailMeta.asunto || null,
      email_de:     emailMeta.de     || null,
      email_fecha:  emailMeta.fecha  || null,
      raw_text:     texto.substring(0, 500),
    }
  } catch (err) {
    console.error('[HTML Extractor]', err.message)
    return null
  }
}

module.exports = { extraer }
