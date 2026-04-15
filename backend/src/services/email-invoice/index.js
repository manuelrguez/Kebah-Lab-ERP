/**
 * ============================================================
 * EMAIL INVOICE EXTRACTOR
 * ============================================================
 * Módulo universal para extraer facturas de buzones de correo.
 * Soporta Gmail (OAuth2), Outlook/M365 (OAuth2) e IMAP genérico.
 *
 * USO BÁSICO:
 * ─────────────────────────────────────────────────────────────
 * const extractor = require('./email-invoice')
 *
 * const facturas = await extractor.sync({
 *   provider: 'gmail',          // 'gmail' | 'outlook' | 'imap'
 *   credentials: { ... },       // ver cada provider para detalles
 *   options: {
 *     carpeta: 'INBOX',         // carpeta a revisar
 *     soloNoLeidos: true,       // solo emails no leídos
 *     marcarLeido: true,        // marcar como leído tras procesar
 *     maxEmails: 50,            // límite de emails por sync
 *     filtros: {
 *       asunto: ['factura', 'invoice', 'recibo'],
 *       desde: null,            // filtrar por remitente
 *       desde_fecha: null,      // Date — solo emails desde esta fecha
 *     }
 *   },
 *   onFactura: async (factura, emailMeta) => {
 *     // Callback por cada factura encontrada
 *     // factura: objeto normalizado (ver schema abajo)
 *     // emailMeta: { id, asunto, de, fecha, adjunto }
 *   },
 *   onError: (err, emailMeta) => {
 *     // Callback cuando falla el procesamiento de un email
 *   }
 * })
 *
 * SCHEMA DE FACTURA DEVUELTA:
 * ─────────────────────────────────────────────────────────────
 * {
 *   numero_factura:   string | null,
 *   fecha:            string | null,  // YYYY-MM-DD
 *   fecha_vencimiento:string | null,
 *   proveedor_nombre: string | null,
 *   proveedor_cif:    string | null,
 *   concepto:         string | null,
 *   base_imponible:   number | null,
 *   porcentaje_iva:   number | null,
 *   cuota_iva:        number | null,
 *   total:            number | null,
 *   moneda:           string,         // 'EUR' por defecto
 *   fuente:           string,         // 'pdf' | 'imagen' | 'html'
 *   confianza:        number,         // 0-100 — confianza de extracción IA
 *   email_id:         string,
 *   email_asunto:     string,
 *   email_de:         string,
 *   email_fecha:      string,
 *   adjunto_nombre:   string | null,
 *   raw_text:         string | null,  // texto extraído antes de parsear
 * }
 */

const gmailProvider   = require('./providers/gmail.provider')
const outlookProvider = require('./providers/outlook.provider')
const imapProvider    = require('./providers/imap.provider')
const pdfExtractor    = require('./extractors/pdf.extractor')
const imageExtractor  = require('./extractors/image.extractor')
const htmlExtractor   = require('./extractors/html.extractor')

const PROVIDERS = {
  gmail:   gmailProvider,
  outlook: outlookProvider,
  imap:    imapProvider,
}

const DEFAULT_OPTIONS = {
  carpeta:      'INBOX',
  soloNoLeidos: true,
  marcarLeido:  true,
  maxEmails:    50,
  filtros: {
    asunto:      ['factura', 'invoice', 'recibo', 'albarán', 'receipt'],
    desde:       null,
    desde_fecha: null,
  },
}

/**
 * Procesa un adjunto o cuerpo de email y extrae datos de factura.
 * @param {object} adjunto - { nombre, tipo, datos (Buffer|string) }
 * @param {object} emailMeta
 * @returns {object|null} factura normalizada o null si no se detecta
 */
const procesarAdjunto = async (adjunto, emailMeta) => {
  const tipo = adjunto.tipo?.toLowerCase() || ''
  const nombre = adjunto.nombre?.toLowerCase() || ''

  let resultado = null

  if (tipo.includes('pdf') || nombre.endsWith('.pdf')) {
    resultado = await pdfExtractor.extraer(adjunto.datos, emailMeta)
  } else if (tipo.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/.test(nombre)) {
    resultado = await imageExtractor.extraer(adjunto.datos, tipo, emailMeta)
  } else if (tipo.includes('html') || tipo.includes('text')) {
    resultado = await htmlExtractor.extraer(adjunto.datos, emailMeta)
  }

  return resultado
}

/**
 * Sincroniza el buzón y extrae facturas.
 * @param {object} config
 * @returns {Promise<{procesados: number, facturas: array, errores: array}>}
 */
const sync = async (config = {}) => {
  const { provider: providerName, credentials, options = {}, onFactura, onError } = config

  if (!providerName || !PROVIDERS[providerName]) {
    throw new Error(`Provider "${providerName}" no soportado. Usa: gmail, outlook, imap`)
  }
  if (!credentials) {
    throw new Error('credentials es obligatorio')
  }

  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
    filtros: { ...DEFAULT_OPTIONS.filtros, ...(options.filtros || {}) },
  }

  const provider = PROVIDERS[providerName]
  const resultados = { procesados: 0, facturas: [], errores: [] }

  // Conectar al buzón
  const conexion = await provider.conectar(credentials)

  try {
    // Obtener lista de emails
    const emails = await provider.listarEmails(conexion, opts)
    console.log(`[EmailInvoice] ${emails.length} emails encontrados en ${opts.carpeta}`)

    for (const emailMeta of emails) {
      try {
        resultados.procesados++

        // Obtener adjuntos y cuerpo del email
        const { adjuntos, cuerpoHtml, cuerpoTexto } = await provider.obtenerContenido(conexion, emailMeta.id)

        const facturasEmail = []

        // Procesar adjuntos (PDF, imágenes)
        for (const adjunto of adjuntos) {
          const factura = await procesarAdjunto(adjunto, emailMeta)
          if (factura) {
            factura.fuente        = adjunto.tipo?.includes('pdf') ? 'pdf' : 'imagen'
            factura.adjunto_nombre = adjunto.nombre
            facturasEmail.push(factura)
          }
        }

        // Si no hay adjuntos con factura, intentar extraer del cuerpo HTML
        if (facturasEmail.length === 0 && cuerpoHtml) {
          const factura = await htmlExtractor.extraer(cuerpoHtml, emailMeta)
          if (factura) {
            factura.fuente = 'html'
            facturasEmail.push(factura)
          }
        }

        // Llamar callback por cada factura encontrada
        for (const factura of facturasEmail) {
          resultados.facturas.push(factura)
          if (onFactura) await onFactura(factura, emailMeta)
        }

        // Marcar como leído si está configurado
        if (opts.marcarLeido && facturasEmail.length > 0) {
          await provider.marcarLeido(conexion, emailMeta.id)
        }

      } catch (err) {
        console.error(`[EmailInvoice] Error procesando email ${emailMeta.id}:`, err.message)
        resultados.errores.push({ email: emailMeta, error: err.message })
        if (onError) onError(err, emailMeta)
      }
    }
  } finally {
    await provider.desconectar(conexion)
  }

  console.log(`[EmailInvoice] Sync completado: ${resultados.facturas.length} facturas en ${resultados.procesados} emails`)
  return resultados
}

module.exports = { sync, procesarAdjunto }
